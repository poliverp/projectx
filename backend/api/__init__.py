# --- backend/api/__init__.py ---
from flask import Blueprint

# Create a Blueprint object.
# 'api' is the name of the blueprint.
# __name__ helps locate the blueprint's resources.
# url_prefix='/api' means all routes defined in this blueprint
# will be automatically prefixed with '/api'.
bp = Blueprint('api', __name__, url_prefix='/api')

# Import modules containing routes at the bottom to avoid circular dependencies
# We will add routes from cases.py and documents.py here later
from . import cases
from . import documents
from . import generation # <-- ADD THIS LINE

