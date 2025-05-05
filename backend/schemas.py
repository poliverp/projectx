# backend/schemas.py
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, auto_field
from marshmallow import fields, Schema, validate, EXCLUDE  # <<< Import validate
from .models import Case, Document, User
from .extensions import ma
from backend.models import User

# --- Schemas for API OUTPUT Serialization ---
APPROVED_FIRMS = ["Adamson Ahdoot LLC"]

class UserSchema(SQLAlchemyAutoSchema):
    """Schema for User model OUTPUT (excluding password)"""
    email = fields.Email()
    created_at = fields.DateTime(format="%Y-%m-%dT%H:%M:%S")
    approved_at = fields.DateTime(format="%Y-%m-%dT%H:%M:%S")
    
    class Meta:
        model = User
        load_instance = True
        exclude = ("password_hash", "cases", "approval_token")

# --- Instantiate Schemas ---


class DocumentSchema(SQLAlchemyAutoSchema):
    """Schema for Document model OUTPUT"""
    upload_date = auto_field(format="%Y-%m-%dT%H:%M:%S", allow_none=True)
    updated_at = auto_field(format="%Y-%m-%dT%H:%M:%S", allow_none=True)
    class Meta:
        model = Document
        load_instance = True
        include_fk = True

class CaseSchema(SQLAlchemyAutoSchema):
    """Schema for Case model OUTPUT (Serialization)"""
    created_at = auto_field(format="%Y-%m-%dT%H:%M:%S", allow_none=True)
    updated_at = auto_field(format="%Y-%m-%dT%H:%M:%S", allow_none=True)
    case_details = fields.Dict(
        keys=fields.Str(), 
        values=fields.Raw(allow_none=True),  # Explicitly allow null values for any field
        required=False, 
        allow_none=True
    )   
    documents = fields.Nested(DocumentSchema, many=True, dump_only=True)
    owner = fields.Nested(UserSchema, dump_only=True)
    class Meta:
        model = Case
        load_instance = True
        include_relationships = True
        include_fk = True

class DiscoveryResponseSchema(Schema):
    """Schema for the response of the interrogatory generation endpoint."""
    generated_content = fields.Str(required=True)

class GeneratedDocumentSchema(Schema):
    """Schema for the response of the document generation endpoint."""
    message = fields.Str(required=True)
    case_id = fields.Int(required=True)
    document_type = fields.Str(required=True)
    generated_content = fields.Str(required=True)

# --- Schemas for API INPUT Validation ---

class CaseInputBaseSchema(Schema):
    """Base schema for common editable Case fields (for validation ONLY)"""
    display_name = fields.Str(required=False, allow_none=False)
    official_case_name = fields.Str(required=False, allow_none=True)
    case_number = fields.Str(required=False, allow_none=True)
    judge = fields.Str(required=False, allow_none=True)
    plaintiff = fields.Str(required=False, allow_none=True)
    defendant = fields.Str(required=False, allow_none=True)
    jurisdiction = fields.Str(required=False, allow_none=True)
    county = fields.Str(required=False, allow_none=True)
    filing_date = fields.Str(required=False, allow_none=True)
    trial_date = fields.Str(required=False, allow_none=True)
    incident_date = fields.Str(required=False, allow_none=True)
    incident_location = fields.Str(required=False, allow_none=True)
    incident_description = fields.Str(required=False, allow_none=True)
    case_type = fields.Str(required=False, allow_none=True)
    defendant_counsel_info = fields.Str(required=False, allow_none=True)
    trial_date = fields.Str(required=False, allow_none=True)
    vehicle_details = fields.Str(required=False, allow_none=True)
    plaintiff_counsel_info = fields.Str(required=False, allow_none=True)
    defendant_counsel_attorneys = fields.Str(required=False, allow_none=True)
    defendant_counsel_firm = fields.Str(required=False, allow_none=True)
    defendant_counsel_address = fields.Str(required=False, allow_none=True)
    defendant_counsel_contact = fields.Str(required=False, allow_none=True)
    acting_attorney = fields.Str(required=False, allow_none=True)
    acting_clerk = fields.Str(required=False, allow_none=True)
    case_details = fields.Dict(keys=fields.Str(), values=fields.Raw(), required=False, allow_none=True)

class CaseCreateInputSchema(CaseInputBaseSchema):
    """Schema for VALIDATING Case creation (POST)"""
    display_name = fields.Str(required=True, error_messages={'required': 'Display name is required.'})

class CaseUpdateInputSchema(CaseInputBaseSchema):
    """Schema for VALIDATING Case update (PUT)"""
    class Meta:
        # Exclude case_details from validation during partial updates.
        # The service layer will handle merging the received case_details dict.
        # This prevents validation errors for null values inside the JSON blob.
        exclude = ("case_details",)

class GenerateDocumentInputSchema(Schema):
    """Schema for VALIDATING the document generation request (POST)"""
    document_type = fields.Str(required=True, error_messages={'required': 'Document type is required.'})
    custom_instructions = fields.Str(required=False, allow_none=True)

class RegistrationInputSchema(Schema):
    """Schema for VALIDATING user registration (POST /register)"""
    username = fields.Str(required=True, validate=validate.Length(min=3, error="Username must be at least 3 characters long."))
    email = fields.Email(required=True, error_messages={'required': 'Email is required.', 'invalid': 'Not a valid email address.'})
    password = fields.Str(required=True, validate=validate.Length(min=8, error="Password must be at least 8 characters long."))
    # New field for firm with validation
    firm = fields.Str(
        required=True, 
        validate=validate.OneOf(APPROVED_FIRMS, error="Selected firm is not approved. Please choose from the list of approved firms."),
        error_messages={'required': 'Firm is required.'}
    )

class LoginInputSchema(Schema):
    """Schema for VALIDATING user login inputs only"""
    username = fields.Str(required=True, error_messages={'required': 'Username is required.'})
    password = fields.Str(required=True, error_messages={'required': 'Password is required.'})
    remember = fields.Bool(required=False)
    
    class Meta:
        # Standard Marshmallow option to handle extra fields
        unknown = EXCLUDE  # Ignore unknown fields


# --- Instantiate Schemas ---

# Schemas for Serialization (Output)
user_schema = UserSchema() # Used for single user output
case_schema = CaseSchema()
document_schema = DocumentSchema()
discovery_response_schema = DiscoveryResponseSchema()
generated_document_schema = GeneratedDocumentSchema()

# Collection schemas (for lists)
users_schema = UserSchema(many=True)
cases_schema = CaseSchema(many=True)
documents_schema = DocumentSchema(many=True)

# Schemas for Validation (Input)
case_create_input_schema = CaseCreateInputSchema()
case_update_input_schema = CaseUpdateInputSchema()
generate_document_input_schema = GenerateDocumentInputSchema()
registration_input_schema = RegistrationInputSchema() # <<< Instantiate new input schema
login_input_schema = LoginInputSchema() # <<< Instantiate new input schema

user_schema = UserSchema()
users_schema = UserSchema(many=True)