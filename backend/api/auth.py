# backend/api/auth.py
from flask import Blueprint, request, jsonify
from backend.models import User # Import User model
from backend.extensions import db # Import db instance
from sqlalchemy.exc import IntegrityError # To catch potential unique constraint errors
from flask_login import login_user, logout_user, login_required, current_user
from marshmallow import ValidationError # <<< Import ValidationError

# ---### START CHANGE: Imports ###---
# Import the necessary schemas
from backend.schemas import user_schema, registration_input_schema, login_input_schema
# ---### END CHANGE ###---

# Create blueprint instance
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Handles user registration with input validation and output serialization."""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "No input data provided"}), 400

    # ---### START CHANGE: Input Validation ###---
    try:
        # Validate incoming data using the registration schema
        # load() validates and returns the validated dictionary
        validated_data = registration_input_schema.load(json_data)
    except ValidationError as err:
        print(f"Validation Error on Registration: {err.messages}")
        return jsonify({"error": "Validation failed", "messages": err.messages}), 400
    except Exception as val_err:
         print(f"Error during validation call: {val_err}")
         return jsonify({'error': 'Data validation process failed'}), 500
    # ---### END CHANGE ###---

    # Use validated data
    username = validated_data.get('username')
    password = validated_data.get('password')
    email = validated_data.get('email')

    # --- Check if username or email already exists ---
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409 # 409 Conflict
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    # --- Create new user ---
    try:
        # Use validated data to create the user
        new_user = User(username=username, email=email)
        new_user.set_password(password) # Hashes the password

        db.session.add(new_user)
        db.session.commit()

        print(f"User registered successfully: {username}")

        # ---### START CHANGE: Output Serialization ###---
        # Serialize the new user object using the UserSchema (excludes password hash)
        user_data = user_schema.dump(new_user)
        return jsonify({
            "message": "User registered successfully",
            "user": user_data # Embed serialized user data
        }), 201 # 201 Created
        # ---### END CHANGE ###---

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
    """Handles user login with input validation and output serialization."""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "No input data provided"}), 400

    # ---### START CHANGE: Input Validation ###---
    try:
        # Validate incoming data using the login schema
        validated_data = login_input_schema.load(json_data)
    except ValidationError as err:
        print(f"Validation Error on Login: {err.messages}")
        return jsonify({"error": "Validation failed", "messages": err.messages}), 400
    except Exception as val_err:
         print(f"Error during validation call: {val_err}")
         return jsonify({'error': 'Data validation process failed'}), 500
    # ---### END CHANGE ###---

    # Use validated data
    username = validated_data.get('username')
    password = validated_data.get('password')
    remember = validated_data.get('remember', False) # Get optional remember field

    # Find user by username
    user = User.query.filter_by(username=username).first()

    # Validate user exists and password is correct
    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401 # 401 Unauthorized

    # Log the user in using Flask-Login's function
    login_user(user, remember=remember)

    print(f"User logged in successfully: {username}")

    # ---### START CHANGE: Output Serialization ###---
    # Serialize the logged-in user object using UserSchema
    user_data = user_schema.dump(user)
    return jsonify({
        "message": "Login successful",
        "user": user_data # Embed serialized user data
    }), 200
    # ---### END CHANGE ###---

@auth_bp.route('/logout', methods=['POST'])
@login_required # Ensure user must be logged in to log out
def logout():
    """Handles user logout."""
    # No input validation or output serialization needed here
    username = current_user.username # Get username before logout for logging
    logout_user() # Clears the user session cookie
    print(f"User logged out: {username}")
    return jsonify({"message": "Logout successful"}), 200

@auth_bp.route('/status')
@login_required # Requires user to be logged in
def status():
    """Returns information about the currently logged-in user."""
    # No input validation needed

    # ---### START CHANGE: Output Serialization ###---
    # Serialize the current_user object using UserSchema
    user_data = user_schema.dump(current_user)
    return jsonify({
        "user": user_data # Embed serialized user data
        # You could add other status info here if needed
    }), 200
    # ---### END CHANGE ###---

