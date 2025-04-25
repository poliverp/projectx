# --- backend/config.py ---
import os
from dotenv import load_dotenv

# Load .env file from the parent directory (or current) where it should be
# Adjust path if your .env is elsewhere relative to this config.py
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env') # Assumes .env is outside backend/
if not os.path.exists(dotenv_path):
  dotenv_path = os.path.join(os.path.dirname(__file__), '.env') # Check if inside backend/

load_dotenv(dotenv_path=dotenv_path)
print(f"--- Loading .env from: {dotenv_path} ---") # For verification


# Use instance folder relative to backend/ directory
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')
os.makedirs(instance_path, exist_ok=True) # Ensure instance folder exists

class Config:
    """Base configuration settings."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a-very-secret-dev-key-please-change')

    # Database Configuration
    default_db_path = os.path.join(instance_path, 'default.db')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{default_db_path}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Upload Folder Configuration
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(instance_path, 'uploads'))
    os.makedirs(UPLOAD_FOLDER, exist_ok=True) # Ensure upload folder exists

    # Frontend URL for CORS
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    AI_API_KEY = os.environ.get("AI_API_KEY")

# You could add DevelopmentConfig(Config), ProductionConfig(Config) etc. later if needed