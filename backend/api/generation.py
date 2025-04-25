# --- backend/api/generation.py ---

from flask import request, jsonify
from . import bp # Import the blueprint from api/__init__.py
# Make sure DOCUMENT_PROMPTS is included in this import list!
from backend.services.generation_service import generate_document_for_case, DOCUMENT_PROMPTS, GenerationServiceError, InvalidDocumentTypeError
from backend.services.case_service import CaseNotFoundError # Import for error handling
from flask_login import login_required # Or flask_jwt_extended import jwt_required

@bp.route('/generation/document-types', methods=['GET'])
@login_required # Or @jwt_required() - THIS IS STILL NEEDED FOR AUTH
def get_document_types():
    """Returns a list of available document types for generation."""
    print("--- Handling GET /api/generation/document-types ---")
    try:
        # Get the keys (names) from the prompts dictionary
        types = list(DOCUMENT_PROMPTS.keys())
        return jsonify(types), 200
    except Exception as e:
        print(f"Error fetching document types: {e}")
        return jsonify({"error": "Failed to retrieve document types"}), 500

@bp.route('/cases/<int:case_id>/generate_document', methods=['POST'])
@login_required # Or @jwt_required() - THIS IS STILL NEEDED FOR AUTH
def handle_generate_document(case_id):
    """
    API endpoint to trigger document generation for a case.
    """
    print(f"--- Handling POST /api/cases/{case_id}/generate_document (Blueprint) ---")
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    document_type = data.get('document_type')
    if not document_type:
        return jsonify({"error": "Missing 'document_type' in request body"}), 400

    try:
        # Call the placeholder service function
        generated_content = generate_document_for_case(case_id, data)

        # Return the generated content (maybe specify content type later)
        # For now, just return as JSON field
        return jsonify({
            "message": "Document generation initiated (placeholder)",
            "case_id": case_id,
            "document_type": document_type,
            "generated_content": generated_content # The placeholder text
        }), 200

    except CaseNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except GenerationServiceError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"Unexpected error in generate_document route for case {case_id}: {e}")
        return jsonify({"error": "An unexpected error occurred during document generation"}), 500