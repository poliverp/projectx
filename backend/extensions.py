# --- backend/extensions.py ---
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
cors = CORS() # Initialize CORS here too
login_manager = LoginManager()