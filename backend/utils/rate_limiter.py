from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

# Configure logging for rate limiter
rate_limit_logger = logging.getLogger('rate_limit')
rate_limit_logger.setLevel(logging.INFO)
if not rate_limit_logger.handlers:
    handler = logging.FileHandler('rate_limit.log')
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    rate_limit_logger.addHandler(handler)

# Custom error handler function
def on_rate_limit_exceeded(request_limit):
    """Log rate limit violations"""
    user_id = "anonymous"
    try:
        from flask_login import current_user
        if current_user.is_authenticated:
            user_id = current_user.id
    except:
        pass
        
    endpoint = request_limit.route if hasattr(request_limit, 'route') else "unknown_endpoint"
    rate_limit_logger.warning(
        f"Rate limit exceeded: {request_limit} by IP {get_remote_address()} - "
        f"User ID: {user_id}, Endpoint: {endpoint}"
    )
    return "Rate limit exceeded. Please try again later.", 429

# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",  # Use in-memory storage
    strategy="fixed-window",  # Fixed time window strategy
)