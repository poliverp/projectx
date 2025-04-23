# backend/app.py
from backend import create_app # Import the factory from the package __init__

# Create an application instance for development server or other uses
app = create_app()

if __name__ == '__main__':
    # This block is mainly for running flask run locally
    # or executing directly: python backend/app.py
    # Gunicorn uses the factory directly via the entry point specified.
    print("Running Flask development server...")
    app.run(debug=True) # Use debug=True only for local development