# backend/api/auth.py
from flask import Blueprint, request, jsonify, current_app, url_for
from backend.models import User
from backend.extensions import db
from sqlalchemy.exc import IntegrityError
from flask_login import login_user, logout_user, login_required, current_user
from marshmallow import ValidationError
from backend.schemas import user_schema, registration_input_schema, login_input_schema
from backend.utils.email import send_admin_approval_request, send_user_approved_notification
from functools import wraps

# Create blueprint instance
auth_bp = Blueprint('auth', __name__)
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
        
        # Check if user is admin (you'll need to add an is_admin field later)
        # For now, we can consider the first user as admin
        if current_user.id != 1:  # Assuming user with ID 1 is admin
            return jsonify({"error": "Admin privileges required"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/register', methods=['POST'])
def register():
    """Handles user registration with input validation and output serialization."""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "No input data provided"}), 400

    try:
        # Validate incoming data using the registration schema
        validated_data = registration_input_schema.load(json_data)
    except ValidationError as err:
        print(f"Validation Error on Registration: {err.messages}")
        return jsonify({"error": "Validation failed", "messages": err.messages}), 400
    except Exception as val_err:
         print(f"Error during validation call: {val_err}")
         return jsonify({'error': 'Data validation process failed'}), 500

    # Use validated data
    username = validated_data.get('username')
    password = validated_data.get('password')
    email = validated_data.get('email')
    firm = validated_data.get('firm')  # New field

    # Check if username or email already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    # Create new user with pending approval
    try:
        new_user = User(
            username=username, 
            email=email,
            firm=firm,
            pending_approval=True  # Set to pending by default
        )
        new_user.set_password(password)
        
        # Generate approval token
        new_user.generate_approval_token()

        db.session.add(new_user)
        db.session.commit()

        print(f"User registered successfully (pending approval): {username}")
        
        # Send approval request to admin
        send_admin_approval_request(new_user)

        # Serialize the new user object
        user_data = user_schema.dump(new_user)
        return jsonify({
            "message": "Registration successful! Your account is pending approval. You'll receive an email when your account is approved.",
            "user": user_data,
            "pending_approval": True
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        print(f"IntegrityError during registration for {username}: {e}")
        return jsonify({"error": "Username or email might already exist (Integrity error)"}), 409
    except Exception as e:
        db.session.rollback()
        print(f"Error during registration for {username}: {e}")
        return jsonify({"error": "An unexpected error occurred during registration"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handles user login with robust error handling for user object requests."""
    json_data = request.get_json()
    print(f"Login request received: {json_data}")
    
    if not json_data:
        return jsonify({"error": "No input data provided"}), 400

    # IMPORTANT NEW CHECK: Detect if we received a user object instead of credentials
    # Look for user object fields that wouldn't be in normal credentials
    if 'id' in json_data and 'pending_approval' in json_data:
        print("Detected second request with user object - returning success")
        # Just return success with the same user data
        return jsonify({
            "message": "Already logged in",
            "user": json_data
        }), 200

    # Extract data directly from request for normal login
    username = json_data.get('username')
    password = json_data.get('password')
    remember = json_data.get('remember', False)
    
    # Basic validation
    if not username:
        return jsonify({"error": "Username is required"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400

    # Find user by username
    user = User.query.filter_by(username=username).first()

    # Validate user exists and password is correct
    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401

    # Check if user account is approved
    if user.pending_approval:
        return jsonify({
            "error": "Account pending approval",
            "message": "Your account is waiting for approval. You'll receive an email when your account is approved."
        }), 403

    # Log the user in
    login_user(user, remember=remember)

    print(f"User logged in successfully: {username}")

    # Serialize the logged-in user
    user_data = user_schema.dump(user)
    return jsonify({
        "message": "Login successful",
        "user": user_data
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Handles user logout."""
    username = current_user.username
    logout_user()
    print(f"User logged out: {username}")
    return jsonify({"message": "Logout successful"}), 200

@auth_bp.route('/status')
@login_required
def status():
    """Returns information about the currently logged-in user."""
    user_data = user_schema.dump(current_user)
    return jsonify({
        "user": user_data
    }), 200

@auth_bp.route('/approve/<token>', methods=['GET'])
def approve_user(token):
    """Approve a user account using a token (no login required)"""
    # Find user by approval token
    user = User.query.filter_by(approval_token=token).first()
    
    if not user:
        return jsonify({"error": "Invalid or expired approval token"}), 404
    
    if not user.pending_approval:
        return jsonify({"message": "User account already approved"}), 200
    
    # Approve user
    user.approve()
    db.session.commit()
    
    # Send approval notification to user
    send_user_approved_notification(user)
    
    return jsonify({
        "message": f"User {user.username} approved successfully.",
        "user": user_schema.dump(user)
    }), 200

@auth_bp.route('/admin/pending-users', methods=['GET'])
@login_required
@admin_required
def get_pending_users():
    """Get all pending users (admin only)"""
    pending_users = User.query.filter_by(pending_approval=True).all()
    return jsonify({
        "pending_users": user_schema.dump(pending_users, many=True),
        "count": len(pending_users)
    }), 200

@auth_bp.route('/admin/approve/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def admin_approve_user(user_id):
    """Approve a user directly (admin only)"""
    user = User.query.get_or_404(user_id)
    
    if not user.pending_approval:
        return jsonify({"message": "User account already approved"}), 200
    
    # Approve user
    user.approve()
    db.session.commit()
    
    # Send approval notification to user
    send_user_approved_notification(user)
    
    return jsonify({
        "message": f"User {user.username} approved successfully.",
        "user": user_schema.dump(user)
    }), 200
