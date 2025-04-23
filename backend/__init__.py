# backend/__init__.py
import os
from flask import Flask
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

# Load environment variables from .env file if it exists
if os.path.exists(dotenv_path):
    print(f"--- Loading .env from: {dotenv_path} ---")
    load_dotenv(dotenv_path=dotenv_path)
else:
     print(f"--- .env file not found at: {dotenv_path} ---")


def create_app(config_class_name=None): # config_class_name is optional now
    """Application Factory Function"""
    app = Flask(__name__, instance_relative_config=False)

    # --- Corrected Configuration Loading ---
    # Priority: Environment variables > .env file > Default values
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'a-very-insecure-default-key-please-change' # Use env var NAME

    # Database URL: Use DATABASE_URL env var name
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        # Use a default SQLite path ONLY if DATABASE_URL is absolutely not set
        # This fallback should ideally not be hit in production on Render
        print("WARNING: DATABASE_URL not found in environment. Falling back to local SQLite.")
        default_db_path = os.path.join(project_root, 'instance', 'dev.db')
        db_url = f'sqlite:///{default_db_path}'
        # Ensure instance folder exists for SQLite if used
        try:
            os.makedirs(os.path.dirname(default_db_path), exist_ok=True)
        except OSError as e:
             print(f"Error creating instance folder for SQLite: {e}")
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # AI API Key: Use AI_API_KEY env var name
    app.config['AI_API_KEY'] = os.environ.get('AI_API_KEY')
    # Store the key under a consistent Flask config key if needed by library
    app.config['GOOGLE_API_KEY'] = app.config['AI_API_KEY'] # Example

    # Frontend URL for CORS: Use FRONTEND_URL env var name
    # Allow all origins (*) in development if FRONTEND_URL not set
    app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', '*')


    # --- Initialize Flask Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config['FRONTEND_URL']}}, supports_credentials=True)

    # --- Configure Flask-Login ---
    # Tell Flask-Login where the login route is located.
    # Format is 'blueprint_name.view_function_name'
    login_manager.login_view = 'auth.login' # Assumes 'auth' blueprint and 'login' view function
    login_manager.login_message_category = 'info' # Optional: category for flash messages


    # --- User Loader for Flask-Login ---
    @login_manager.user_loader
    def load_user(user_id):
        # Reloads the user object from the user ID stored in the session
        # Important: Ensure User model is imported correctly at the top
        return User.query.get(int(user_id))


    # --- Register Blueprints ---
    # Use relative imports to find blueprints within the package
    try:
        # Assumes 'bp' is defined in backend/api/__init__.py and covers cases etc.
        from .api import bp as api_blueprint
        # Assumes 'discovery_bp' is defined in backend/api/discovery.py
        from .api.discovery import discovery_bp
        # Assumes 'auth_bp' is defined in backend/api/auth.py
        from .api.auth import auth_bp

        # Register the blueprints using the correct variables and prefixes
        app.register_blueprint(api_blueprint, url_prefix='/api') # Main routes under /api/*
        app.register_blueprint(discovery_bp, url_prefix='/api/discovery') # Discovery routes under /api/discovery/*
        app.register_blueprint(auth_bp, url_prefix='/api/auth') # Auth routes under /api/auth/*

        print("--- Blueprints Registered Successfully ---")
        # print(app.url_map) # Uncomment to debug routes if needed

    except ImportError as e:
        print(f"--- Error importing or registering Blueprints: {e} ---")
        # Handle blueprint import errors appropriately


    # --- Return App Instance ---
    return app