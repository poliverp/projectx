from backend.extensions import db # Import the 'db' object created in app.py
from datetime import datetime, timedelta
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
    plaintiff = db.Column(db.String(1000), nullable=True)
    defendant = db.Column(db.String(1000), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    case_details = db.Column(db.JSON, nullable=True) # For flexible/additional fields
    jurisdiction = db.Column(db.String(200), nullable=True)
    county = db.Column(db.String(200), nullable=True)
    filing_date = db.Column(db.Date, nullable=True)
    trial_date = db.Column(db.Date, nullable=True)
    incident_date = db.Column(db.Date, nullable=True)
    incident_location = db.Column(db.String(1000), nullable=True)
    incident_description = db.Column(db.String(1000), nullable=True)
    case_type = db.Column(db.String(1000), nullable=True)
    trial_date = db.Column(db.Date, nullable=True)
    vehicle_details = db.Column(db.String(1000), nullable=True)
    plaintiff_counsel_info = db.Column(db.String(1000), nullable=True)
    defendant_counsel_attorneys = db.Column(db.String(1000), nullable=True)
    defendant_counsel_firm = db.Column(db.String(1000), nullable=True)
    defendant_counsel_address = db.Column(db.String(1000), nullable=True)
    defendant_counsel_contact = db.Column(db.String(1000), nullable=True)
    acting_attorney = db.Column(db.String(1000), nullable=True)
    acting_clerk = db.Column(db.String(200), nullable=True)


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

    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    password_changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), nullable=True)
    # Relationship to cases
    cases = db.relationship('Case', backref='owner', lazy='dynamic', cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        self.password_changed_at = datetime.utcnow()

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
    
    def is_account_locked(self):
        """Check if account is temporarily locked due to failed login attempts"""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
    
    def increment_login_attempts(self):
        """Track failed login attempts and lock account if threshold exceeded"""
        self.failed_login_attempts += 1
        
        # Lock account for progressively longer times based on failed attempts
        if self.failed_login_attempts >= 10:
            # Lock for 24 hours after 10 attempts
            self.locked_until = datetime.utcnow() + timedelta(hours=24)
        elif self.failed_login_attempts >= 5:
            # Lock for 15 minutes after 5 attempts
            self.locked_until = datetime.utcnow() + timedelta(minutes=15)
        
        db.session.commit()
        
    def reset_login_attempts(self):
        """Reset counter after successful login"""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login_at = datetime.utcnow()
        db.session.commit()
        
    def record_login_ip(self, ip_address):
        """Record the IP address of a successful login"""
        self.last_login_ip = ip_address
        db.session.commit()
        
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