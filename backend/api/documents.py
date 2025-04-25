# --- backend/api/documents.py ---
# (Or wherever these routes are defined, e.g., cases.py)

import os
import uuid # For potentially generating unique filenames
import io # Keep this if needed elsewhere
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from werkzeug.exceptions import Forbidden # <-- ADDED/ENSURE THIS

# --- Ensure correct imports ---
from backend.extensions import db
from backend.models import Case, Document
# Assumes bp = Blueprint('api', __name__) is defined in api/__init__.py and imported here
from . import bp
# Import login required utilities
from flask_login import login_required, current_user # <-- ADDED/ENSURE THIS

# Import necessary service functions and exceptions
# Case service is needed to check ownership of the parent case
from backend.services.case_service import get_case_by_id, CaseNotFoundError, CaseServiceError
from backend.services.document_service import (
    get_documents_for_case, delete_document_record, create_document_and_extract_text,
    DocumentNotFoundError, DocumentServiceError
)
from backend.services.analysis_service import trigger_analysis_and_update, AnalysisServiceError, NoTextToAnalyzeError

# Remove unnecessary import if ValueError is standard
# from builtins import ValueError


# == Document Management Endpoints ==

@bp.route('/cases/<int:case_id>/documents', methods=['GET'])
@login_required # <-- ADDED
def get_case_documents(case_id):
    """Fetches all documents associated with a specific case, ensuring ownership."""
    print(f"--- Handling GET /api/cases/{case_id}/documents (AUTH REQUIRED by user {current_user.id}) ---")
    try:
        # --- MODIFIED: Check case ownership first ---
        case = get_case_by_id(case_id, user_id=current_user.id)
        # If this doesn't raise Forbidden or CaseNotFound, user owns the case

        # Call service to get documents for the confirmed case
        documents = get_documents_for_case(case.id) # Pass confirmed case_id

        # Format response
        docs_data = [{
            'id': doc.id,
            'file_name': doc.file_name, # Changed from filename for consistency maybe? Check model.
            'upload_date': doc.upload_date.isoformat() if doc.upload_date else None,
            # 'file_type': doc.file_type # Added file_type if it exists on model
        } for doc in documents]
        return jsonify(docs_data)

    # --- ADDED: Handle Forbidden from get_case_by_id ---
    except Forbidden as e:
        return jsonify({'error': str(e) or 'Permission denied to access case documents'}), 403
    except CaseNotFoundError as e: # Case not found is handled by get_case_by_id
        return jsonify({'error': str(e)}), 404
    except DocumentServiceError as e: # Error from get_documents_for_case
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling GET /api/cases/{case_id}/documents: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred'}), 500


@bp.route('/cases/<int:case_id>/documents', methods=['POST'])
@login_required # <-- ADDED
def upload_file_to_case(case_id):
    """Handles file upload, ensuring user owns the case."""
    print(f"--- Handling POST /api/cases/{case_id}/documents (AUTH REQUIRED by user {current_user.id}) ---")

    try:
        # --- MODIFIED: Check case ownership first ---
        case = get_case_by_id(case_id, user_id=current_user.id)
        # If this doesn't raise Forbidden or CaseNotFound, user owns the case

        if 'document' not in request.files: # Use 'document' based on your previous frontend code
            return jsonify({'error': 'No document file part in the request'}), 400
        file = request.files['document']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Call the service to handle file saving, DB record creation, text extraction
        new_doc = create_document_and_extract_text(case.id, file) # Use case.id from verified case

        # Format success response
        return jsonify({
            'message': f'File {new_doc.file_name} uploaded and processed successfully.',
            'document_id': new_doc.id,
            'file_name': new_doc.file_name
            }), 201

    # --- ADDED: Handle Forbidden from get_case_by_id ---
    except Forbidden as e:
        return jsonify({'error': str(e) or 'Permission denied to upload to this case'}), 403
    except CaseNotFoundError as e: # Case not found is handled by get_case_by_id
        return jsonify({'error': str(e)}), 404
    except ValueError as e: # Catch specific errors from service (e.g., invalid file type)
        return jsonify({'error': str(e)}), 400
    except DocumentServiceError as e: # Catch generic service errors
        return jsonify({'error': str(e)}), 500
    except Exception as e: # Catch unexpected errors
        current_app.logger.error(f"Unexpected error handling POST /api/cases/{case_id}/documents: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during file upload'}), 500


# === Document Deletion Route ===
# WARNING: Deleting by /documents/<id> is harder to secure properly.
# Recommend changing to /cases/<case_id>/documents/<document_id>
# Below is the attempt to secure the *existing* route, but it's less ideal.

@bp.route('/documents/<int:document_id>', methods=['DELETE'])
@login_required # <-- ADDED
def delete_single_document(document_id):
    """
    Deletes a specific document record (DB via service) and its file,
    checking ownership via the parent case.
    """
    print(f"--- Handling DELETE /api/documents/{document_id} (AUTH REQUIRED by user {current_user.id}) ---")

    file_path_to_remove = None
    try:
        # 1. Fetch the document record first
        doc_record = db.session.get(Document, document_id)
        if doc_record is None:
            raise DocumentNotFoundError(f"Document record {document_id} not found.")

        # 2. Get the associated Case ID and check ownership of THAT case
        case_id = doc_record.case_id
        if not case_id:
            # Should not happen if DB is consistent, but good check
            raise DocumentServiceError(f"Document {document_id} is not associated with a case.")

        # Use the case service to check ownership of the parent case
        get_case_by_id(case_id, user_id=current_user.id) # Raises Forbidden/NotFound if check fails

        # 3. If ownership confirmed, get file path *before* DB delete
        file_path_to_remove = doc_record.file_path

        # 4. Call service to delete DB record
        delete_document_record(document_id) # Assumes service just deletes, no auth check needed here now

        # --- File deletion logic ---
        file_deleted = False
        if file_path_to_remove and os.path.exists(file_path_to_remove):
            try:
                os.remove(file_path_to_remove)
                print(f"Deleted file: {file_path_to_remove}")
                file_deleted = True
            except OSError as e:
                print(f"Error deleting file {file_path_to_remove}: {e}") # Log error, continue
        else:
            print(f"File path not found or missing for deleted document record {document_id}")

        return jsonify({'message': f'Document {document_id} deleted successfully.' + (' File also deleted.' if file_deleted else ' File not found or deletion error.')}), 200

    except DocumentNotFoundError as e:
         return jsonify({'error': str(e)}), 404
    except CaseNotFoundError as e: # If the associated case was somehow deleted
         print(f"Error deleting document {document_id}: Associated case {case_id} not found.")
         return jsonify({'error': f'Associated case not found for document {document_id}'}), 404 # Or 500?
    except Forbidden as e: # User doesn't own the parent case
         return jsonify({'error': str(e) or 'Permission denied to delete this document'}), 403
    except DocumentServiceError as e: # Error during DB deletion
         return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling DELETE /api/documents/{document_id}: {e}", exc_info=True)
        # Consider rollback if service didn't already handle it
        # db.session.rollback()
        return jsonify({'error': 'An unexpected error occurred during deletion'}), 500


# == Analysis and Generation Related Routes ==

@bp.route('/documents/<int:document_id>/analyze', methods=['POST'])
@login_required # <-- ADDED
def trigger_document_analysis(document_id):
    """Triggers AI analysis for a specific document, checking ownership via parent case."""
    print(f"--- Handling POST /api/documents/{document_id}/analyze (AUTH REQUIRED by user {current_user.id}) ---")
    try:
        # --- ADDED: Fetch doc and check case ownership ---
        doc = db.session.get(Document, document_id)
        if doc is None:
             raise DocumentNotFoundError(f"Document {document_id} not found.")
        if not doc.case_id:
             raise DocumentServiceError(f"Document {document_id} is not associated with a case.")
        # Check ownership of the parent case
        get_case_by_id(doc.case_id, user_id=current_user.id) # Raises Forbidden/NotFound if check fails
        # --- END CHECK ---

        # Call the orchestration service (assuming it doesn't need user_id directly)
        analysis_result = trigger_analysis_and_update(document_id)

        # Return the analysis result on success
        return jsonify({
            'message': 'Analysis triggered successfully', # Changed message slightly
            'document_id': document_id,
            'analysis_result': analysis_result # Send back the result from the service
        }), 200

    except DocumentNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except CaseNotFoundError as e: # If the associated case was somehow deleted
         print(f"Error analyzing document {document_id}: Associated case {doc.case_id if 'doc' in locals() else 'unknown'} not found.")
         return jsonify({'error': f'Associated case not found for document {document_id}'}), 404
    except Forbidden as e: # User doesn't own the parent case
         return jsonify({'error': str(e) or 'Permission denied to analyze this document'}), 403
    except NoTextToAnalyzeError as e:
        return jsonify({'error': str(e)}), 400 # Bad request - cannot analyze
    except AnalysisServiceError as e:
        return jsonify({'error': str(e)}), 500 # Internal error during analysis
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling POST /api/documents/{document_id}/analyze: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during analysis trigger'}), 500


@bp.route('/cases/<int:case_id>/create-document', methods=['POST'])
@login_required # <-- ADDED
def trigger_document_creation(case_id):
    """Placeholder: Triggers AI document generation, checking case ownership."""
    print(f"--- Handling POST /api/cases/{case_id}/create-document (AUTH REQUIRED by user {current_user.id}) ---")
    try:
         # --- ADDED: Check case ownership first ---
         case = get_case_by_id(case_id, user_id=current_user.id)
         # If this doesn't raise Forbidden/NotFound, user owns the case
         # --- END CHECK ---

         data = request.get_json()
         doc_type = data.get('type')
         details = data.get('details') # Any extra context from frontend
         if not doc_type: return jsonify({'error': 'Document type is required'}), 400

         # --- Add AI Call Logic Here (or call service) ---
         print(f"Placeholder: Document creation would be triggered for case {case_id}, type: {doc_type}")
         # Example: generated_doc_path = generation_service.create(case, doc_type, details)
         return jsonify({'message': 'Document generation process initiated (placeholder)', 'case_id': case_id, 'type': doc_type})

    except CaseNotFoundError as e: return jsonify({'error': str(e)}), 404
    except Forbidden as e: return jsonify({'error': str(e) or 'Permission denied to generate document for this case'}), 403
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling POST /api/cases/{case_id}/create-document: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during document creation trigger'}), 500