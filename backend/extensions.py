# --- backend/extensions.py ---
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import CORS
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
cors = CORS() # Initialize CORS here too