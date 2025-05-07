# backend/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager
from flask_marshmallow import Marshmallow
from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect

# Create mail extension instance
mail = Mail()

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
login_manager = LoginManager()
ma = Marshmallow()
csrf = CSRFProtect()

# IMPORTANT: Removed the import of field_encryptor here to avoid circular imports
# The encryptor will be initialized in __init__.py instead