# backend/api/auth.py
from flask import Blueprint, request, jsonify, current_app, url_for
from backend.models import User
from backend.extensions import db
from sqlalchemy.exc import IntegrityError
from flask_login import login_user, logout_user, login_required, current_user
from marshmallow import ValidationError
from backend.schemas import user_schema, registration_input_schema, login_input_schema, password_change_schema
from backend.utils.email import send_admin_approval_request, send_user_approved_notification
from functools import wraps
from datetime import datetime, timedelta
import logging
from backend.utils.rate_limiter import limiter

# Setup security logger
security_logger = logging.getLogger('security')
if not security_logger.handlers:
    handler = logging.FileHandler('security.log')
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    security_logger.setLevel(logging.INFO)
    security_logger.addHandler(handler)

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
            security_logger.warning(f"User {current_user.id} attempted to access admin route without privileges")
            return jsonify({"error": "Admin privileges required"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("3 per minute, 10 per hour")  # Add this line
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
        security_logger.info(f"Registration attempt with existing username: {username}")
        return jsonify({"error": "Username already exists"}), 409
    if email and User.query.filter_by(email=email).first():
        security_logger.info(f"Registration attempt with existing email: {email}")
        return jsonify({"error": "Email already exists"}), 409

    # Create new user with pending approval
    try:
        new_user = User(
            username=username, 
            email=email,
            firm=firm,
            pending_approval=True,  # Set to pending by default
            failed_login_attempts=0,
            last_login_ip=request.remote_addr,  # Record registration IP
        )
        new_user.set_password(password)
        
        # Generate approval token
        new_user.generate_approval_token()

        db.session.add(new_user)
        db.session.commit()

        security_logger.info(f"User registered successfully (pending approval): {username} from IP {request.remote_addr}")
        
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
        security_logger.warning(f"IntegrityError during registration for {username}: {e}")
        return jsonify({"error": "Username or email might already exist (Integrity error)"}), 409
    except Exception as e:
        db.session.rollback()
        security_logger.error(f"Error during registration for {username}: {e}")
        return jsonify({"error": "An unexpected error occurred during registration"}), 500

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute, 20 per hour")  # Add this line
def login():
    """Handles user login with robust error handling and security controls."""
    json_data = request.get_json()
    client_ip = request.remote_addr
    
    if not json_data:
        return jsonify({"error": "No input data provided"}), 400

    # IMPORTANT NEW CHECK: Detect if we received a user object instead of credentials
    if 'id' in json_data and 'pending_approval' in json_data:
        security_logger.info("Detected second request with user object - returning success")
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

    # If user not found, return generic error
    if user is None:
        security_logger.info(f"Login attempt with non-existent username: {username} from IP {client_ip}")
        return jsonify({"error": "Invalid username or password"}), 401
        
    # Check if account is locked
    if hasattr(user, 'locked_until') and user.locked_until:
        if user.locked_until > datetime.utcnow():
            lock_expiry = user.locked_until.strftime("%Y-%m-%d %H:%M:%S")
            security_logger.warning(f"Login attempt to locked account: {username} from IP {client_ip}")
            return jsonify({
                "error": "Account locked",
                "message": f"Your account is temporarily locked due to multiple failed login attempts. Please try again after {lock_expiry}."
            }), 403
        else:
            # Lock expired, reset the lock
            user.locked_until = None
            db.session.commit()
        
    # Validate password is correct
    if not user.check_password(password):
        # Increment failed attempts counter
        if hasattr(user, 'failed_login_attempts'):
            user.failed_login_attempts = user.failed_login_attempts + 1 if user.failed_login_attempts else 1
            
            # Lock account if too many failed attempts
            if user.failed_login_attempts >= 10:
                user.locked_until = datetime.utcnow() + timedelta(hours=24)
                security_logger.warning(f"Account {username} locked for 24 hours after 10 failed attempts. IP: {client_ip}")
            elif user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                security_logger.warning(f"Account {username} locked for 15 minutes after 5 failed attempts. IP: {client_ip}")
                
            db.session.commit()
            
        security_logger.warning(f"Failed login attempt for user {username} from IP {client_ip}")
        return jsonify({"error": "Invalid username or password"}), 401

    # Check if user account is approved
    if user.pending_approval:
        security_logger.info(f"Login attempt to unapproved account: {username} from IP {client_ip}")
        return jsonify({
            "error": "Account pending approval",
            "message": "Your account is waiting for approval. You'll receive an email when your account is approved."
        }), 403

    # All checks passed - log the user in
    login_user(user, remember=remember)
    
    # Reset security tracking
    if hasattr(user, 'failed_login_attempts'):
        user.failed_login_attempts = 0
    if hasattr(user, 'locked_until'):
        user.locked_until = None
    if hasattr(user, 'last_login_at'):
        user.last_login_at = datetime.utcnow()
    if hasattr(user, 'last_login_ip'):
        user.last_login_ip = client_ip
        
    db.session.commit()

    security_logger.info(f"User {username} logged in successfully from IP {client_ip}")

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
    client_ip = request.remote_addr
    logout_user()
    security_logger.info(f"User {username} logged out from IP {client_ip}")
    return jsonify({"message": "Logout successful"}), 200

@auth_bp.route('/change-password', methods=['POST'])
@login_required
@limiter.limit("5 per minute, 10 per hour")  # Add this line
def change_password():
    """Handle password change with validation"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "No input data provided"}), 400
        
    try:
        # Validate incoming data
        validated_data = password_change_schema.load(json_data)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "messages": err.messages}), 400
        
    current_password = validated_data.get('current_password')
    new_password = validated_data.get('new_password')
    
    # Verify current password
    if not current_user.check_password(current_password):
        security_logger.warning(f"Failed password change attempt (wrong current password) for user {current_user.username}")
        return jsonify({"error": "Current password is incorrect"}), 401
        
    # Check if new password is same as old
    if current_password == new_password:
        return jsonify({"error": "New password must be different from current password"}), 400
        
    # Update password
    current_user.set_password(new_password)
    if hasattr(current_user, 'password_changed_at'):
        current_user.password_changed_at = datetime.utcnow()
    db.session.commit()
    
    security_logger.info(f"Password changed successfully for user {current_user.username}")
    return jsonify({"message": "Password changed successfully"}), 200

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
        security_logger.warning(f"Invalid approval token attempt: {token}")
        return jsonify({"error": "Invalid or expired approval token"}), 404
    
    if not user.pending_approval:
        return jsonify({"message": "User account already approved"}), 200
    
    # Approve user
    user.approve()
    db.session.commit()
    
    # Send approval notification to user
    send_user_approved_notification(user)
    
    security_logger.info(f"User {user.username} approved via token")
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
    security_logger.info(f"Admin {current_user.username} retrieved list of {len(pending_users)} pending users")
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
    
    security_logger.info(f"Admin {current_user.username} approved user {user.username}")
    return jsonify({
        "message": f"User {user.username} approved successfully.",
        "user": user_schema.dump(user)
    }), 200