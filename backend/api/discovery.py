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

@bp.route('/discovery/interrogatory-questions', methods=['GET'])
@login_required
def get_interrogatory_questions():
    """
    Serves the list of interrogatory questions based on the requested language.
    """
    language = request.args.get('language', 'english')
    
    try:
        # Get the project root directory (one level up from the backend directory)
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        
        # Construct the path to the JSON file
        file_path = os.path.join(project_root, 'backend', 'data', f'form_interrogatories_{language}.json')
        
        print(f"DEBUG: Looking for questions file at: {file_path}")
        print(f"DEBUG: File exists? {os.path.exists(file_path)}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({'error': f'No questions found for language: {language}'}), 404
            
        # Read and return the questions
        with open(file_path, 'r', encoding='utf-8') as f:
            questions = json.load(f)
            return jsonify(questions)
            
    except Exception as e:
        current_app.logger.error(f"Error serving interrogatory questions: {str(e)}")
        return jsonify({'error': 'Failed to load interrogatory questions'}), 500

@bp.route('/discovery/generate-interrogatory-document', methods=['POST'])
@login_required
def generate_interrogatory_document():
    """
    Generates an interrogatory document based on selected questions and case details.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Extract required data
        case_id = data.get('case_id')
        selected_ids = data.get('selected_ids', [])
        language = data.get('language', 'english')

        if not case_id or not selected_ids:
            return jsonify({'error': 'Missing required fields: case_id and selected_ids'}), 400

        # Get case details
        case = get_case_by_id(case_id, user_id=current_user.id)
        if not case:
            return jsonify({'error': 'Case not found'}), 404

        # Get the questions from the JSON file
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        questions_file = os.path.join(project_root, 'backend', 'data', f'form_interrogatories_{language}.json')
        
        if not os.path.exists(questions_file):
            return jsonify({'error': f'No questions found for language: {language}'}), 404

        with open(questions_file, 'r', encoding='utf-8') as f:
            all_questions = json.load(f)
            
        # Filter questions based on selected IDs
        selected_questions = [q for q in all_questions if q['id'] in selected_ids]

        # Create a new Document
        doc = Document()
        
        # Add title
        doc.add_heading('Form Interrogatories', 0)
        
        # Add case information
        doc.add_heading('Case Information', level=1)
        doc.add_paragraph(f'Case: {case.display_name}')
        doc.add_paragraph(f'Case Number: {case.case_number if hasattr(case, "case_number") else "N/A"}')
        
        # Add selected questions
        doc.add_heading('Interrogatories', level=1)
        for question in selected_questions:
            # Add question number and text
            doc.add_heading(f'Interrogatory No. {question.get("number", "N/A")}', level=2)
            doc.add_paragraph(question.get('text', ''))
            
            # Add subparts if they exist
            if question.get('subparts'):
                for subpart in question['subparts']:
                    doc.add_paragraph(subpart, style='List Bullet')

        # Save to a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
        doc.save(temp_file.name)
        temp_file.close()

        # Read the file and send it
        with open(temp_file.name, 'rb') as f:
            file_content = f.read()

        # Clean up the temporary file
        os.unlink(temp_file.name)

        # Create response with the file
        response = send_file(
            io.BytesIO(file_content),
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=f'form_interrogatories_{language}_{case_id}.docx'
        )

        return response

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"DEBUG: Error generating interrogatory document: {str(e)}")
        print(f"DEBUG: Error traceback: {error_trace}")
        current_app.logger.error(f"Error generating interrogatory document: {e}")
        current_app.logger.error(f"Traceback: {error_trace}")
        return jsonify({'error': f'Failed to generate document: {str(e)}'}), 500