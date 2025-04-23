# --- backend/app.py ---

import os
from flask import Flask, request, jsonify

# --- Use absolute imports assuming 'backend' is a package recognizable from project root ---
# If these imports cause issues, change back to relative (e.g., from .config)
# but you MUST run flask using `flask --app backend run` from the parent directory.
from .config import Config
from backend.extensions import db, migrate, cors
from backend.api import bp as api_blueprint
from backend.api.discovery import discovery_bp
#cheese
# --- Application Factory Function ---
def create_app(config_class=Config):
    """Creates and configures the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class) # Load config from the object

    # --- Initialize Flask Extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {
        # Use .get() for safety, provide a default like '*' or your local dev URL if needed
        "origins": app.config.get('FRONTEND_URL', '*'),
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "x-api-key"], # Add any other headers your frontend sends
        "expose_headers": ["Content-Disposition"] # Needed for filename download in frontend JS
    }})
    # Diagnostic print statements (will show in logs during startup)
    print(f"--- CORS configured for origin(s): {app.config.get('FRONTEND_URL', '<< NOT SET >>')}")
    print(f"--- CORS Check: Configured origins type: {type(app.config.get('FRONTEND_URL'))}, value: '{app.config.get('FRONTEND_URL')}' ---")


    # --- Register Blueprints ---
    # If your blueprint needs a prefix like '/api', it should be defined
    # when creating the Blueprint instance (e.g., Blueprint('api', __name__, url_prefix='/api'))
    # or added here: app.register_blueprint(api_blueprint, url_prefix='/api')
    app.register_blueprint(api_blueprint)

    app.register_blueprint(discovery_bp)
    # --- Define Routes specific to this main app file (if any) ---
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Simple health check endpoint."""
        return jsonify({"status": "OK"}), 200

    @app.route('/debug-url-map')
    def debug_url_map():
        """Shows the application's URL map for debugging."""
        # In production, you might want to disable or protect this endpoint
        if app.debug: # Only show in debug mode
             return str(app.url_map), 200, {'Content-Type': 'text/plain'}
        else:
             return "URL map is disabled in production.", 404


    # Minimal Test Route (Removed explicit OPTIONS handling)
    @app.route('/api/testoptions', methods=['GET']) # Only define GET, CORS extension handles OPTIONS
    def test_options_route():
        """Test route to see if GET works with CORS."""
        print("--- Handling GET /api/testoptions ---")
        return jsonify({"message": "GET request successful"}), 200


    # --- Return the configured app instance ---
    return app


# --- Main Execution Block ---
# This block allows running the app directly using `python backend/app.py`.
# However, using `flask run` (with FLASK_APP=backend:create_app() set)
# or a WSGI server like Gunicorn (e.g., gunicorn "backend:create_app()") is the standard way.
if __name__ == '__main__':
    # Create the app instance using the factory
    app = create_app()
    # Use PORT environment variable provided by Render/hosting, default to 5001 for local dev
    # Changed default from 5000 to 5001 to reduce potential local conflicts
    port = int(os.environ.get('PORT', 5001))
    print(f"--- Starting Flask server DIRECTLY (using __main__) on http://0.0.0.0:{port} ---")
    # Determine debug mode from environment variables (common practice)
    is_debug = os.environ.get('FLASK_DEBUG', '0') == '1' or os.environ.get('FLASK_ENV') == 'development'
    # Turn off debug mode in production environments for security and performance
    app.run(host='0.0.0.0', port=port, debug=is_debug)