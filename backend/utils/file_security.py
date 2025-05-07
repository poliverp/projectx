# backend/utils/file_security.py
import os
import uuid
import hashlib
import mimetypes
import logging
from werkzeug.utils import secure_filename
from flask import current_app

# Initialize logger for file security events
file_security_logger = logging.getLogger('file_security')
file_security_logger.setLevel(logging.INFO)
if not file_security_logger.handlers:
    handler = logging.FileHandler('file_security.log')
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    file_security_logger.addHandler(handler)

# Configuration
# Allowed MIME types with their extensions
ALLOWED_MIME_TYPES = {
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'text/plain': ['txt'],
    'application/rtf': ['rtf'],
}

# Maximum file size (10MB)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

class FileSecurityError(Exception):
    """Base exception for file security errors."""
    pass

class FileSizeExceededError(FileSecurityError):
    """Raised when file size exceeds the maximum allowed."""
    pass

class FileTypeNotAllowedError(FileSecurityError):
    """Raised when file type is not allowed."""
    pass

def check_file_size(file_storage):
    """
    Check if file size is within allowed limits.
    
    Args:
        file_storage (FileStorage): The file object from the request.
        
    Returns:
        bool: True if file size is acceptable.
        
    Raises:
        FileSizeExceededError: If file size exceeds the maximum allowed.
    """
    # Seek to the end of file to get size
    file_storage.seek(0, os.SEEK_END)
    file_size = file_storage.tell()
    # Reset file pointer to beginning
    file_storage.seek(0)
    
    if file_size > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
        file_mb = file_size / (1024 * 1024)
        error_msg = f"File size ({file_mb:.2f}MB) exceeds maximum allowed size ({max_mb:.2f}MB)"
        file_security_logger.warning(f"File size validation failed: {error_msg}")
        raise FileSizeExceededError(error_msg)
    
    return True

def validate_file_type(file_storage):
    """
    Validate file type using mime type detection.
    
    Args:
        file_storage (FileStorage): The file object from the request.
        
    Returns:
        str: Detected MIME type if valid.
        
    Raises:
        FileTypeNotAllowedError: If file type is not allowed.
    """
    # First check by filename extension
    if not file_storage.filename:
        error_msg = "Missing filename"
        file_security_logger.warning(f"File type validation failed: {error_msg}")
        raise FileTypeNotAllowedError(error_msg)
    
    ext = os.path.splitext(file_storage.filename)[1].lower().lstrip('.')
    
    # Read first 8KB of file to detect MIME type
    file_storage.seek(0)
    header = file_storage.read(8192)
    file_storage.seek(0)
    
    # Use Python's built-in mimetype detection
    mime_type, _ = mimetypes.guess_type(file_storage.filename)
    
    # If mime type not detected or not allowed, reject
    if not mime_type or mime_type not in ALLOWED_MIME_TYPES:
        error_msg = f"File type '{mime_type or 'unknown'}' not allowed"
        file_security_logger.warning(f"File type validation failed: {error_msg} for file {file_storage.filename}")
        raise FileTypeNotAllowedError(error_msg)
    
    # Double-check extension matches mime type
    if ext not in ALLOWED_MIME_TYPES.get(mime_type, []):
        error_msg = f"File extension '.{ext}' does not match detected type '{mime_type}'"
        file_security_logger.warning(f"File extension validation failed: {error_msg}")
        raise FileTypeNotAllowedError(error_msg)
    
    return mime_type

def generate_secure_filename(original_filename, case_id):
    """
    Generate a secure filename with UUID and proper sanitization.
    
    Args:
        original_filename (str): Original filename from user.
        case_id (int): ID of the case.
        
    Returns:
        tuple: (secure_filename, original_filename)
    """
    if not original_filename:
        raise ValueError("Original filename is required")
    
    # Sanitize the original filename
    clean_filename = secure_filename(original_filename)
    
    # Get file extension
    _, ext = os.path.splitext(clean_filename)
    
    # Generate UUID
    unique_id = uuid.uuid4().hex
    
    # Create a hash of the original filename for extra uniqueness
    filename_hash = hashlib.md5(original_filename.encode()).hexdigest()[:8]
    
    # Construct secure filename: case_id-uuid-hash.ext
    secure_name = f"{case_id}-{unique_id}-{filename_hash}{ext}"
    
    # Log the mapping for audit purposes
    file_security_logger.info(f"Secure filename generated: {original_filename} -> {secure_name}")
    
    return secure_name, clean_filename

def get_secure_file_path(secure_filename, case_id):
    """
    Get the full secure path for storing a file.
    
    Args:
        secure_filename (str): Secure filename.
        case_id (int): ID of the case.
        
    Returns:
        str: Full file path.
    """
    # Get upload folder from app config
    upload_folder = current_app.config['UPLOAD_FOLDER']
    
    # Create case-specific folder with proper permissions
    case_folder = os.path.join(upload_folder, str(case_id))
    
    # Ensure the directory exists with proper permissions
    if not os.path.exists(case_folder):
        os.makedirs(case_folder, mode=0o750, exist_ok=True)
    
    # Return full path
    return os.path.join(case_folder, secure_filename)

def process_and_validate_file(file_storage, case_id):
    """
    Process and validate a file, returning secure path and filename.
    
    Args:
        file_storage (FileStorage): The file object from the request.
        case_id (int): ID of the case.
        
    Returns:
        tuple: (file_path, original_filename, mime_type)
        
    Raises:
        FileSizeExceededError: If file size exceeds the maximum allowed.
        FileTypeNotAllowedError: If file type is not allowed.
    """
    if not file_storage or not file_storage.filename:
        raise ValueError("Invalid file storage object provided")
    
    # Log file upload attempt
    file_security_logger.info(f"Processing upload: {file_storage.filename} for case {case_id}")
    
    # Check file size
    check_file_size(file_storage)
    
    # Validate file type
    mime_type = validate_file_type(file_storage)
    
    # Generate secure filename
    secure_filename, clean_original = generate_secure_filename(file_storage.filename, case_id)
    
    # Get full secure path
    file_path = get_secure_file_path(secure_filename, case_id)
    
    return file_path, clean_original, mime_type