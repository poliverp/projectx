# backend/__init__.py
import os
from flask import Flask, request, jsonify # Ensure all needed flask components are imported
from dotenv import load_dotenv

# Import extensions from our extensions module
# Ensure backend/extensions.py exists and defines these instances
from .extensions import db, migrate, login_manager, cors
# Import models (needed for user_loader)
# Ensure models are defined in backend/models.py
from .models import User

# Correctly find project root and .env path
# __file__ is backend/__init__.py, dirname is backend/, parent is project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv_path = os.path.join(project_root, '.env')

# Load environment variables from .env file if it exists (for local dev)
if os.path.exists(dotenv_path):
    print(f"--- Loading .env from: {dotenv_path} ---")
    load_dotenv(dotenv_path=dotenv_path)
else:
     print(f"--- .env file not found at: {dotenv_path} (This is expected on Render) ---")


def create_app(config_class_name=None): # config_class_name is optional now
    """Application Factory Function"""
    app = Flask(__name__, instance_relative_config=False)

    # --- Configuration Loading ---
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'a-very-insecure-default-key-please-change'

    # --- MODIFIED: Load DATABASE_URL Correctly (NO SQLITE FALLBACK + DIAGNOSTICS) ---
    db_url = os.environ.get('DATABASE_URL')
    # Print what is read from the environment immediately
    print(f"--- [INIT] Read DATABASE_URL from environment: {'SET (partially hidden)' if db_url else 'NOT SET'}")
    if not db_url:
        # App will crash hard on startup if DATABASE_URL isn't found in Render Env Vars
        raise ValueError("FATAL ERROR: DATABASE_URL environment variable is not set or not readable by the application!")
    # Assign the read URL to Flask config
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # Print the final value set in Flask config
    print(f"--- [INIT] Flask app.config['SQLALCHEMY_DATABASE_URI'] set to: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not Set')[:app.config.get('SQLALCHEMY_DATABASE_URI', '').find('@') if '@' in app.config.get('SQLALCHEMY_DATABASE_URI', '') else 30]}@********")
    # --- END MODIFICATION ---

    # AI API Key: Use AI_API_KEY env var name
    app.config['AI_API_KEY'] = os.environ.get('AI_API_KEY')
    app.config['GOOGLE_API_KEY'] = app.config['AI_API_KEY'] # Example if needed by lib

    # Frontend URL for CORS: Use FRONTEND_URL env var name
    app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', '*') # Default to * ONLY if not set
    print(f"--- [INIT] Allowed CORS Origin: {app.config['FRONTEND_URL']}")


    # --- Initialize Flask Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config['FRONTEND_URL']}}, supports_credentials=True)

    # Configure Flask-Login unauthorized handler for APIs
    @login_manager.unauthorized_handler
    def unauthorized():
        # Return 401 Unauthorized for API requests instead of redirecting
        if request.blueprint and request.blueprint.startswith('api'):
             return jsonify(error="Login required"), 401
        # Fallback for non-API? Maybe redirect or just 401
        return jsonify(error="Login required"), 401

    # Configure Flask-Login login view
    login_manager.login_view = 'auth.login' # Assumes 'auth' blueprint and 'login' view function
    login_manager.login_message_category = 'info'


    # --- User Loader for Flask-Login ---
    @login_manager.user_loader
    def load_user(user_id):
        # Important: Ensure User model is imported correctly at the top
        return User.query.get(int(user_id))


    # --- Register Blueprints ---
    try:
        # Assumes 'bp' is defined in backend/api/__init__.py and covers cases etc.
        from .api import bp as api_blueprint
        # Assumes 'discovery_bp' is defined in backend/api/discovery.py
        from .api.discovery import discovery_bp
        # Assumes 'auth_bp' is defined in backend/api/auth.py
        from .api.auth import auth_bp

        # Register the blueprints using the correct variables and prefixes
        app.register_blueprint(api_blueprint, url_prefix='/api') # Main routes under /api/* (likely includes cases)
        app.register_blueprint(discovery_bp, url_prefix='/api/discovery') # Discovery routes under /api/discovery/*
        app.register_blueprint(auth_bp, url_prefix='/api/auth') # Auth routes under /api/auth/*

        print("--- Blueprints Registered Successfully ---")
        # print(app.url_map) # Uncomment to debug routes if needed

    except ImportError as e:
        print(f"--- Error importing or registering Blueprints: {e} ---")
        # Handle blueprint import errors appropriately


    # --- Return App Instance ---
    return app