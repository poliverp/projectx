from cryptography.fernet import Fernet, MultiFernet
import os
import json
import base64
import logging
from datetime import datetime

class FieldEncryptor:
    """Handles encryption and decryption of sensitive fields with key rotation support"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FieldEncryptor, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if FieldEncryptor._initialized:
            return
        self._keys = {}
        self._active_key_id = None
        self._multi_fernet = None
        self._key_dir = None
        self._logger = logging.getLogger(__name__)
    
    def init_app(self, app):
        """Initialize with Flask app instance"""
        # Set up key directory
        self._key_dir = os.path.join(app.instance_path, 'encryption_keys')
        os.makedirs(self._key_dir, exist_ok=True)
        
        # Set up versioned keys
        self._initialize_keys()
        
        # Mark as initialized
        FieldEncryptor._initialized = True
        
    def _initialize_keys(self):
        """Initialize encryption keys from files or create if needed"""
        # Check for key metadata file
        metadata_path = os.path.join(self._key_dir, 'key_metadata.json')
        
        if os.path.exists(metadata_path):
            # Load existing key metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                self._active_key_id = metadata.get('active_key_id')
        else:
            # No metadata exists, create initial key
            self._active_key_id = self._generate_key_id()
            self._create_new_key(self._active_key_id)
            
            # Save metadata
            self._save_metadata()
            
        # Load all keys from files
        self._load_keys()
            
    def _load_keys(self):
        """Load all key files from the key directory"""
        self._keys = {}
        
        # Find all key files
        for filename in os.listdir(self._key_dir):
            if filename.endswith('.key'):
                key_id = filename.split('.')[0]
                key_path = os.path.join(self._key_dir, filename)
                
                with open(key_path, 'rb') as key_file:
                    key_data = key_file.read()
                    self._keys[key_id] = key_data
        
        # Setup MultiFernet with all keys, active key first
        if self._active_key_id and self._active_key_id in self._keys:
            fernet_instances = [Fernet(self._keys[self._active_key_id])]
            
            # Add remaining keys
            for key_id, key in self._keys.items():
                if key_id != self._active_key_id:
                    fernet_instances.append(Fernet(key))
                    
            self._multi_fernet = MultiFernet(fernet_instances)
        else:
            # Fallback if no active key found
            self._logger.error("No active encryption key found!")
            raise RuntimeError("No active encryption key found!")
            
    def _save_metadata(self):
        """Save key metadata to file"""
        metadata = {
            'active_key_id': self._active_key_id,
            'last_updated': datetime.utcnow().isoformat()
        }
        
        metadata_path = os.path.join(self._key_dir, 'key_metadata.json')
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
            
        # Set restricted permissions
        try:
            os.chmod(metadata_path, 0o600)
        except Exception as e:
            self._logger.warning(f"Could not set file permissions for key metadata: {e}")
            
    def _generate_key_id(self):
        """Generate a unique ID for a key version"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        return f"key_{timestamp}"
        
    def _create_new_key(self, key_id):
        """Create a new encryption key and save to file"""
        # Generate key
        new_key = Fernet.generate_key()
        
        # Save to file
        key_path = os.path.join(self._key_dir, f"{key_id}.key")
        
        with open(key_path, 'wb') as key_file:
            key_file.write(new_key)
            
        # Set restricted permissions
        try:
            os.chmod(key_path, 0o600)
        except Exception as e:
            self._logger.warning(f"Could not set file permissions for key file: {e}")
            
        # Add to memory
        self._keys[key_id] = new_key
        
        # Create backup immediately
        self._backup_key(key_id, new_key)
        
        return new_key
        
    def encrypt(self, data):
        """Encrypt data using the active key"""
        if data is None:
            return None
            
        if isinstance(data, str):
            data = data.encode('utf-8')
            
        encrypted = self._multi_fernet.encrypt(data)
        return encrypted
    
    def decrypt(self, encrypted_data):
        """Decrypt data using any available key"""
        if encrypted_data is None:
            return None
            
        decrypted = self._multi_fernet.decrypt(encrypted_data)
        return decrypted.decode('utf-8')
        
    def rotate_keys(self):
        """Generate a new key and set it as active"""
        from backend.models import Case
        from backend.extensions import db
        
        # Create new key
        new_key_id = self._generate_key_id()
        self._create_new_key(new_key_id)
        
        # Update active key
        old_key_id = self._active_key_id
        self._active_key_id = new_key_id
        
        # Save metadata
        self._save_metadata()
        
        # Reinitialize MultiFernet with new active key
        self._load_keys()
        
        # Re-encrypt all data with new key
        try:
            # Get all cases with encrypted fields
            cases = Case.query.all()
            
            # Re-encrypt each field by decrypting and re-encrypting
            for case in cases:
                # Incident description
                if case.incident_description is not None:
                    # The TypeDecorator already handles the decryption and encryption
                    # Just write the value back to itself to trigger re-encryption
                    temp = case.incident_description
                    case.incident_description = temp
                
                # Vehicle details
                if case.vehicle_details is not None:
                    temp = case.vehicle_details
                    case.vehicle_details = temp
                
                # Case details
                if case.case_details is not None:
                    temp = case.case_details
                    case.case_details = temp
            
            # Commit changes
            db.session.commit()
            
            self._logger.info(f"Key rotation completed successfully. New active key: {new_key_id}")
            return True
            
        except Exception as e:
            self._logger.error(f"Error during key rotation: {e}")
            return False
    
    def _backup_key(self, key_id, key_data):
        """Create an encrypted backup of a key"""
        # Create backup directory
        backup_dir = os.path.join(self._key_dir, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Create an encrypted backup of the key
        # In a real system, this would use a separate backup key or HSM
        # For now, we'll just create a copy with timestamp
        backup_path = os.path.join(backup_dir, f"{key_id}_backup.key")
        
        with open(backup_path, 'wb') as f:
            f.write(key_data)
            
        # Set restricted permissions
        try:
            os.chmod(backup_path, 0o600)
        except Exception as e:
            self._logger.warning(f"Could not set file permissions for key backup: {e}")
            
    def backup_all_keys(self, backup_directory=None):
        """Create backups of all keys to specified directory or default location"""
        if backup_directory:
            # Use specified directory
            target_dir = backup_directory
        else:
            # Use default backup location in key directory
            target_dir = os.path.join(self._key_dir, 'backups', 
                                    f"full_backup_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}")
        
        # Create backup directory
        os.makedirs(target_dir, exist_ok=True)
        
        # Backup each key
        for key_id, key_data in self._keys.items():
            backup_path = os.path.join(target_dir, f"{key_id}_backup.key")
            
            with open(backup_path, 'wb') as f:
                f.write(key_data)
                
            # Set restricted permissions
            try:
                os.chmod(backup_path, 0o600)
            except Exception as e:
                self._logger.warning(f"Could not set file permissions for key backup: {e}")
                
        # Backup metadata
        metadata_path = os.path.join(self._key_dir, 'key_metadata.json')
        backup_metadata_path = os.path.join(target_dir, 'key_metadata.json')
        
        with open(metadata_path, 'r') as src, open(backup_metadata_path, 'w') as dst:
            dst.write(src.read())
            
        # Set restricted permissions
        try:
            os.chmod(backup_metadata_path, 0o600)
        except Exception as e:
            self._logger.warning(f"Could not set file permissions for metadata backup: {e}")
            
        return target_dir

# Create a singleton instance
field_encryptor = FieldEncryptor()