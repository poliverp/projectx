from flask import request, jsonify, current_app, send_file
from flask_login import login_required, current_user
import os
import io
import json
import traceback
import tempfile  # Add this import
import fitz  # PyMuPDF
import re  # Added for regex pattern matching
from docx import Document
from docxtpl import DocxTemplate, RichText
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

# Function to strip markdown formatting
def strip_markdown(text):
    """Remove markdown formatting from text."""
    if not text:
        return ""
    # Remove bold markdown
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    # Remove italic markdown
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    # Remove headers (e.g., # Header)
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    return text

# Test endpoint to verify the blueprint is working
@bp.route('/test', methods=['GET'])
def test_endpoint():
    """Simple test endpoint to verify the discovery blueprint is working."""
    print("DEBUG: Test endpoint called successfully")
    return jsonify({"message": "Discovery API is working", "authenticated": current_user.is_authenticated}), 200

@bp.route('/discovery/cases/<int:case_id>/parse', methods=['POST'])
@login_required
def parse_discovery_document(case_id):
    """
    Accepts a file upload and discovery_type, parses the file, and returns just the questions.
    This is step 1 of the two-step process for discovery document generation.
    """
    print(f"DEBUG: Discovery parse endpoint accessed by user {current_user.id} for case {case_id}")
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
    temp_file = None
    temp_path = None
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

        # Use the orchestrator service - just to parse, not for full response
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
            
        # Get the AI response but only return questions
        result = service.respond(discovery_type, temp_path, case_details, objection_master)
        print(f"DEBUG: Service.respond completed successfully")
        
        # Extract just the questions and clean them for display
        questions = result.get('questions', [])
        cleaned_questions = []
        
        for q in questions:
            question_number = q.get('number', '')
            question_text = q.get('text', '')
            
            # Clean the question text (remove any existing headers)
            question_text = strip_markdown(question_text)
            # Remove any existing headers
            question_text = re.sub(r'^REQUEST FOR PRODUCTION NO\.\s*\d+\s*:\s*', '', question_text, flags=re.IGNORECASE)
            
            cleaned_questions.append({
                'id': f"q_{question_number}",  # Unique ID for frontend
                'number': question_number,
                'text': question_text.strip()
            })
            
        # Store the full result in the session for the second step
        # We need to ensure this data is accessible in the generate endpoint
        session_key = f"discovery_result_{case_id}_{current_user.id}"
        current_app.config[session_key] = result
        
        return jsonify({
            'questions': cleaned_questions,
            'discovery_type': discovery_type,
            'message': 'Document parsed successfully',
            'session_key': session_key  # Include this for reference
        }), 200
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"DEBUG: Error in parse_discovery_document: {str(e)}")
        print(f"DEBUG: Error traceback: {error_trace}")
        current_app.logger.error(f"Error processing discovery for case {case_id}: {e}")
        current_app.logger.error(f"Traceback: {error_trace}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    finally:
        # Clean up the temporary file
        if temp_file and temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                print(f"DEBUG: Temporary file {temp_path} removed")
            except Exception as cleanup_error:
                print(f"DEBUG: Error removing temporary file: {str(cleanup_error)}")


@bp.route('/discovery/cases/<int:case_id>/generate-document', methods=['POST'])
@login_required
def generate_discovery_document(case_id):
    """
    Takes the parsed questions and user selections, and generates a Word document.
    This is step 2 of the two-step process for discovery document generation.
    """
    print(f"DEBUG: Discovery document generation endpoint accessed by user {current_user.id} for case {case_id}")
    
    # Get the data from the request
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    session_key = data.get('session_key')
    selections = data.get('selections', {})
    discovery_type = data.get('discovery_type')
    
    print(f"DEBUG: Selections received: {selections}")
    
    if not session_key or not discovery_type:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    print(f"DEBUG: Session key: {session_key}")
    print(f"DEBUG: User selections: {selections}")
    
    # Retrieve the stored result from the first step
    result = current_app.config.get(session_key)
    if not result:
        return jsonify({'error': 'Session expired or invalid. Please restart the process.'}), 400
    
    try:
        # Load case details
        case = get_case_by_id(case_id, user_id=current_user.id)
        
        # Define the standard responses
        standard_responses = {
            'will_provide': "Plaintiff will produce responsive documents.",
            'none_found': "Plaintiff has no responsive documents to produce.",
            'no_text': ""  # No additional text
        }
        
        # Define path to the template
        template_name = 'discovery_responses_template.docx'
        template_dir = os.path.join(current_app.root_path, 'templates')
        template_path = os.path.join(template_dir, template_name)
        
        print(f"DEBUG: Looking for document template at: {template_path}")
        if not os.path.exists(template_path):
            return jsonify({'error': f'Template file "{template_name}" not found'}), 500
        
        # Extract questions and AI response from result
        questions = result.get('questions', [])
        ai_response = result.get('ai_response', '')
        
        # Parse the AI responses
        responses_dict = {}
        current_num = None
        current_text = ""
        
        print(f"DEBUG: Parsing AI response text")
        
        # Parse AI response to match responses with question numbers
        for line in ai_response.split('\n'):
            if "RESPONSE TO REQUEST FOR PRODUCTION NO." in line:
                # If we were building a response, save it
                if current_num is not None:
                    responses_dict[current_num] = current_text.strip()
                
                # Extract the question number
                try:
                    current_num = line.split("NO.")[1].split(":")[0].strip()
                    current_text = ""
                except IndexError:
                    current_num = None
                    print(f"DEBUG: Failed to extract number from: {line}")
            elif "REQUEST FOR PRODUCTION NO." in line:
                # If we hit a new request, save the current response
                if current_num is not None:
                    responses_dict[current_num] = current_text.strip()
                    current_num = None
            elif current_num is not None:
                current_text += line + "\n"
        
        # Add the last response if we have one
        if current_num is not None:
            responses_dict[current_num] = current_text.strip()
        
        # Create RichText object with formatted responses
        print(f"DEBUG: Creating RichText for responses")
        responses_rt = RichText()
        
        for question in questions:
            question_number = question.get('number', '')
            question_text = strip_markdown(question.get('text', ''))
            
            # Add request header (bold + underlined)
            responses_rt.add(f"REQUEST FOR PRODUCTION NO. {question_number}:", bold=True, underline=True)
            responses_rt.add('\n')
            
            # Add request text (indented with spaces)
            responses_rt.add(f"    {question_text}\n\n")
            
            # Add response header (bold + underlined)
            responses_rt.add(f"RESPONSE TO REQUEST FOR PRODUCTION NO. {question_number}:", bold=True, underline=True)
            responses_rt.add('\n')
            
            # Get response text or use default, and strip markdown
            response_text = responses_dict.get(question_number, 
                          "No objections found. Subject to and without waiving the foregoing objections, Plaintiff responds as follows:")
            response_text = strip_markdown(response_text)
            
            # Get the user selection for this question
            question_id = f"q_{question_number}"
            selection = selections.get(question_id, 'no_text')
            standard_response = standard_responses.get(selection, "")
            
            print(f"DEBUG: Question ID being looked up: {question_id}")
            print(f"DEBUG: Selection found: {selection}")
            print(f"DEBUG: Standard response: {standard_response}")
            
            # Add response text with spaces for indentation
            responses_rt.add(f"    {response_text}")
            
            # Add the selected standard response if it's not empty
            if standard_response:
                # If the response already ends with a period, add a space
                if response_text.strip().endswith('.'):
                    responses_rt.add(f" {standard_response}")
                else:
                    # Otherwise add a period then the standard response
                    responses_rt.add(f". {standard_response}")
            
            responses_rt.add("\n\n")
        
        # Create context with case info and responses
        context = {
            'case_name': case.display_name if hasattr(case, 'display_name') else '',
            'case_number': case.case_number if hasattr(case, 'case_number') else '',
            'plaintiff': case.plaintiff if hasattr(case, 'plaintiff') else '',
            'defendant': case.defendant if hasattr(case, 'defendant') else '',
            'judge': case.judge if hasattr(case, 'judge') else '',
            'jurisdiction': case.jurisdiction if hasattr(case, 'jurisdiction') else '',
            'county': case.county if hasattr(case, 'county') else '',
            # Date fields
            'filing_date': case.filing_date if hasattr(case, 'filing_date') else '',
            'trial_date': case.trial_date if hasattr(case, 'trial_date') else '',
            'incident_date': case.incident_date if hasattr(case, 'incident_date') else '',
            # Other fields
            'incident_location': case.incident_location if hasattr(case, 'incident_location') else '',
            'incident_description': case.incident_description if hasattr(case, 'incident_description') else '',
            'case_type': case.case_type if hasattr(case, 'case_type') else '',
            'defendant_counsel_info': case.defendant_counsel_info if hasattr(case, 'defendant_counsel_info') else '',
            'plaintiff_counsel_info': case.plaintiff_counsel_info if hasattr(case, 'plaintiff_counsel_info') else '',
            'vehicle_details': case.vehicle_details if hasattr(case, 'vehicle_details') else '',
            'defendant_counsel_attorneys': case.defendant_counsel_attorneys if hasattr(case, 'defendant_counsel_attorneys') else '',
            'defendant_counsel_firm': case.defendant_counsel_firm if hasattr(case, 'defendant_counsel_firm') else '',
            'defendant_counsel_address': case.defendant_counsel_address if hasattr(case, 'defendant_counsel_address') else '',
            'defendant_counsel_contact': case.defendant_counsel_contact if hasattr(case, 'defendant_counsel_contact') else '',
            'acting_attorney': case.acting_attorney if hasattr(case, 'acting_attorney') else '',
            'acting_clerk': case.acting_clerk if hasattr(case, 'acting_clerk') else '',
            # Add the responses last
            'responses': responses_rt
        }
        
        # Create and render the document
        print(f"DEBUG: Creating document from template")
        doc = DocxTemplate(template_path)
        doc.render(context)
        
        # Save to BytesIO
        print(f"DEBUG: Saving document to memory stream")
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        
        # Create filename
        safe_case_identifier = str(getattr(case, 'case_number', case_id)).replace('/','_').replace('\\','_')
        output_filename = f"RFP_Responses_{safe_case_identifier}.docx"
        
        # Delete the stored session data
        if session_key in current_app.config:
            del current_app.config[session_key]
        
        # Return the file
        print(f"DEBUG: Sending file: {output_filename}")
        return send_file(
            output,
            as_attachment=True,
            download_name=output_filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"DEBUG: Error in generate_discovery_document: {str(e)}")
        print(f"DEBUG: Error traceback: {error_trace}")
        current_app.logger.error(f"Error generating discovery document for case {case_id}: {e}")
        current_app.logger.error(f"Traceback: {error_trace}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@bp.route('/discovery/cases/<int:case_id>/respond', methods=['POST'])
@login_required
def respond_to_discovery(case_id):
    """
    Accepts a file upload and discovery_type, parses the file, processes with AI,
    and returns a Word document with formatted responses.
    """
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
    temp_file = None
    temp_path = None
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
            
        # Get the AI response
        result = service.respond(discovery_type, temp_path, case_details, objection_master)
        print(f"DEBUG: Service.respond completed successfully")
        
        # Define path to the template
        template_name = 'discovery_responses_template.docx'  # Make sure this exists in templates folder
        template_dir = os.path.join(current_app.root_path, 'templates')
        template_path = os.path.join(template_dir, template_name)
        
        print(f"DEBUG: Looking for document template at: {template_path}")
        if not os.path.exists(template_path):
            return jsonify({'error': f'Template file "{template_name}" not found'}), 500
        
        # Extract questions and AI response from result
        questions = result.get('questions', [])
        ai_response = result.get('ai_response', '')
        
        # Parse the AI responses for relevant parts (assuming specific format)
        responses_dict = {}
        current_num = None
        current_text = ""
        in_response = False
        
        print(f"DEBUG: Parsing AI response text")
        
        # Parse AI response to match responses with question numbers
        for line in ai_response.split('\n'):
            if "RESPONSE TO REQUEST FOR PRODUCTION NO." in line:
                # If we were building a response, save it
                if current_num is not None:
                    responses_dict[current_num] = current_text.strip()
                
                # Extract the question number
                try:
                    current_num = line.split("NO.")[1].split(":")[0].strip()
                    current_text = ""
                except IndexError:
                    current_num = None
                    print(f"DEBUG: Failed to extract number from: {line}")
            elif "REQUEST FOR PRODUCTION NO." in line:
                # If we hit a new request, save the current response
                if current_num is not None:
                    responses_dict[current_num] = current_text.strip()
                    current_num = None
            elif current_num is not None:
                current_text += line + "\n"
        
        # Add the last response if we have one
        if current_num is not None:
            responses_dict[current_num] = current_text.strip()
        
        # Create RichText object with formatted responses
        print(f"DEBUG: Creating RichText for responses")
        responses_rt = RichText()
        
        for question in questions:
            question_number = question.get('number', '')
            
            # Get response text or use default, and strip markdown
            response_text = responses_dict.get(question_number, 
                          "No objections found. Subject to and without waiving the foregoing objections, Plaintiff responds as follows:")
            response_text = strip_markdown(response_text)
            
            # Get the user selection for this question
            question_id = f"q_{question_number}"
            selection = selections.get(question_id, 'no_text')
            standard_response = standard_responses.get(selection, "")
            
            # Add the AI response text
            responses_rt.add(response_text)
            
            # Add the selected standard response if it's not empty
            if standard_response:
                # If the response already ends with a period, add a space
                if response_text.strip().endswith('.'):
                    responses_rt.add(f" {standard_response}")
                else:
                    # Otherwise add a period then the standard response
                    responses_rt.add(f". {standard_response}")
            
            responses_rt.add("\n\n")
        
        # Create context with case info and responses
        context = {
            'case_name': case.display_name if hasattr(case, 'display_name') else '',
            'case_number': case.case_number if hasattr(case, 'case_number') else '',
            'plaintiff': case.plaintiff if hasattr(case, 'plaintiff') else '',
            'defendant': case.defendant if hasattr(case, 'defendant') else '',
            'judge': case.judge if hasattr(case, 'judge') else '',
            'jurisdiction': case.jurisdiction if hasattr(case, 'jurisdiction') else '',
            'county': case.county if hasattr(case, 'county') else '',
            # Date fields
            'filing_date': case.filing_date if hasattr(case, 'filing_date') else '',
            'trial_date': case.trial_date if hasattr(case, 'trial_date') else '',
            'incident_date': case.incident_date if hasattr(case, 'incident_date') else '',
            # Other fields
            'incident_location': case.incident_location if hasattr(case, 'incident_location') else '',
            'incident_description': case.incident_description if hasattr(case, 'incident_description') else '',
            'case_type': case.case_type if hasattr(case, 'case_type') else '',
            'defendant_counsel_info': case.defendant_counsel_info if hasattr(case, 'defendant_counsel_info') else '',
            'plaintiff_counsel_info': case.plaintiff_counsel_info if hasattr(case, 'plaintiff_counsel_info') else '',
            'vehicle_details': case.vehicle_details if hasattr(case, 'vehicle_details') else '',
            'defendant_counsel_attorneys': case.defendant_counsel_attorneys if hasattr(case, 'defendant_counsel_attorneys') else '',
            'defendant_counsel_firm': case.defendant_counsel_firm if hasattr(case, 'defendant_counsel_firm') else '',
            'defendant_counsel_address': case.defendant_counsel_address if hasattr(case, 'defendant_counsel_address') else '',
            'defendant_counsel_contact': case.defendant_counsel_contact if hasattr(case, 'defendant_counsel_contact') else '',
            'acting_attorney': case.acting_attorney if hasattr(case, 'acting_attorney') else '',
            'acting_clerk': case.acting_clerk if hasattr(case, 'acting_clerk') else '',
            # Add the responses last
            'responses': responses_rt
        }
        
        # Create and render the document
        print(f"DEBUG: Creating document from template")
        doc = DocxTemplate(template_path)
        doc.render(context)
        
        # Save to BytesIO
        print(f"DEBUG: Saving document to memory stream")
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        
        # Create filename
        safe_case_identifier = str(getattr(case, 'case_number', case_id)).replace('/','_').replace('\\','_')
        output_filename = f"RFP_Responses_{safe_case_identifier}.docx"
        
        # Return the file
        print(f"DEBUG: Sending file: {output_filename}")
        return send_file(
            output,
            as_attachment=True,
            download_name=output_filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"DEBUG: Error in respond_to_discovery: {str(e)}")
        print(f"DEBUG: Error traceback: {error_trace}")
        current_app.logger.error(f"Error processing discovery for case {case_id}: {e}")
        current_app.logger.error(f"Traceback: {error_trace}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    finally:
        # Clean up the temporary file
        if temp_file and temp_path and os.path.exists(temp_path):
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