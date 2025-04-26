# backend/__init__.py
import os
from flask import Flask, request, jsonify # Ensure all needed flask components are imported
from dotenv import load_dotenv
from .config import Config # <<< ADD THIS IMPORT

# Import extensions from our extensions module
# Ensure backend/extensions.py exists and defines these instances
from .extensions import db, migrate, login_manager, cors, ma
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


def create_app(config_class=Config):
    """Application Factory Function"""
    app = Flask(__name__, instance_relative_config=False)

    app.config.from_object(config_class) # <<< USE THIS TO LOAD ALL CONFIG
    print(f"--- [INIT] Loaded config from object: {config_class.__name__} ---")
    # --- Initialize Flask Extensions ---
    # --- ADDED: Configure Session Cookie for Production/Cross-Site ---
    app.config['SESSION_COOKIE_SECURE'] = True  # Send cookie only over HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True # Prevent client-side JS access
    app.config['SESSION_COOKIE_SAMESITE'] = 'None' # Allow sending with cross-site requests (Required for cross-origin credentialed requests)
    # --- END ADDED ---
    
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config['FRONTEND_URL']}}, supports_credentials=True)
    ma.init_app(app) # <<< Initialize Marshmallow with the app

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