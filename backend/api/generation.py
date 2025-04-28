# --- backend/api/generation.py ---

from flask import request, jsonify
from marshmallow import ValidationError # <<< Import ValidationError
from . import bp # Import the blueprint from api/__init__.py

# ---### START CHANGE: Imports ###---
# Import services and exceptions
from backend.services.generation_service import (
    generate_document_for_case,
    DOCUMENT_PROMPTS, # Keep if needed for get_document_types
    GenerationServiceError,
    InvalidDocumentTypeError
)
from backend.services.case_service import CaseNotFoundError # Import for error handling
# Import auth utilities and exceptions
from flask_login import login_required, current_user
from werkzeug.exceptions import Forbidden
# Import the new Marshmallow schemas
from backend.schemas import generate_document_input_schema, generated_document_schema
# ---### END CHANGE ###---


@bp.route('/generation/document-types', methods=['GET'])
@login_required
def get_document_types():
    """Returns a list of available document types for generation."""
    # This route is simple, no Marshmallow schema strictly needed for output,
    # but could add one later for consistency if desired.
    print("--- Handling GET /api/generation/document-types ---")
    try:
        types = list(DOCUMENT_PROMPTS.keys())
        return jsonify(types), 200
    except Exception as e:
        print(f"Error fetching document types: {e}")
        return jsonify({"error": "Failed to retrieve document types"}), 500

# ---### START CHANGE: Refactor handle_generate_document ###---
# Ensure the route matches what the frontend calls (check CasePage.jsx api.generateDocument)
# It might be /cases/<case_id>/generate-document or similar based on frontend api service
@bp.route('/cases/<int:case_id>/generate_document', methods=['POST']) # Verify route if needed
@login_required
def handle_generate_document(case_id):
    """
    API endpoint to trigger document generation for a case.
    Validates input and serializes output using Marshmallow schemas.
    """
    print(f"--- Handling POST /api/cases/{case_id}/generate_document (AUTH REQUIRED by user {current_user.id}) ---")
    request_data = request.get_json()

    if not request_data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # 1. Validate Input Data
    try:
        # Use the specific input schema for validation
        # load() validates and returns the validated dictionary
        validated_data = generate_document_input_schema.load(request_data)
        # If it passes, validated_data contains 'document_type' and optional 'custom_instructions'
    except ValidationError as err:
        print(f"Validation Error on Generate Document: {err.messages}")
        return jsonify({"error": "Validation failed", "messages": err.messages}), 400
    except Exception as val_err:
         print(f"Error during validation call: {val_err}")
         return jsonify({'error': 'Data validation process failed'}), 500

    # 2. Call Service Function
    try:
        # Call the service function with case_id and the validated data dictionary
        # The service function already handles fetching the case and checking ownership
        generated_content_text = generate_document_for_case(case_id, validated_data)

        # 3. Prepare and Serialize Response Data
        response_data = {
            "message": "Document content generated successfully.",
            "case_id": case_id,
            "document_type": validated_data.get('document_type'), # Get type from validated data
            "generated_content": generated_content_text
        }
        # Use the output schema to serialize the response dictionary
        result = generated_document_schema.dump(response_data)

        return jsonify(result), 200

    # Handle errors from the service layer or case access issues
    except CaseNotFoundError as e: return jsonify({"error": str(e)}), 404
    except Forbidden as e: return jsonify({'error': str(e) or 'Permission denied'}), 403
    except InvalidDocumentTypeError as e: return jsonify({"error": str(e)}), 400 # Bad request for invalid type
    except GenerationServiceError as e: return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"Unexpected error in generate_document route for case {case_id}: {e}")
        # Consider db.session.rollback() if service might leave transaction open
        return jsonify({"error": "An unexpected error occurred during document generation"}), 500
# ---### END CHANGE ###---
