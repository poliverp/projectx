# backend/utils/db_types.py
from sqlalchemy import TypeDecorator, String, Text
import json
from backend.utils.encryption import field_encryptor

class EncryptedString(TypeDecorator):
    """Platform-independent encrypted string type."""
    
    impl = String
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        """Encrypt the string before storing in the database."""
        if value is not None:
            return field_encryptor.encrypt(value).decode('utf-8')
        return None
        
    def process_result_value(self, value, dialect):
        """Decrypt the string when retrieved from the database."""
        if value is not None:
            return field_encryptor.decrypt(value.encode('utf-8'))
        return None
        
class EncryptedText(TypeDecorator):
    """Platform-independent encrypted text type for longer content."""
    
    impl = Text
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        """Encrypt the text before storing in the database."""
        if value is not None:
            return field_encryptor.encrypt(value).decode('utf-8')
        return None
        
    def process_result_value(self, value, dialect):
        """Decrypt the text when retrieved from the database."""
        if value is not None:
            return field_encryptor.decrypt(value.encode('utf-8'))
        return None
        
class EncryptedJSON(TypeDecorator):
    """Platform-independent encrypted JSON type."""
    
    impl = Text
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        """Encrypt the JSON before storing in the database."""
        if value is not None:
            json_str = json.dumps(value)
            return field_encryptor.encrypt(json_str).decode('utf-8')
        return None
        
    def process_result_value(self, value, dialect):
        """Decrypt the JSON when retrieved from the database."""
        if value is not None:
            decrypted = field_encryptor.decrypt(value.encode('utf-8'))
            return json.loads(decrypted)
        return None