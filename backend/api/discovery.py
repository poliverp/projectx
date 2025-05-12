from flask import request, jsonify, current_app, send_file
from flask_login import login_required, current_user
import os
import io
import json
import traceback  # Added for better error reporting
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
from backend.extensions import csrf  # Import CSRF protection
from . import bp

# Test endpoint to verify the blueprint is working
@bp.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint to verify the discovery blueprint is working."""
    print("DEBUG: Test endpoint called successfully")
    return jsonify({"message": "Discovery API is working", "authenticated": current_user.is_authenticated}), 200

@bp.route('/interrogatory-questions', methods=['GET'])
@login_required
def get_interrogatory_questions():
    """Endpoint to get available interrogatory questions."""
    language = request.args.get('language', 'english')
    
    # Validate language
    if language not in ['english', 'spanish']:
        return jsonify({"error": "Invalid language specified"}), 400
    
    # Load questions from JSON file
    data_file = os.path.join(current_app.root_path, 'data', f'form_interrogatories_{language}.json')
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        return jsonify(questions), 200
    except FileNotFoundError:
        current_app.logger.error(f"Interrogatory questions file not found: {data_file}")
        return jsonify({"error": "Questions file not found for selected language"}), 404
    except Exception as e:
        current_app.logger.error(f"Error loading interrogatory questions: {e}")
        return jsonify({"error": "Failed to load interrogatory questions"}), 500

@bp.route('/generate-interrogatory-document', methods=['POST'])
@login_required
def generate_interrogatory_document():
    """Endpoint to generate a document with selected interrogatories."""
    try:
        data = request.get_json()
        selected_ids = data.get('selected_ids', [])
        language = data.get('language', 'english')
        case_id = data.get('case_id')
        
        # Validate inputs
        if not selected_ids:
            return jsonify({"error": "No questions selected"}), 400
        if language not in ['english', 'spanish']:
            return jsonify({"error": "Invalid language specified"}), 400
        if not case_id:
            return jsonify({"error": "Case ID is required"}), 400
        
        # Load all questions
        data_file = os.path.join(current_app.root_path, 'data', f'form_interrogatories_{language}.json')
        with open(data_file, 'r', encoding='utf-8') as f:
            all_questions = json.load(f)
        
        # Filter to selected questions
        selected_questions = [q for q in all_questions if q['id'] in selected_ids]
        
        # Generate Word document
        doc = Document()
        doc.add_heading(f'FORM INTERROGATORIES - {language.upper()}', 0)
        
        # Add case information
        try:
            case = get_case_by_id(case_id, user_id=current_user.id)
            doc.add_paragraph(f"Case: {case.display_name}")
            doc.add_paragraph(f"Case Number: {case.case_number or 'N/A'}")
        except Exception as e:
            # Continue even if case info fails
            current_app.logger.error(f"Error fetching case info: {e}")
        
        # Add questions with space for answers
        for question in selected_questions:
            doc.add_heading(f"Question {question['number']}", level=2)
            doc.add_paragraph(question['text'])
            # Add a blank paragraph for answer
            doc.add_paragraph("_" * 50)
            doc.add_paragraph("\n\n")
        
        # Save to memory stream
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        
        # Return document as response
        filename = f"form_interrogatories_{language}_{case_id}.docx"
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        current_app.logger.error(f"Error generating interrogatory document: {e}")
        return jsonify({"error": f"Failed to generate document: {str(e)}"}), 500

@bp.route('/discovery/cases/<int:case_id>/interrogatory-responses', methods=['POST'])
@login_required
def generate_interrogatory_responses_route(case_id):
    """Endpoint to generate responses to interrogatories from a PDF."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.lower().endswith('.pdf'):
        try:
            pdf_data = file.read()
            pdf_stream = io.BytesIO(pdf_data)
            interrogatories_text = ""

            # Use PyMuPDF to extract text
            with fitz.open(stream=pdf_stream, filetype="pdf") as doc:
                for page in doc:
                    interrogatories_text += page.get_text()

            if not interrogatories_text:
                 return jsonify({"error": "Could not extract text from PDF"}), 400

            # Save file temporarily
            temp_path = os.path.join('/tmp', 'temp_interrogatories.pdf')
            with open(temp_path, 'wb') as f:
                f.write(pdf_data)

            # Load case details
            case = get_case_by_id(case_id, user_id=current_user.id)
            case_details = case.to_dict() if hasattr(case, 'to_dict') else {}

            # Load objection master sheet (as plain text)
            objection_path = os.path.join(current_app.root_path, 'templates', 'MASTER SHEET Discovery Objection.docx')
            from docx import Document as DocxDocument
            doc = DocxDocument(objection_path)
            objection_master = '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])

            # Use the service
            service = DiscoveryResponseService()
            result = service.respond('special_interrogatories', temp_path, case_details, objection_master)
            
            # Clean up
            os.remove(temp_path)
            
            return jsonify(result), 200

        except Exception as e:
            current_app.logger.error(f"Error generating interrogatory responses for case {case_id}: {e}")
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file type, please upload a PDF"}), 400

@bp.route('/simple-upload-test', methods=['POST'])
def simple_upload_test():
    print("DEBUG: Simple upload test endpoint accessed")
    print("DEBUG: Form data:", request.form)
    print("DEBUG: Files:", request.files)
    
    # Just return success regardless of content
    return jsonify({"message": "Upload received successfully"}), 200

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

    # Save file temporarily
    temp_path = os.path.join('/tmp', document.filename)
    try:
        print(f"DEBUG: Saving file to {temp_path}")
        document.save(temp_path)
        print(f"DEBUG: File saved successfully, size: {os.path.getsize(temp_path) if os.path.exists(temp_path) else 'file not found'}")
    except Exception as e:
        print(f"DEBUG: Error saving file: {str(e)}")
        return jsonify({'error': f'Error saving file: {str(e)}'}), 500

    try:
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
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                print(f"DEBUG: Temporary file {temp_path} removed")
            except Exception as cleanup_error:
                print(f"DEBUG: Error removing temporary file: {str(cleanup_error)}")