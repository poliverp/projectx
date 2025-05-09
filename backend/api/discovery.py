from flask import Blueprint, request, jsonify, current_app, send_file
from flask_login import login_required, current_user
import os
import io
import json
import fitz  # PyMuPDF
from docx import Document
from backend.services.case_service import get_case_by_id

# Create discovery blueprint
discovery_bp = Blueprint('discovery_api', __name__)

@discovery_bp.route('/interrogatory-questions', methods=['GET'])
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

@discovery_bp.route('/generate-interrogatory-document', methods=['POST'])
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

@discovery_bp.route('/cases/<int:case_id>/interrogatory-responses', methods=['POST'])
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

            # Call the service function
            # This function should be imported from your service module
            from backend.services.discovery_service import generate_interrogatory_responses
            result = generate_interrogatory_responses(case_id, interrogatories_text)

            return jsonify(result), 200

        except Exception as e:
            current_app.logger.error(f"Error generating interrogatory responses for case {case_id}: {e}")
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file type, please upload a PDF"}), 400