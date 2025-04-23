# backend/__init__.py
import os
from flask import Flask
from dotenv import load_dotenv
from .config import Config

# Import extensions from our extensions module
from .extensions import db, migrate, login_manager, cors
# Import models (needed for user_loader)
from .models import User

# Load environment variables from .env file located one level up
# Adjust the path if your .env is elsewhere relative to the backend folder
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(dotenv_path):
    print(f"--- Loading .env from: {dotenv_path} ---")
    load_dotenv(dotenv_path=dotenv_path)
else:
     print(f"--- .env file not found at: {dotenv_path} ---")


def create_app(config_class_name='backend.config.Config'):
    """Application Factory Function"""
    app = Flask(__name__)

    # Load configuration
    # Use environment variables or a config file
    # Example using environment variables (adjust as needed)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'you-should-really-change-this'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('postgresql://neondb_owner:npg_ChNxdMJPW90B@ep-long-bird-a4bbp5mp-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require') or \
        'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'app.db') # Default to SQLite if no URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # Add other config like AI_API_KEY etc.
    app.config['AI_API_KEY'] = os.environ.get('AIzaSyDeW2v8jkWWTdoooWEwmZJLTm-WTjAq8PQ')


    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    # Example CORS setup - adjust origins as needed from env var
    frontend_url = os.environ.get('https://projectx-1-crpr.onrender.com', '*')
    cors.init_app(app, resources={r"/api/*": {"origins": frontend_url}}, supports_credentials=True)


    # --- User Loader for Flask-Login ---
    @login_manager.user_loader
    def load_user(user_id):
        # Reloads the user object from the user ID stored in the session
        return User.query.get(int(user_id))
    try:
            # Assumes 'bp' is defined in backend/api/__init__.py and covers cases etc.
            from .api import bp as api_blueprint
            # Assumes 'discovery_bp' is defined in backend/api/discovery.py
            from .api.discovery import discovery_bp

            # Register the blueprints using the correct variables
            app.register_blueprint(api_blueprint, url_prefix='/api') # Register the main api blueprint
            app.register_blueprint(discovery_bp, url_prefix='/api/discovery')

            print("--- Blueprints Registered Successfully ---")
            # print(app.url_map) # Uncomment to debug routes

    except ImportError as e:
        print(f"--- Error importing or registering Blueprints: {e} ---")
        # Handle blueprint import errors appropriately


    # --- Return App Instance ---
    return app
