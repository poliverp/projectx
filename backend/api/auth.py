# backend/api/auth.py
from flask import Blueprint, request, jsonify
from backend.models import User # Import User model
from backend.extensions import db # Import db instance
from sqlalchemy.exc import IntegrityError # To catch potential unique constraint errors
from flask_login import login_user, logout_user, login_required, current_user
# Create blueprint instance
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Handles user registration."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    username = data.get('username')
    password = data.get('password')
    email = data.get('email') # Optional email

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    # --- Check if username or email already exists ---
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409 # 409 Conflict
    if email and User.query.filter_by(email=email).first():
         # Only check email if provided and it exists
         return jsonify({"error": "Email already exists"}), 409

    # --- Create new user ---
    try:
        new_user = User(username=username, email=email)
        new_user.set_password(password) # Hashes the password

        db.session.add(new_user)
        db.session.commit()

        print(f"User registered successfully: {username}")
        # Return limited user info on success (don't return hash!)
        return jsonify({
            "message": "User registered successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email
            }
        }), 201 # 201 Created

    except IntegrityError as e:
        # Catch potential race conditions for unique constraints if check somehow missed
        db.session.rollback()
        print(f"IntegrityError during registration for {username}: {e}")
        # Determine if it was username or email based on error details if possible/needed
        return jsonify({"error": "Username or email might already exist (Integrity error)"}), 409
    except Exception as e:
        db.session.rollback()
        print(f"Error during registration for {username}: {e}")
        return jsonify({"error": "An unexpected error occurred during registration"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handles user login."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    username = data.get('username')
    password = data.get('password')
    remember = data.get('remember', False) # Optional "Remember Me" functionality

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    # Find user by username
    user = User.query.filter_by(username=username).first()

    # Validate user exists and password is correct
    if user is None or not user.check_password(password):
        # Generic error to avoid revealing if username exists or not
        return jsonify({"error": "Invalid username or password"}), 401 # 401 Unauthorized

    # Log the user in using Flask-Login's function
    # This manages the session cookie
    login_user(user, remember=remember)

    print(f"User logged in successfully: {username}")
    # Return user info (excluding hash) on successful login
    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
            # Add any other non-sensitive fields needed by frontend
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@login_required # Ensure user must be logged in to log out
def logout():
    """Handles user logout."""
    username = current_user.username # Get username before logout for logging
    logout_user() # Clears the user session cookie
    print(f"User logged out: {username}")
    return jsonify({"message": "Logout successful"}), 200

@auth_bp.route('/status')
@login_required # Requires user to be logged in
def status():
    """Returns information about the currently logged-in user."""
    # current_user is populated by Flask-Login's user_loader
    return jsonify({
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
            # Add other non-sensitive fields
        }
     }), 200


# --- Add Login, Logout routes below later ---