# backend/__init__.py
import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from .config import Config
from flask_mail import Mail
from datetime import timedelta
from .commands import register_commands
from backend.utils.file_encryption import file_encryptor
from backend.utils.rate_limiter import limiter

# Import extensions from our extensions module
from .extensions import db, migrate, login_manager, cors, ma, csrf  # Add csrf here

mail = Mail()

# Correctly find project root and .env path
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

    app.config.from_object(config_class)
    print(f"--- [INIT] Loaded config from object: {config_class.__name__} ---")
    
    # --- Initialize Flask Extensions ---
    # --- ADDED: Configure Session Cookie for Production/Cross-Site ---
    app.config['SESSION_COOKIE_SECURE'] = True  # Send cookie only over HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True # Prevent client-side JS access
    app.config['SESSION_COOKIE_SAMESITE'] = 'None' # Allow sending with cross-site requests (Required for cross-origin credentialed requests)
    # --- END ADDED ---
    # In backend/__init__.py
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=2)
    app.config['SESSION_REFRESH_EACH_REQUEST'] = True
    # --- Security Headers ---
    @app.after_request
    def add_security_headers(response):
        # Prevent browsers from detecting content type other than declared in Content-Type header
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Prevent clickjacking by restricting a page from being framed
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        
        # Enable browser XSS filters
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Use HTTPS only
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Content Security Policy - adjust based on your frontend needs
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;"
        
        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response
    
    mail.init_app(app)
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config['FRONTEND_URL']}}, supports_credentials=True)
    ma.init_app(app)
    csrf.init_app(app)
    file_encryptor.init_app(app)
    limiter.init_app(app)

    # Initialize field encryptor (moved into create_app function)
    from backend.utils.encryption import field_encryptor
    field_encryptor.init_app(app)

    @app.errorhandler(429)
    def ratelimit_handler(e):
        from backend.utils.rate_limiter import on_rate_limit_exceeded
        return on_rate_limit_exceeded(e)
    
    # Configure Flask-Login unauthorized handler for APIs
    @login_manager.unauthorized_handler
    def unauthorized():
        # Return 401 Unauthorized for API requests instead of redirecting
        if request.blueprint and request.blueprint.startswith('api'):
             return jsonify(error="Login required"), 401
        # Fallback for non-API? Maybe redirect or just 401
        return jsonify(error="Login required"), 401

    # Configure Flask-Login login view
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'

    # --- User Loader for Flask-Login ---
    @login_manager.user_loader
    def load_user(user_id):
        # Import User model here to avoid circular imports
        from backend.models import User
        return User.query.get(int(user_id))
    
    register_commands(app)

    # --- Register Blueprints ---
    try:
        # Assumes 'bp' is defined in backend/api/__init__.py and covers cases etc.
        from .api import bp as api_blueprint
        # Assumes 'discovery_bp' is defined in backend/api/discovery.py
        from .api.discovery import discovery_bp
        # Assumes 'auth_bp' is defined in backend/api/auth.py
        from .api.auth import auth_bp

        # Register the blueprints
        app.register_blueprint(api_blueprint, url_prefix='/api')
        app.register_blueprint(discovery_bp, url_prefix='/api/discovery')
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        
        # Exempt API routes from CSRF
        csrf.exempt(api_blueprint)
        csrf.exempt(discovery_bp)
        csrf.exempt(auth_bp)

        print("--- Blueprints Registered Successfully ---")

    except ImportError as e:
        print(f"--- Error importing or registering Blueprints: {e} ---")

    # --- Return App Instance ---
    return app