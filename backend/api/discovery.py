# backend/app/api/discovery.py (Example - New Blueprint)
from flask import Blueprint, request, jsonify, current_app
from app.services.discovery_service import generate_interrogatory_responses
import PyMuPDF # fitz
import io

# Create a Blueprint
discovery_bp = Blueprint('discovery_api', __name__, url_prefix='/api/discovery')

@discovery_bp.route('/cases/<int:case_id>/interrogatory-responses', methods=['POST'])
def generate_interrogatory_responses_route(case_id):
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
            result = generate_interrogatory_responses(case_id, interrogatories_text)

            return jsonify(result), 200

        except Exception as e:
            current_app.logger.error(f"Error generating interrogatory responses for case {case_id}: {e}")
            return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file type, please upload a PDF"}), 400

# You'll need to register this blueprint in your app factory (create_app in app.py)
# from .api.discovery import discovery_bp
# app.register_blueprint(discovery_bp)