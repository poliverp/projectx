from flask import request, jsonify, current_app, send_file
from flask_login import login_required, current_user
import os
import io
import json
import traceback
import tempfile  # Add this import
import fitz  # PyMuPDF
from docx import Document
from backend.services.case_service import get_case_by_id
from backend.app.discovery import (
    parse_requests_for_production,
    parse_form_interrogatories,
    parse_special_interrogatories,
    parse_requests_for_admission,
    build_rfp_prompt,
    build_form_interrogatories_prompt,
    build_special_interrogatories_prompt,
    build_rfa_prompt,
    DiscoveryResponseService
)
from backend.models import Case
from backend.extensions import csrf
from . import bp

# Test endpoint to verify the blueprint is working
@bp.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint to verify the discovery blueprint is working."""
    print("DEBUG: Test endpoint called successfully")
    return jsonify({"message": "Discovery API is working", "authenticated": current_user.is_authenticated}), 200

# [... Keep all other routes unchanged ...]

@bp.route('/discovery/cases/<int:case_id>/respond', methods=['POST'])
@login_required
def respond_to_discovery(case_id):
    """
    Accepts a file upload and discovery_type, parses the file, loads case details and objection master sheet, builds the AI prompt, and returns the prompt and parsed questions (for now).
    """
    print("DEBUG: Headers:", dict(request.headers))
    print(f"DEBUG: Discovery respond endpoint accessed by user {current_user.id} for case {case_id}")
    print(f"DEBUG: Request form data: {request.form}")
    print(f"DEBUG: Request files: {request.files.keys() if request.files else 'None'}")
    
    # Check for 'document' instead of 'file' to match Documents API pattern
    document = request.files.get('document')
    discovery_type = request.form.get('discovery_type')
    
    print(f"DEBUG: Extracted discovery_type: {discovery_type}")
    print(f"DEBUG: Extracted document: {document.filename if document else 'None'}")
    
    if not document or not discovery_type:
        print("DEBUG: Missing document or discovery_type, returning 400")
        return jsonify({'error': 'Missing document or discovery_type'}), 400

    # Create a temporary file with a secure name using tempfile module
    # This is platform-independent (works on Windows and Unix)
    temp_file = None
    try:
        # Create a named temporary file that closes when done
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_path = temp_file.name
            print(f"DEBUG: Created temporary file at {temp_path}")
            
            # Save uploaded file content to the temporary file
            document.save(temp_file)
            temp_file.flush()  # Ensure all data is written
            
        print(f"DEBUG: File saved successfully, size: {os.path.getsize(temp_path) if os.path.exists(temp_path) else 'file not found'}")
        
        # Load case details
        print(f"DEBUG: Attempting to get case {case_id} for user {current_user.id}")
        case = get_case_by_id(case_id, user_id=current_user.id)
        print(f"DEBUG: Successfully retrieved case {case_id}")
        
        case_details = {}
        if hasattr(case, 'to_dict'):
            print("DEBUG: Case has to_dict method, calling it")
            case_details = case.to_dict()
        else:
            print("DEBUG: Case doesn't have to_dict method, creating basic dict")
            # Create a basic dict with essential attributes
            case_details = {
                'id': case.id,
                'display_name': case.display_name if hasattr(case, 'display_name') else 'Unknown',
                # Add other essential fields
            }
        
        # Load objection master sheet (as plain text)
        objection_path = os.path.join(current_app.root_path, 'templates', 'MASTER SHEET Discovery Objection.docx')
        print(f"DEBUG: Looking for objection template at: {objection_path}")
        print(f"DEBUG: Template file exists? {os.path.exists(objection_path)}")
        
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(objection_path)
            objection_master = '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])
            print(f"DEBUG: Successfully loaded objection master sheet, length: {len(objection_master)}")
        except Exception as doc_error:
            print(f"DEBUG: Error loading objection master sheet: {str(doc_error)}")
            objection_master = "Error loading objection master sheet"  # Provide fallback

        # Use the orchestrator service
        print(f"DEBUG: About to initialize DiscoveryResponseService")
        service = DiscoveryResponseService()
        print(f"DEBUG: Service initialized successfully")
        
        print(f"DEBUG: Calling service.respond with discovery_type={discovery_type}")
        # Add some pre-processing checks to validate the PDF
        try:
            # Quick text extraction test to verify PDF is readable
            with fitz.open(temp_path) as doc:
                if len(doc) > 0:
                    sample_text = doc[0].get_text()[:200]
                    print(f"DEBUG: Sample text from first page: {sample_text}")
                else:
                    print("DEBUG: PDF appears to have no pages")
        except Exception as pdf_check_error:
            print(f"DEBUG: Error in PDF pre-check: {pdf_check_error}")
            
        result = service.respond(discovery_type, temp_path, case_details, objection_master)
        print(f"DEBUG: Service.respond completed successfully")
        
        return jsonify(result), 200
    
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"DEBUG: Error in respond_to_discovery: {str(e)}")
        print(f"DEBUG: Error traceback: {error_trace}")
        current_app.logger.error(f"Error processing discovery for case {case_id}: {e}")
        current_app.logger.error(f"Traceback: {error_trace}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    finally:
        # Clean up the temporary file
        if temp_file and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                print(f"DEBUG: Temporary file {temp_path} removed")
            except Exception as cleanup_error:
                print(f"DEBUG: Error removing temporary file: {str(cleanup_error)}")