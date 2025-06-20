# --- backend/api/documents.py ---
import os
import uuid
import io
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from werkzeug.exceptions import Forbidden
from marshmallow import ValidationError # <<< Import ValidationError
from backend.utils.rate_limiter import limiter

# --- Ensure correct imports ---
from backend.extensions import db
from backend.models import Case, Document
from . import bp # Import the blueprint instance from api/__init__.py
from flask_login import login_required, current_user

# ---### START CHANGE: Import Schemas ###---
from backend.schemas import document_schema, documents_schema # <<< Import schemas
# ---### END CHANGE ###---

# Import necessary service functions and exceptions
from backend.services.case_service import get_case_by_id, CaseNotFoundError, CaseServiceError
from backend.services.document_service import (
    get_documents_for_case, delete_document_record, create_document_and_extract_text,
    DocumentNotFoundError, DocumentServiceError, AuthorizationError
)
from backend.services.analysis_service import trigger_analysis_and_update, AnalysisServiceError, NoTextToAnalyzeError

from backend.utils.file_security import (
    FileSecurityError,
    FileSizeExceededError,
    FileTypeNotAllowedError
)

# == Document Management Endpoints ==

@bp.route('/cases/<int:case_id>/documents', methods=['GET'])
@login_required
def get_case_documents(case_id):
    """Fetches all documents associated with a specific case, ensuring ownership."""
    print(f"--- Handling GET /api/cases/{case_id}/documents (AUTH REQUIRED by user {current_user.id}) ---")
    try:
        # Check case ownership first
        case = get_case_by_id(case_id, user_id=current_user.id)

        # Call service to get documents for the confirmed case
        # Assuming get_documents_for_case returns a list of Document objects
        documents = get_documents_for_case(case.id)

        # ---### START CHANGE: Use Marshmallow Schema for Serialization ###---
        # Serialize the list of document objects using the pre-instantiated schema
        result = documents_schema.dump(documents)
        return jsonify(result)
        # ---### END CHANGE ###---

    except Forbidden as e:
        return jsonify({'error': str(e) or 'Permission denied to access case documents'}), 403
    except AuthorizationError as e:
        return jsonify({'error': str(e) or 'Permission denied to access case documents'}), 403
    except CaseNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except DocumentServiceError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling GET /api/cases/{case_id}/documents: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred'}), 500


@bp.route('/cases/<int:case_id>/documents', methods=['POST'])
@login_required
@limiter.limit("10 per minute, 100 per hour")  # Add this line
def upload_file_to_case(case_id):
    """Handles file upload, ensuring user owns the case."""
    print(f"--- Handling POST /api/cases/{case_id}/documents (AUTH REQUIRED by user {current_user.id}) ---")

    try:
        # Check case ownership first
        case = get_case_by_id(case_id, user_id=current_user.id)

        if 'document' not in request.files:
            return jsonify({'error': 'No document file part in the request'}), 400
        file = request.files['document']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Call the service to handle file saving, DB record creation, text extraction
        # Assumes this service returns the newly created Document ORM object
        new_doc_object = create_document_and_extract_text(case.id, file)

        # Use Marshmallow Schema for Response
        result = document_schema.dump(new_doc_object)
        # Combine with a success message
        response_data = {
             'message': f'File {result.get("file_name", "unknown")} uploaded and processed successfully.',
             'document': result # Embed the serialized document data
        }
        return jsonify(response_data), 201 # 201 Created

    except Forbidden as e:
        return jsonify({'error': str(e) or 'Permission denied to upload to this case'}), 403
    except AuthorizationError as e:
        return jsonify({'error': str(e) or 'Permission denied to upload to this case'}), 403
    except CaseNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e: # Catch specific errors from service
        return jsonify({'error': str(e)}), 400
    except FileSizeExceededError as e: # Handle file size errors
        return jsonify({'error': f'File too large: {str(e)}'}), 400
    except FileTypeNotAllowedError as e: # Handle file type errors
        return jsonify({'error': f'File type not allowed: {str(e)}'}), 400
    except FileSecurityError as e: # Handle other security errors
        return jsonify({'error': f'File security error: {str(e)}'}), 400
    except DocumentServiceError as e: # Catch generic service errors
        return jsonify({'error': str(e)}), 500
    except Exception as e: # Catch unexpected errors
        current_app.logger.error(f"Unexpected error handling POST /api/cases/{case_id}/documents: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during file upload'}), 500


# === Document Deletion Route ===
# (Keeping existing logic, no schema serialization needed for response)
@bp.route('/documents/<int:document_id>', methods=['DELETE'])
@login_required
def delete_single_document(document_id):
    """
    Deletes a specific document record (DB via service) and its file,
    checking ownership via the parent case.
    """
    print(f"--- Handling DELETE /api/documents/{document_id} (AUTH REQUIRED by user {current_user.id}) ---")

    file_path_to_remove = None
    doc_file_name = f"ID {document_id}" # Fallback name
    try:
        # 1. Fetch the document record first
        doc_record = db.session.get(Document, document_id)
        if doc_record is None:
            raise DocumentNotFoundError(f"Document record {document_id} not found.")
        doc_file_name = doc_record.file_name # Get actual name for messages

        # 2. Get the associated Case ID and check ownership of THAT case
        case_id = doc_record.case_id
        if not case_id:
            raise DocumentServiceError(f"Document {document_id} ({doc_file_name}) is not associated with a case.")
        # Use the case service to check ownership of the parent case
        get_case_by_id(case_id, user_id=current_user.id) # Raises Forbidden/NotFound if check fails

        # 3. If ownership confirmed, get file path *before* DB delete
        file_path_to_remove = doc_record.file_path

        # 4. Call service to delete DB record
        # Assuming delete_document_record just needs the ID now
        delete_document_record(document_id)

        # --- File deletion logic ---
        file_deleted = False
        delete_error_msg = ""
        if file_path_to_remove and os.path.exists(file_path_to_remove):
            try:
                os.remove(file_path_to_remove)
                print(f"Deleted file: {file_path_to_remove}")
                file_deleted = True
            except OSError as e:
                print(f"Error deleting file {file_path_to_remove}: {e}") # Log error, continue
                delete_error_msg = " Error deleting associated file."
        elif file_path_to_remove:
            print(f"File path not found or missing for deleted document record {document_id}")
            delete_error_msg = " Associated file not found on disk."
        else:
             print(f"No file path stored for document record {document_id}")
             delete_error_msg = " No associated file path found."


        return jsonify({'message': f'Document "{doc_file_name}" deleted successfully.' + delete_error_msg}), 200

    except DocumentNotFoundError as e: return jsonify({'error': str(e)}), 404
    except CaseNotFoundError as e:
        print(f"Error deleting document {document_id}: Associated case {case_id if 'case_id' in locals() else 'unknown'} not found.")
        return jsonify({'error': f'Associated case not found for document {document_id}'}), 404
    except Forbidden as e: return jsonify({'error': str(e) or 'Permission denied to delete this document'}), 403
    except DocumentServiceError as e: return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling DELETE /api/documents/{document_id}: {e}", exc_info=True)
        # db.session.rollback() # Consider rollback
        return jsonify({'error': 'An unexpected error occurred during deletion'}), 500


# == Analysis and Generation Related Routes ==

# (Keep existing logic, no schema changes needed for this response structure yet)
@bp.route('/documents/<int:document_id>/analyze', methods=['POST'])
@login_required
def trigger_document_analysis(document_id):
    """Triggers AI analysis for a specific document, checking ownership via parent case."""
    print(f"--- Handling POST /api/documents/{document_id}/analyze (AUTH REQUIRED by user {current_user.id}) ---")
    doc = None # Initialize doc
    try:
        # Fetch doc and check case ownership
        doc = db.session.get(Document, document_id)
        if doc is None: raise DocumentNotFoundError(f"Document {document_id} not found.")
        if not doc.case_id: raise DocumentServiceError(f"Document {document_id} is not associated with a case.")
        get_case_by_id(doc.case_id, user_id=current_user.id) # Check ownership

        # Call the orchestration service
        analysis_result = trigger_analysis_and_update(document_id)

        # Return the analysis result on success
        return jsonify({
            'message': 'Analysis triggered and completed successfully', # Updated message
            'document_id': document_id,
            'analysis_result': analysis_result # Send back the result from the service
        }), 200

    except DocumentNotFoundError as e: return jsonify({'error': str(e)}), 404
    except CaseNotFoundError as e:
        print(f"Error analyzing document {document_id}: Associated case {doc.case_id if doc else 'unknown'} not found.")
        return jsonify({'error': f'Associated case not found for document {document_id}'}), 404
    except Forbidden as e: return jsonify({'error': str(e) or 'Permission denied to analyze this document'}), 403
    except NoTextToAnalyzeError as e: return jsonify({'error': str(e)}), 400
    except AnalysisServiceError as e: return jsonify({'error': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling POST /api/documents/{document_id}/analyze: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during analysis trigger'}), 500


# (Keep existing logic, no schema changes needed for this placeholder yet)
# Consider adding input validation schema later when implemented
@bp.route('/cases/<int:case_id>/create-document', methods=['POST'])
@login_required
def trigger_document_creation(case_id):
    """Placeholder: Triggers AI document generation, checking case ownership."""
    print(f"--- Handling POST /api/cases/{case_id}/create-document (AUTH REQUIRED by user {current_user.id}) ---")
    try:
        # Check case ownership first
        case = get_case_by_id(case_id, user_id=current_user.id)

        data = request.get_json()
        # --- TODO: Add Input Validation using a Marshmallow Schema later ---
        # try:
        #     validated_data = CreateDocumentInputSchema().load(data)
        # except ValidationError as err:
        #     return jsonify({'error': 'Validation failed', 'messages': err.messages}), 400
        # doc_type = validated_data.get('type')
        # details = validated_data.get('details')
        # --- End TODO ---

        doc_type = data.get('type') # Temporary direct access
        details = data.get('details') # Temporary direct access
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

@bp.route('/documents/<int:document_id>/download', methods=['GET'])
@login_required
@limiter.limit("30 per minute, 200 per hour")  # Add this line
def download_document(document_id):
    """
    Download a document file, with ownership verification and decryption.
    """
    print(f"--- Handling GET /api/documents/{document_id}/download (AUTH REQUIRED by user {current_user.id}) ---")
    
    try:
        # Fetch document record and verify ownership
        doc = db.session.get(Document, document_id)
        if doc is None:
            raise DocumentNotFoundError(f"Document {document_id} not found.")
            
        # Get case ID and verify ownership
        case_id = doc.case_id
        if not case_id:
            raise DocumentServiceError(f"Document {document_id} is not associated with a case.")
            
        # Check ownership of parent case
        get_case_by_id(case_id, user_id=current_user.id)
        
        # Check if file exists
        if not doc.file_path or not os.path.exists(doc.file_path):
            return jsonify({'error': 'Document file not found on server'}), 404
            
        # Decrypt the file to a temporary location or to memory
        from backend.utils.file_encryption import file_encryptor
        
        try:
            # Decrypt to memory
            decrypted_data = file_encryptor.decrypt_file(doc.file_path)
            
            # Create in-memory file-like object
            file_stream = io.BytesIO(decrypted_data)
            file_stream.seek(0)
            
            # Get file extension for MIME type
            file_ext = os.path.splitext(doc.file_name)[1].lower()
            mime_type = None
            
            # Set MIME type based on extension
            if file_ext == '.pdf':
                mime_type = 'application/pdf'
            elif file_ext == '.docx':
                mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            elif file_ext == '.doc':
                mime_type = 'application/msword'
            elif file_ext == '.txt':
                mime_type = 'text/plain'
            else:
                mime_type = 'application/octet-stream'
                
            # Log access for audit purposes
            print(f"User {current_user.id} downloading document {document_id}: {doc.file_name}")
            
            # Return the file
            return send_file(
                file_stream,
                mimetype=mime_type,
                as_attachment=True,
                download_name=doc.file_name
            )
            
        except Exception as e:
            print(f"Error decrypting file for download: {e}")
            return jsonify({'error': 'Error decrypting document for download'}), 500
            
    except DocumentNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except CaseNotFoundError as e:
        return jsonify({'error': f'Associated case not found for document {document_id}'}), 404
    except Forbidden as e:
        return jsonify({'error': str(e) or 'Permission denied to download this document'}), 403
    except Exception as e:
        current_app.logger.error(f"Unexpected error handling GET /api/documents/{document_id}/download: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during document download'}), 500