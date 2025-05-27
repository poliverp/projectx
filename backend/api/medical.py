from flask import Blueprint, request, jsonify, current_app, send_file
from flask_login import login_required, current_user
import os
import io
import traceback
import tempfile
import logging
from backend.utils import document_parser
from docx import Document
from datetime import datetime
from backend.services.analysis_service import call_gemini_with_prompt

medical_bp = Blueprint('medical', __name__, url_prefix='/medical')

ALLOWED_EXTENSIONS = {'.pdf', '.docx'}

@medical_bp.route('/summarize-records', methods=['POST'])
@login_required
def summarize_records():
    """
    Accepts an uploaded PDF or Word doc and returns a summarized Word document of medical records.
    Uses AI to parse and format the summary from the raw extracted text.
    """
    try:
        uploaded_file = request.files.get('file')
        if not uploaded_file:
            current_app.logger.error("No file uploaded in request.")
            return jsonify({'error': 'No file uploaded.'}), 400

        filename = uploaded_file.filename
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            current_app.logger.error(f"Unsupported file type: {ext}")
            return jsonify({'error': 'Only PDF and DOCX files are supported.'}), 400

        # Save to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_path = temp_file.name
            uploaded_file.save(temp_file)
            temp_file.flush()
        current_app.logger.info(f"File uploaded and saved to {temp_path}")

        # Extract text
        text = None
        if ext == '.pdf':
            # Try both 'text' and 'blocks' extraction
            import fitz
            try:
                with fitz.open(temp_path) as doc:
                    text_lines = []
                    for page in doc:
                        # Try 'text' extraction
                        t1 = page.get_text("text")
                        # Try 'blocks' extraction
                        t2 = "\n".join([b[4] for b in page.get_text("blocks") if b[4].strip()])
                        # Use whichever is longer
                        page_text = t1 if len(t1) > len(t2) else t2
                        text_lines.append(page_text)
                    text = "\n".join(text_lines)
            except Exception as e:
                current_app.logger.error(f"fitz extraction failed: {str(e)}")
                text = document_parser.extract_text_from_pdf(temp_path)
        elif ext == '.docx':
            text = document_parser.extract_text_from_docx(temp_path)
        else:
            text = None
        if not text or not text.strip():
            current_app.logger.error("Failed to extract text from uploaded file (empty result). Try a different file or format.")
            os.remove(temp_path)
            return jsonify({'error': 'Failed to extract text from uploaded file. Try a different file or format.'}), 400

        # Log the first 50 lines of extracted text for debugging
        lines = text.splitlines()
        current_app.logger.info("Extracted text sample:\n" + '\n'.join(lines[:50]))

        # Build a much stricter AI prompt
        prompt = (
            "Below is a list of medical providers and their details, possibly in a messy or misaligned format. "
            "For each provider, extract:\n"
            "(a) Name (from the Provider column),\n"
            "(b) Type of service (from the Provider Specialty column),\n"
            "(c) Dates of service (from First Service Date and Last Service Date; if two dates, include both and a message 'may need to check for additional service dates'),\n"
            "(d) Cost of service (from Total Billed column).\n"
            "IMPORTANT: ONLY use the data provided between <BEGIN DATA> and <END DATA>. Do NOT invent or add any providers or information that is not present in the data. "
            "If you cannot find a provider, do not include it. If any field is missing, write 'Missing Information'. Ignore time of day in dates.\n"
            "Format each provider as:\n(a) ...\n(b) ...\n(c) ...\n(d) ...\n"
            "Here is the raw data (do not ignore or summarize, just extract as instructed):\n"
            "<BEGIN DATA>\n" + text + "\n<END DATA>"
        )

        # Call AI
        try:
            ai_response = call_gemini_with_prompt(prompt)
            current_app.logger.info("AI response sample:\n" + '\n'.join(ai_response.splitlines()[:20]))
        except Exception as e:
            current_app.logger.error(f"AI call failed: {str(e)}")
            os.remove(temp_path)
            return jsonify({'error': f'AI call failed: {str(e)}'}), 500

        # Write AI response to Word doc
        doc = Document()
        for line in ai_response.splitlines():
            p = doc.add_paragraph(line)
            p.style.font.name = 'Times New Roman'
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        os.remove(temp_path)
        current_app.logger.info(f"Temporary file {temp_path} removed.")

        return send_file(
            output,
            as_attachment=True,
            download_name='medical_record_summary.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        error_trace = traceback.format_exc()
        current_app.logger.error(f"Error in summarize_records: {str(e)}")
        current_app.logger.error(f"Traceback: {error_trace}")
        return jsonify({'error': f'Failed to summarize records: {str(e)}'}), 500 