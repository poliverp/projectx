# --- backend/app.py ---

import os
from flask import Flask, request, jsonify
from .config import Config # Import the Config class
from .extensions import db, migrate, cors # Import extension instances
from .api import bp as api_blueprint



# --- App Initialization & Configuration ---
app = Flask(__name__)
app.config.from_object(Config) # Load config from the object

db.init_app(app)
migrate.init_app(app, db)

# --- CORS Setup using extension ---
# Adjust resources/origins if needed, reading from app.config now
cors.init_app(app, resources={r"/api/*": {
    "origins": app.config['FRONTEND_URL'], # Use value from Config
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "x-api-key"] # Make sure x-api-key is still needed/correct
}})
print(f"--- CORS configured for origin: {app.config['FRONTEND_URL']} ---")
app.register_blueprint(api_blueprint)


# --- API Routes ---

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "OK"}), 200

@app.route('/debug-url-map')
def debug_url_map():
    # Convert the URL map to a string for display
    return str(app.url_map), 200, {'Content-Type': 'text/plain'}

# Minimal Test Route
@app.route('/api/testoptions', methods=['GET', 'OPTIONS'])
def test_options_route():
    print("--- Handling /api/testoptions ---")
    if request.method == 'OPTIONS':
        print("--- Handling OPTIONS /api/testoptions (explicitly) ---")
        return jsonify({"message": "OPTIONS handled explicitly"}), 200
    elif request.method == 'GET':
        return jsonify({"message": "GET request successful"}), 200


# --- Main Execution ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000)) # Default to 5001, adjust if needed
    print(f"--- Starting Flask server on http://0.0.0.0:{port} ---")
    # Set debug=False for production
    app.run(host='0.0.0.0', port=port, debug=True)