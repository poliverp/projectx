from backend.extensions import db # Import the 'db' object created in app.py
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from backend.extensions import db 
import secrets

class Case(db.Model):
    id = db.Column(db.Integer, primary_key=True) # Auto-incrementing primary key
    display_name = db.Column(db.String(200), unique=True, nullable=False)
    official_case_name = db.Column(db.String(200), unique=True, nullable=True)
    case_number = db.Column(db.String(100), unique=True, nullable=True)
    judge = db.Column(db.String(150), nullable=True)
    plaintiff = db.Column(db.String(200), nullable=True)
    defendant = db.Column(db.String(200), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    case_details = db.Column(db.JSON, nullable=True) # For flexible/additional fields
    jurisdiction = db.Column(db.String(200), nullable=True)
    county = db.Column(db.String(200), nullable=True)
    filing_date = db.Column(db.Date, nullable=True)
    trial_date = db.Column(db.Date, nullable=True)
    incident_date = db.Column(db.Date, nullable=True)
    incident_location = db.Column(db.String(200), nullable=True)
    incident_description = db.Column(db.String(200), nullable=True)
    case_type = db.Column(db.String(200), nullable=True)
    defendant_counsel_info = db.Column(db.String(1000), nullable=True)
    trial_date = db.Column(db.Date, nullable=True)
    vehicle_details = db.Column(db.String(200), nullable=True)
    plaintiff_counsel_info = db.Column(db.String(1000), nullable=True)


    # Relationship: A case can have many documents
    documents = db.relationship('Document', backref='case', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Case {self.display_name}>'

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('case.id'), nullable=False) # Foreign key linking to Case table
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(1024), nullable=False) # Path where the file is stored on the server
    # Store extracted text directly (consider implications for large files/DB size)
    extracted_text = db.Column(db.Text, nullable=True)
     # Store analysis results (e.g., as JSON)
    analysis_json = db.Column(db.JSON, nullable=True)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    # --- CONSIDER ADDING ---
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Document {self.file_name} (Case ID: {self.case_id})>'

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # New fields for approval system
    firm = db.Column(db.String(100), nullable=False)
    pending_approval = db.Column(db.Boolean, default=True)
    approval_token = db.Column(db.String(64), nullable=True, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)

    # Relationship to cases
    cases = db.relationship('Case', backref='owner', lazy='dynamic', cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_approval_token(self):
        """Generate a secure token for user approval"""
        self.approval_token = secrets.token_urlsafe(32)
        return self.approval_token
    
    def approve(self):
        """Approve this user account"""
        self.pending_approval = False
        self.approved_at = datetime.utcnow()
        self.approval_token = None  # Clear the token after use
        
    def is_active(self):
        """Override UserMixin is_active to check approval status"""
        # Users can only be active if they're approved
        return not self.pending_approval
        
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "firm": self.firm,
            "pending_approval": self.pending_approval,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None
        }

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        # Exclude sensitive information like password hash
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email
            # Add other safe fields if needed
        }
        
# Add other models if needed (e.g., Users, AnalysisResults)