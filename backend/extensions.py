# --- backend/extensions.py ---
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager
from flask_marshmallow import Marshmallow # <<< Import Marshmallow
from flask_mail import Mail

# Create mail extension instance
mail = Mail()

db = SQLAlchemy()
migrate = Migrate()
cors = CORS() # Initialize CORS here too
login_manager = LoginManager()
ma = Marshmallow() # <<< Create Marshmallow instance

# You might have initialization functions here later if needed,
# but basic instantiation is often enough.
# def init_extensions(app):

#     db.init_app(app)
#     migrate.init_app(app, db)
#     login_manager.init_app(app)
#     cors.init_app(app, ...)
#     ma.init_app(app)
