import os
import random
import logging
from contextlib import contextmanager

# Setup logging
secure_deletion_logger = logging.getLogger('secure_deletion')
secure_deletion_logger.setLevel(logging.INFO)
if not secure_deletion_logger.handlers:
    handler = logging.FileHandler('secure_deletion.log')
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    secure_deletion_logger.addHandler(handler)

def secure_delete_file(file_path, passes=3):
    """
    Securely delete a file by overwriting its contents multiple times 
    before deletion.
    
    Args:
        file_path (str): Path to the file to delete
        passes (int): Number of overwrite passes (default: 3)
        
    Returns:
        bool: True if deletion was successful, False otherwise
    """
    if not os.path.exists(file_path):
        secure_deletion_logger.warning(f"File not found for secure deletion: {file_path}")
        return False
        
    try:
        # Get file size
        file_size = os.path.getsize(file_path)
        
        if file_size == 0:
            # Empty file, just remove it
            os.remove(file_path)
            secure_deletion_logger.info(f"Empty file removed: {file_path}")
            return True
            
        # Open the file for binary writing
        for i in range(passes):
            pattern = None
            with open(file_path, 'rb+') as f:
                # Determine which pattern to write based on the pass
                if i == 0:
                    # First pass: all zeros
                    pattern = b'\x00'
                elif i == 1:
                    # Second pass: all ones
                    pattern = b'\xFF'
                else:
                    # Other passes: random data
                    pattern = bytes([random.randint(0, 255)])
                
                # Go to the beginning of the file
                f.seek(0)
                
                # Write the pattern over the entire file
                chunk_size = 1024 * 1024  # 1MB chunks to avoid memory issues
                remaining = file_size
                
                while remaining > 0:
                    write_size = min(chunk_size, remaining)
                    f.write(pattern * write_size)
                    remaining -= write_size
                
                # Flush changes to disk
                f.flush()
                os.fsync(f.fileno())
                
            secure_deletion_logger.info(f"Pass {i+1}/{passes} completed for {file_path}")
            
        # Finally remove the file
        os.remove(file_path)
        secure_deletion_logger.info(f"File securely deleted: {file_path}")
        return True
        
    except Exception as e:
        secure_deletion_logger.error(f"Error during secure deletion of {file_path}: {e}")
        # Try standard deletion as fallback
        try:
            os.remove(file_path)
            secure_deletion_logger.warning(f"Fallback to standard deletion for {file_path}")
            return True
        except Exception as e2:
            secure_deletion_logger.error(f"Even standard deletion failed for {file_path}: {e2}")
            return False