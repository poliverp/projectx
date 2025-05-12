# wsgi.py - Place this at the project root (same level as backend/)
"""
WSGI entry point for Gunicorn and other WSGI servers
"""

from backend import create_app

# Create application instance for WSGI servers
application = create_app()

# For compatibility with Gunicorn
app = application