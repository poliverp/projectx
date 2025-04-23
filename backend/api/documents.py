# --- backend/api/documents.py ---
import os
import uuid # For potentially generating unique filenames
from flask import request, jsonify, current_app # Import current_app
from werkzeug.utils import secure_filename
from backend.extensions import db
from backend.models import Case, Document
# Make sure this path is correct relative to the api folder
from backend.utils.document_parser import extract_text_from_pdf, extract_text_from_docx
from . import bp # Import the blueprint
from backend.services.document_service import (
    get_documents_for_case, delete_document_record, create_document_and_extract_text, # Add create
    DocumentNotFoundError, DocumentServiceError
)
from backend.services.analysis_service import trigger_analysis_and_update, AnalysisServiceError, NoTextToAnalyzeError

# Add ValueError to handle service exceptions
from builtins import ValueError
# ... other imports ...
# == Document Management Endpoints ==

@bp.route('/cases/<int:case_id>/documents', methods=['GET'])
def get_case_documents(case_id):
    """Fetches all documents associated with a specific case using service."""
    print(f"--- Handling GET /api/cases/{case_id}/documents (Blueprint) ---")
    # Optional: Check case existence first (or assume service call is sufficient if it joins)
    target_case = db.session.get(Case, case_id) # Keep check for now
    if not target_case:
        return jsonify({'error': 'Case not found'}), 404

    try:
        # Call service
        documents = get_documents_for_case(case_id)
        # Format response in route
        docs_data = [{
            'id': doc.id,
            'file_name': doc.file_name,
            'upload_date': doc.upload_date.isoformat() if doc.upload_date else None,
        } for doc in documents]
        return jsonify(docs_data)
    except DocumentServiceError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
         print(f"Unexpected error handling GET /api/cases/{case_id}/documents: {e}")
         return jsonify({'error': 'An unexpected error occurred'}), 500


@bp.route('/cases/<int:case_id>/documents', methods=['POST'])
def upload_file_to_case(case_id):
    """Handles file upload using the document service."""
    print(f"--- Handling POST /api/cases/{case_id}/documents (Blueprint) ---")
    target_case = db.session.get(Case, case_id) # Keep case check here
    if not target_case:
        return jsonify({'error': 'Case not found'}), 404

    if 'document' not in request.files:
        return jsonify({'error': 'No document file part in the request'}), 400

    file = request.files['document']
    # options_str = request.form.get('options', '{}') # Keep if needed for service

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Call the service to handle everything
        new_doc = create_document_and_extract_text(case_id, file)

        # Format success response
        return jsonify({
            'message': f'File {new_doc.file_name} uploaded and processed successfully.',
            'document_id': new_doc.id,
            'file_name': new_doc.file_name
            }), 201

    except ValueError as e: # Catch specific errors from service
        return jsonify({'error': str(e)}), 400
    except DocumentServiceError as e: # Catch generic service errors
         return jsonify({'error': str(e)}), 500
    except Exception as e: # Catch unexpected errors
         print(f"Unexpected error handling POST /api/cases/{case_id}/documents: {e}")
         return jsonify({'error': 'An unexpected error occurred during file upload'}), 500


@bp.route('/documents/<int:document_id>', methods=['DELETE'])
def delete_single_document(document_id):
    """Deletes a specific document record (DB via service) and its file."""
    print(f"--- Handling DELETE /api/documents/{document_id} (Blueprint) ---")

    # Need file path before DB delete. Fetch record info first.
    try:
        # Maybe add a get_document_by_id service function? For now, query directly.
        doc_record = db.session.get(Document, document_id)
        if doc_record is None:
             raise DocumentNotFoundError(f"Document record {document_id} not found.")
        file_path_to_remove = doc_record.file_path # Get path before potential deletion
    except DocumentNotFoundError as e:
         return jsonify({'error': str(e)}), 404
    except Exception as e:
         print(f"Error fetching document info for delete {document_id}: {e}")
         return jsonify({'error': 'Failed to retrieve document info for deletion'}), 500

    try:
        # Call service to delete DB record
        delete_document_record(document_id)

        # --- File deletion logic remains in the route ---
        if file_path_to_remove and os.path.exists(file_path_to_remove):
            try:
                os.remove(file_path_to_remove)
                print(f"Deleted file: {file_path_to_remove}")
            except OSError as e:
                print(f"Error deleting file {file_path_to_remove}: {e}") # Log error, continue
        else:
             print(f"File path not found or missing for deleted document record {document_id}")

        return jsonify({'message': f'Document {document_id} deleted successfully'}), 200

    except DocumentNotFoundError as e: # Should be caught above, but for safety
        return jsonify({'error': str(e)}), 404
    except DocumentServiceError as e: # Error during DB deletion
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"Unexpected error handling DELETE /api/documents/{document_id}: {e}")
        return jsonify({'error': 'An unexpected error occurred during deletion'}), 500

# Keep placeholders for now


# == Placeholder & Related Action Routes ==

@bp.route('/documents/<int:document_id>/analyze', methods=['POST'])
def trigger_document_analysis(document_id):
    """Triggers AI analysis for a specific document via analysis service."""
    print(f"--- Handling POST /api/documents/{document_id}/analyze (Blueprint) ---")
    try:
        # Call the orchestration service
        analysis_result = trigger_analysis_and_update(document_id)

        # Return the analysis result on success
        return jsonify({
            'message': 'Analysis successful (simulated)',
            'document_id': document_id,
            'analysis_result': analysis_result # Send back the result from the service
        }), 200

    except DocumentNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except NoTextToAnalyzeError as e:
        return jsonify({'error': str(e)}), 400 # Bad request - cannot analyze
    except AnalysisServiceError as e:
        return jsonify({'error': str(e)}), 500 # Internal error during analysis
    except Exception as e:
        print(f"Unexpected error handling POST /api/documents/{document_id}/analyze: {e}")
        return jsonify({'error': 'An unexpected error occurred during analysis trigger'}), 500

@bp.route('/cases/<int:case_id>/create-document', methods=['POST'])
def trigger_document_creation(case_id):
    """Placeholder: Triggers AI document generation for a case."""
    print(f"--- Handling POST /api/cases/{case_id}/create-document (Blueprint) ---")
    case = db.session.get(Case, case_id)
    if case is None:
         return jsonify({'error': 'Case not found'}), 404

    data = request.get_json()
    doc_type = data.get('type')
    details = data.get('details') # Any extra context from frontend
    if not doc_type: return jsonify({'error': 'Document type is required'}), 400

    # --- Add AI Call Logic Here ---
    # This logic should likely be moved to a document_generation_service.py later
    print(f"Placeholder: Document creation would be triggered for case {case_id}, type: {doc_type}")
    # Example: generated_doc_path = generation_service.create(case, doc_type, details)
    # Example: Maybe create a new Document record for the generated file?
    return jsonify({'message': 'Document generation process initiated (placeholder)', 'case_id': case_id, 'type': doc_type})