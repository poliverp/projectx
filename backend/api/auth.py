# backend/api/auth.py
from flask import Blueprint, request, jsonify
from backend.models import User # Import User model
from backend.extensions import db # Import db instance
from sqlalchemy.exc import IntegrityError # To catch potential unique constraint errors

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

# --- Add Login, Logout routes below later ---