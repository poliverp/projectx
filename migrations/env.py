import logging
import os # Import os to access environment variables
import sqlalchemy as sa
from logging.config import fileConfig

# Import current_app carefully, it might not always be available
# depending on how env.py is invoked, but Flask-Migrate usually handles this
# via the FLASK_APP context setup.
from flask import current_app

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None: # Avoid error if no ini file used
    fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')

# --- Modified Section: Get DB URL Explicitly ---

# Prioritize DATABASE_URL from environment for migrations
sqlalchemy_url = os.environ.get('DATABASE_URL')

if not sqlalchemy_url:
    # Fallback: Try to get from Flask app config if env var not set
    logger.warning("DATABASE_URL environment variable not set for Alembic. "
                   "Attempting to load from Flask app config via FLASK_APP.")
    try:
        # Function to get engine URL (slightly modified to handle potential errors)
        def get_engine():
            engine = None
            try:
                # works with Flask-SQLAlchemy<3 and Alchemical
                engine = current_app.extensions['migrate'].db.get_engine()
            except (TypeError, AttributeError, RuntimeError): # Added RuntimeError for potential context issues
                # works with Flask-SQLAlchemy>=3
                try:
                    engine = current_app.extensions['migrate'].db.engine
                except (AttributeError, RuntimeError) as e:
                     logger.error(f"Could not get engine from current_app: {e}. "
                                  "Ensure FLASK_APP is set correctly and points to your app.")
                     raise
            if engine is None:
                raise RuntimeError("Failed to get engine from Flask app.")
            return engine

        def get_engine_url():
            try:
                # Use render_as_string for full URL representation
                return get_engine().url.render_as_string(hide_password=False).replace('%', '%%')
            except Exception as e:
                 logger.error(f"Error rendering engine URL: {e}")
                 raise

        sqlalchemy_url = get_engine_url()

    except Exception as e:
        logger.error(f"Failed to determine database URL for Alembic: {e}")
        # You might want to raise an error or default to a known safe value if appropriate
        # Raising error is often safer to prevent migrations on wrong DB.
        raise ValueError("Could not determine database URL for Alembic migrations. "
                         "Set DATABASE_URL environment variable or ensure FLASK_APP is correct.")


# Set the URL for Alembic to use
logger.info(f"Alembic using database URL: {sqlalchemy_url.split('@')[0]}@********") # Log URL without password
config.set_main_option('sqlalchemy.url', sqlalchemy_url)

# --- End Modified Section ---


# --- Metadata Section (Relies on Flask App Context) ---
# This part still needs the Flask app context to find the models' metadata

try:
    target_db = current_app.extensions['migrate'].db
except Exception as e:
    logger.error(f"Could not get target_db from current_app: {e}. "
                 "Ensure FLASK_APP=backend is set correctly before running flask db commands.")
    raise

def get_metadata():
    if hasattr(target_db, 'metadatas'):
        return target_db.metadatas[None] # For Flask-SQLAlchemy 3.x with multiple binds
    return target_db.metadata # For Flask-SQLAlchemy 2.x or single bind

target_metadata = get_metadata()

# --- Rest of the script remains largely the same ---

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline():
    """Run migrations in 'offline' mode.
    """
    # Use the sqlalchemy_url determined above
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata, # Use metadata determined above
        literal_binds=True,
        dialect_opts={"paramstyle": "named"}, # Recommended for SQLite offline mode
        render_as_batch=True # Keep batch mode enabled for SQLite compatibility
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.
    """
    # Ensure Flask app context provides necessary configuration for online mode
    conf_args = {}
    if current_app:
         conf_args = current_app.extensions['migrate'].configure_args
         # Ensure render_as_batch=True is set for online mode too if needed (helps with SQLite)
         conf_args.setdefault('render_as_batch', True)

    # Create engine using the explicitly determined URL
    connectable = sa.create_engine(config.get_main_option("sqlalchemy.url"))

    with connectable.connect() as connection:
        # Use metadata determined above
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            **conf_args
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    logger.info("Running migrations in offline mode")
    run_migrations_offline()
else:
    logger.info("Running migrations in online mode")
    run_migrations_online()