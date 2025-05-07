from cryptography.fernet import Fernet
import os
import logging
from datetime import datetime
from flask import current_app

# Initialize logger
file_encryption_logger = logging.getLogger('file_encryption')
file_encryption_logger.setLevel(logging.INFO)
if not file_encryption_logger.handlers:
    handler = logging.FileHandler('file_encryption.log')
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    file_encryption_logger.addHandler(handler)

class FileEncryptor:
    """Handles encryption and decryption of files"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FileEncryptor, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if FileEncryptor._initialized:
            return
        self._key = None
        self.cipher = None
    
    def init_app(self, app):
        """Initialize with Flask app instance"""
        # Get or generate key from app config
        key_path = os.path.join(app.instance_path, 'file_encryption.key')
        
        if os.path.exists(key_path):
            with open(key_path, 'rb') as key_file:
                self._key = key_file.read()
        else:
            # Generate a new key
            self._key = Fernet.generate_key()
            
            # Ensure instance path exists
            os.makedirs(app.instance_path, exist_ok=True)
            
            # Save key to file with restricted permissions
            with open(key_path, 'wb') as key_file:
                key_file.write(self._key)
                
            # Set file permissions to be restricted (owner only)
            try:
                os.chmod(key_path, 0o600)
            except Exception as e:
                file_encryption_logger.warning(f"Could not set file permissions for encryption key: {e}")
            
        # Create cipher
        self.cipher = Fernet(self._key)
        FileEncryptor._initialized = True
        file_encryption_logger.info("File encryption initialized")
        
    def encrypt_file(self, input_path, output_path=None):
        """
        Encrypt a file at input_path and save to output_path.
        If output_path is None, encrypt in place.
        """
        if not self._initialized:
            raise RuntimeError("FileEncryptor not initialized. Call init_app first.")
            
        if output_path is None:
            output_path = input_path
            
        try:
            # Read the file
            with open(input_path, 'rb') as f:
                data = f.read()
                
            # Encrypt the data
            encrypted_data = self.cipher.encrypt(data)
            
            # Write the encrypted data
            with open(output_path, 'wb') as f:
                f.write(encrypted_data)
                
            file_encryption_logger.info(f"File encrypted: {input_path}")
            return True
            
        except Exception as e:
            file_encryption_logger.error(f"Error encrypting file {input_path}: {e}")
            raise
    
    def decrypt_file(self, input_path, output_path=None):
        """
        Decrypt a file at input_path and save to output_path.
        If output_path is None, return the decrypted data as bytes.
        """
        if not self._initialized:
            raise RuntimeError("FileEncryptor not initialized. Call init_app first.")
            
        try:
            # Read the encrypted file
            with open(input_path, 'rb') as f:
                encrypted_data = f.read()
                
            # Decrypt the data
            decrypted_data = self.cipher.decrypt(encrypted_data)
            
            if output_path:
                # Write the decrypted data to a file
                with open(output_path, 'wb') as f:
                    f.write(decrypted_data)
                file_encryption_logger.info(f"File decrypted to: {output_path}")
                return True
            else:
                # Return the decrypted data
                file_encryption_logger.info(f"File decrypted: {input_path}")
                return decrypted_data
                
        except Exception as e:
            file_encryption_logger.error(f"Error decrypting file {input_path}: {e}")
            raise

# Create a singleton instance
file_encryptor = FileEncryptor()