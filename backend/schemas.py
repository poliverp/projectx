# backend/schemas.py
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, auto_field
from marshmallow import fields
from .models import Case, Document, User # Import your models
from .extensions import ma, db 



# --- Define Schemas ---

class UserSchema(SQLAlchemyAutoSchema):
    """Schema for User model (excluding password)"""
    class Meta:
        model = User
        load_instance = True # Optional: If you want to load data into User objects
        # Exclude sensitive fields from serialization
        exclude = ("password_hash", "cases") # Exclude password and potentially relationships loaded elsewhere

class DocumentSchema(SQLAlchemyAutoSchema):
    """Schema for Document model"""
    # Customize date format if needed
    upload_date = auto_field(format="%Y-%m-%dT%H:%M:%S", allow_none=True) # Allow None for dates
    updated_at = auto_field(format="%Y-%m-%dT%H:%M:%S", allow_none=True) # Allow None for dates

    class Meta:
        model = Document
        load_instance = True
        # Include foreign key for context, or exclude if not needed in API
        # exclude = ("case",) # Exclude relationship backref if desired
        include_fk = True # Include case_id

class CaseSchema(SQLAlchemyAutoSchema):
    """
    Schema for Case model. Handles serialization and basic deserialization.
    Includes nested Document schema.
    """
    # Customize date formats
    created_at = auto_field(format="%Y-%m-%dT%H:%M:%S") # Example ISO format
    updated_at = auto_field(format="%Y-%m-%dT%H:%M:%S") # Example ISO format

    # --- Handling case_details (JSON field) ---
    # Option 1: Treat as a raw dictionary (simplest)
    case_details = fields.Dict(keys=fields.Str(), values=fields.Raw(), allow_none=True)
    # Option 2: Define a nested schema if case_details has a consistent structure
   
    # Use 'exclude' to avoid infinite loops if DocumentSchema includes 'case' backref
    documents = fields.Nested(DocumentSchema, many=True, dump_only=True)
    owner = fields.Nested(UserSchema, dump_only=True)

    class Meta:
        model = Case
        load_instance = True # Allow loading data into Case objects
        include_relationships = True # Include relationships defined above
        include_fk = True # Include user_id

        # --- Field Exclusion/Selection ---
        # Exclude fields if they shouldn't be in the API response/request body
        # exclude = ("owner",) # Example: Exclude owner details if not needed

        # Or explicitly list fields to include (more controlled)
        # fields = ("id", "display_name", "official_case_name", "case_number",
        #           "judge", "plaintiff", "defendant", "case_details",
        #           "created_at", "updated_at", "user_id", "documents")


# --- Instantiate Schemas (for convenience) ---
# You can instantiate them here or directly in your routes/services

user_schema = UserSchema(session=db.session)
case_schema = CaseSchema(session=db.session)
document_schema = DocumentSchema(session=db.session)

# Collection schemas (for lists)
users_schema = UserSchema(many=True, session=db.session)
cases_schema = CaseSchema(many=True, session=db.session)
documents_schema = DocumentSchema(many=True, session=db.session)

