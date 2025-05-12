# backend/app.py
# This file imports and re-exports the create_app function
# from backend/__init__.py for compatibility with Gunicorn

# Import the factory function from the package __init__
from backend import create_app

# No need to redefine the function - just re-export it

# For local development when executing directly: python backend/app.py
if __name__ == '__main__':
    # Create an application instance for development server
    app = create_app()
    print("Running Flask development server...")
    app.run(debug=True, host="localhost", port=5050)