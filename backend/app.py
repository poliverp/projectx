# --- backend/app.py ---

import os
import json
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import uuid # For potentially generating unique filenames
from datetime import datetime # Needed for models

# --- Pre-initialization ---
load_dotenv() # Load .env file

# --- App Initialization & Configuration ---
app = Flask(__name__)

# Database Configuration
default_db_path = os.path.join(app.instance_path, 'default.db')
os.makedirs(app.instance_path, exist_ok=True) # Ensure instance folder exists
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', f'sqlite:///{default_db_path}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Upload Folder Configuration
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(app.instance_path, 'uploads'))
os.makedirs(UPLOAD_FOLDER, exist_ok=True) # Ensure upload folder exists
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Secret Key Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a-strong-dev-secret-key-please-change')

# --- Database & Migration Setup ---
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# --- CORS Setup ---
# Use the specific origin from .env or default to 5174 (as per your last update)
frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:5173")
print(f"--- CORS configured for origin: {frontend_origin} ---") # Keep this for verification

# Update the CORS configuration
CORS(app, resources={r"/api/*": {
    "origins": "http://localhost:5173", # Or 5000 if you changed BOTH ports
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    # ADD "x-api-key" HERE: AIzaSyDeW2v8jkWWTdoooWEwmZJLTm-WTjAq8PQ
    "allow_headers": ["Content-Type", "Authorization", "x-api-key"]
}})

# --- Model & Utility Imports ---
# These MUST exist in the same directory or be properly importable
try:
    from models import Case, Document
    from utils.document_parser import extract_text_from_pdf, extract_text_from_docx
except ImportError as e:
    print(f"ERROR: Could not import models or document_parser: {e}")
    print("Ensure models.py and utils/document_parser.py exist and are correct.")
    # Optionally exit or raise error if imports are critical for startup
    # import sys
    # sys.exit(1)


# --- API Routes ---

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "OK"}), 200

# == Case Management Endpoints ==

# Consolidated route for /api/cases handling GET and POST
@app.route('/api/cases', methods=['GET', 'POST', 'OPTIONS']) # Explicitly list OPTIONS
def handle_cases():
    # Flask-CORS should handle OPTIONS automatically if configured correctly.
    # This function will primarily handle GET and POST.
    if request.method == 'GET':
        print("--- Handling GET /api/cases ---")
        try:
            cases = Case.query.order_by(Case.display_name).all()
            cases_data = [{
                'id': case.id,
                'display_name': case.display_name,
                'official_case_name': case.official_case_name,
                'case_number': case.case_number
            } for case in cases]
            return jsonify(cases_data)
        except Exception as e:
            print(f"Error fetching cases: {e}")
            db.session.rollback() # Rollback in case of session errors
            return jsonify({'error': 'Failed to fetch cases'}), 500

    elif request.method == 'POST':
        print("--- Handling POST /api/cases ---")
        data = request.get_json()
        if not data or not data.get('display_name'):
            return jsonify({'error': 'Display name is required'}), 400

        display_name = data['display_name'].strip()
        existing_case = Case.query.filter_by(display_name=display_name).first()
        if existing_case:
             return jsonify({'error': f'Case with display name "{display_name}" already exists'}), 409 # Conflict

        new_case = Case(
            display_name=display_name,
            official_case_name=data.get('official_case_name'),
            case_number=data.get('case_number'),
            judge=data.get('judge'),
            plaintiff=data.get('plaintiff'),
            defendant=data.get('defendant')
        )
        try:
            db.session.add(new_case)
            db.session.commit()
            return jsonify({
                'id': new_case.id,
                'display_name': new_case.display_name,
            }), 201 # Created
        except Exception as e:
            db.session.rollback()
            print(f"Error creating case: {e}")
            return jsonify({'error': 'Failed to create case in database'}), 500

    elif request.method == 'OPTIONS':
         # This case might not be strictly needed if CORS() handles preflight,
         # but added for clarity during debugging. Flask-CORS should ideally
         # intercept this before the function body runs and add its headers.
         print("--- Handling OPTIONS /api/cases (explicitly registered) ---")
         # Flask-CORS will add the necessary headers to this response
         return jsonify({}), 200

@app.route('/debug-url-map')
def debug_url_map():
    # Convert the URL map to a string for display
    return str(app.url_map), 200, {'Content-Type': 'text/plain'}


# Route for getting ONE specific case
@app.route('/api/cases/<int:case_id>', methods=['GET'])
def get_case_details(case_id):
    """Fetches details for a specific case."""
    print(f"--- Handling GET /api/cases/{case_id} ---")
    try:
        target_case = Case.query.get_or_404(case_id)
        case_data = {
            'id': target_case.id,
            'display_name': target_case.display_name,
            'official_case_name': target_case.official_case_name,
            'case_number': target_case.case_number,
            'judge': target_case.judge,
            'plaintiff': target_case.plaintiff,
            'defendant': target_case.defendant,
            'created_at': target_case.created_at.isoformat() if target_case.created_at else None
        }
        return jsonify(case_data)
    except Exception as e:
        print(f"Error fetching case {case_id}: {e}")
        # get_or_404 handles not found, likely server error otherwise
        return jsonify({'error': 'Failed to fetch case details'}), 500


# Route for updating ONE specific case
@app.route('/api/cases/<int:case_id>', methods=['PUT'])
def update_case_details(case_id):
    """Updates details for a specific case."""
    print(f"--- Handling PUT /api/cases/{case_id} ---")
    target_case = Case.query.get_or_404(case_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No update data provided'}), 400

    # Update fields provided in the request data
    try:
        target_case.display_name = data.get('display_name', target_case.display_name)
        target_case.official_case_name = data.get('official_case_name', target_case.official_case_name)
        target_case.case_number = data.get('case_number', target_case.case_number)
        target_case.judge = data.get('judge', target_case.judge)
        target_case.plaintiff = data.get('plaintiff', target_case.plaintiff)
        target_case.defendant = data.get('defendant', target_case.defendant)
        # Add validation/checks if needed (e.g., display_name uniqueness)

        db.session.commit()
        # Return the updated case data
        updated_data = {
             'id': target_case.id, 'display_name': target_case.display_name,
             'official_case_name': target_case.official_case_name, 'case_number': target_case.case_number,
             'judge': target_case.judge, 'plaintiff': target_case.plaintiff,
             'defendant': target_case.defendant,
             'created_at': target_case.created_at.isoformat() if target_case.created_at else None
        }
        return jsonify(updated_data)
    except Exception as e:
        db.session.rollback()
        print(f"Error updating case {case_id}: {e}")
        return jsonify({'error': 'Failed to update case'}), 500

# Route for deleting ONE specific case (and its documents/files)
@app.route('/api/cases/<int:case_id>', methods=['DELETE'])
def delete_case_and_documents(case_id):
    """Deletes a case and all associated documents."""
    print(f"--- Handling DELETE /api/cases/{case_id} ---")
    target_case = Case.query.get_or_404(case_id)

    try:
        # Find associated document records BEFORE deleting the case
        documents_to_delete = Document.query.filter_by(case_id=case_id).all()
        # Keep track of file paths to delete after DB commit
        file_paths = [doc.file_path for doc in documents_to_delete if doc.file_path]

        # Delete the case from the database (cascade should handle Document records)
        db.session.delete(target_case)
        db.session.commit()
        print(f"Case record {case_id} deleted from DB.")

        # Now delete the physical files
        for file_path in file_paths:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"Deleted file: {file_path}")
                except OSError as e:
                    print(f"Error deleting file {file_path}: {e}") # Log error, but continue

        return jsonify({'message': f'Case {case_id} and associated documents deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting case {case_id}: {e}")
        return jsonify({'error': 'Failed to delete case'}), 500


# == Document Management Endpoints ==

@app.route('/api/cases/<int:case_id>/documents', methods=['GET'])
def get_case_documents(case_id):
    """Fetches all documents associated with a specific case."""
    print(f"--- Handling GET /api/cases/{case_id}/documents ---")
    if not Case.query.get(case_id): # Check if case exists
         return jsonify({'error': 'Case not found'}), 404

    try:
        documents = Document.query.filter_by(case_id=case_id).order_by(Document.upload_date.desc()).all()
        docs_data = [{
            'id': doc.id,
            'file_name': doc.file_name,
            'upload_date': doc.upload_date.isoformat() if doc.upload_date else None,
        } for doc in documents]
        return jsonify(docs_data)
    except Exception as e:
        db.session.rollback()
        print(f"Error fetching documents for case {case_id}: {e}")
        return jsonify({'error': 'Failed to fetch documents'}), 500

@app.route('/api/cases/<int:case_id>/documents', methods=['POST'])
def upload_file_to_case(case_id):
    """Handles file upload, saving, parsing, and DB record creation."""
    print(f"--- Handling POST /api/cases/{case_id}/documents ---")
    target_case = Case.query.get(case_id)
    if not target_case:
        return jsonify({'error': 'Case not found'}), 404

    if 'document' not in request.files:
        return jsonify({'error': 'No document file part in the request'}), 400

    file = request.files['document']
    options_str = request.form.get('options', '{}') # Options sent from frontend

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file: # Add allowed_file check here if needed
        filename = secure_filename(file.filename)
        # Consider unique filename generation: filename = f"{uuid.uuid4()}_{filename}"

        case_upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], str(case_id))
        os.makedirs(case_upload_folder, exist_ok=True)
        file_path = os.path.join(case_upload_folder, filename)

        # Save file
        try:
            file.save(file_path)
            print(f"File saved to: {file_path}")
        except Exception as e:
             print(f"Error saving file {filename}: {e}")
             return jsonify({'error': 'Failed to save file on server'}), 500

        # Create DB record
        new_doc = Document(case_id=case_id, file_name=filename, file_path=file_path)
        db.session.add(new_doc)
        try:
             db.session.commit()
             doc_id = new_doc.id # Get ID after commit
             print(f"Document record created with ID: {doc_id}")
        except Exception as e:
             db.session.rollback()
             print(f"Error saving document record to DB: {e}")
             if os.path.exists(file_path): # Clean up orphaned file
                  try: os.remove(file_path)
                  except OSError: pass
             return jsonify({'error': 'Failed to save document record'}), 500

        # Parse document text
        extracted_text = None
        print(f"Attempting to parse file: {filename}")
        if filename.lower().endswith('.pdf'):
            extracted_text = extract_text_from_pdf(file_path)
        elif filename.lower().endswith('.docx'):
            extracted_text = extract_text_from_docx(file_path)
        # Add .txt or other parsers if needed

        # Update DB record with extracted text
        if extracted_text is not None:
            # Use the committed object's ID to refetch or update
            # It's generally safer to refetch in case the session state is complex
            doc_record_to_update = Document.query.get(doc_id)
            if doc_record_to_update:
                try:
                    doc_record_to_update.extracted_text = extracted_text
                    db.session.commit()
                    print(f"Extracted text saved to DB for document ID: {doc_id}")
                except Exception as e:
                    db.session.rollback()
                    print(f"Error saving extracted text to DB for doc ID {doc_id}: {e}")
            else:
                 print(f"Consistency Error: Could not refetch doc ID {doc_id} after commit to save text.")
        else:
             print(f"No text extracted or file type not supported for document ID: {doc_id}")

        # TODO: Optional AI analysis trigger based on options

        # Return success response
        return jsonify({
            'message': f'File {filename} uploaded and processed successfully.',
            'document_id': doc_id,
            'file_name': filename
            }), 201

    return jsonify({'error': 'File upload failed unexpectedly'}), 500

@app.route('/api/documents/<int:document_id>', methods=['DELETE'])
def delete_single_document(document_id):
    """Deletes a specific document record and its associated file."""
    print(f"--- Handling DELETE /api/documents/{document_id} ---")
    doc_to_delete = Document.query.get_or_404(document_id)
    file_path_to_remove = doc_to_delete.file_path

    try:
        db.session.delete(doc_to_delete)
        db.session.commit()
        print(f"Document record {document_id} deleted from DB.")

        # Try deleting the file
        if file_path_to_remove and os.path.exists(file_path_to_remove):
            try:
                os.remove(file_path_to_remove)
                print(f"Deleted file: {file_path_to_remove}")
            except OSError as e:
                 print(f"Error deleting file {file_path_to_remove}: {e}")
        else:
             print(f"File path not found or missing for deleted document record {document_id}")

        return jsonify({'message': f'Document {document_id} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting document {document_id}: {e}")
        return jsonify({'error': 'Failed to delete document'}), 500


# == Placeholder & Test Routes ==

@app.route('/api/documents/<int:document_id>/analyze', methods=['POST'])
def trigger_document_analysis(document_id):
    """Placeholder: Triggers AI analysis for a specific document."""
    print(f"--- Handling POST /api/documents/{document_id}/analyze ---")
    doc = Document.query.get_or_404(document_id)
    if not doc.extracted_text:
        return jsonify({'error': 'Document has no extracted text to analyze'}), 400
    # --- Add AI Call Logic Here ---
    print(f"Placeholder: AI analysis would be triggered for document {document_id}")
    return jsonify({'message': 'Analysis process initiated (placeholder)', 'document_id': document_id})

@app.route('/api/cases/<int:case_id>/create-document', methods=['POST'])
def trigger_document_creation(case_id):
    """Placeholder: Triggers AI document generation for a case."""
    print(f"--- Handling POST /api/cases/{case_id}/create-document ---")
    case = Case.query.get_or_404(case_id)
    data = request.get_json()
    doc_type = data.get('type')
    details = data.get('details')
    if not doc_type: return jsonify({'error': 'Document type is required'}), 400
    # --- Add AI Call Logic Here ---
    print(f"Placeholder: Document creation would be triggered for case {case_id}, type: {doc_type}")
    return jsonify({'message': 'Document generation process initiated (placeholder)', 'case_id': case_id, 'type': doc_type})

# Minimal Test Route
@app.route('/api/testoptions', methods=['GET', 'OPTIONS'])
def test_options_route():
    print("--- Handling /api/testoptions ---")
    if request.method == 'OPTIONS':
        print("--- Handling OPTIONS /api/testoptions (explicitly) ---")
        return jsonify({"message": "OPTIONS handled explicitly"}), 200
    elif request.method == 'GET':
        return jsonify({"message": "GET request successful"}), 200


# --- Main Execution ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000)) # Default to 5001, adjust if needed
    print(f"--- Starting Flask server on http://0.0.0.0:{port} ---")
    # Set debug=False for production
    app.run(host='0.0.0.0', port=port, debug=True)