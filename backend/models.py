from backend.extensions import db # Import the 'db' object created in app.py
from datetime import datetime

class Case(db.Model):
    id = db.Column(db.Integer, primary_key=True) # Auto-incrementing primary key
    display_name = db.Column(db.String(200), unique=True, nullable=False)
    official_case_name = db.Column(db.String(200), unique=True, nullable=True)
    case_number = db.Column(db.String(100), unique=True, nullable=True)
    judge = db.Column(db.String(150), nullable=True)
    plaintiff = db.Column(db.String(200), nullable=True)
    defendant = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    case_details = db.Column(db.JSON, nullable=True) # For flexible/additional fields

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

# Add other models if needed (e.g., Users, AnalysisResults)