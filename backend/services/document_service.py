# --- backend/services/document_service.py ---
from backend.models import Case, Document # Import models
from backend.extensions import db        # Import db instance
import os # May be needed if service handles file deletion later
import uuid
from werkzeug.utils import secure_filename
from flask import current_app # Needed for config access
# Make sure utils path is correct relative to services/
from backend.utils.document_parser import extract_text_from_pdf, extract_text_from_docx
from flask_login import current_user # <--- ADD THIS IMPORT
from backend.services.case_service import CaseNotFoundError # <--- Consider adding if needed

# --- Define Exceptions ---
class DocumentServiceError(Exception):
    """Base exception for errors in the Document service."""
    pass

class DocumentNotFoundError(DocumentServiceError):
    """Raised when a specific document is not found."""
    pass

# --- Service Functions ---
def get_documents_for_case(case_id):
    """
    Fetches all documents associated with a specific case.
    Args:
        case_id (int): The ID of the case.
    Returns:
        list[Document]: A list of Document objects.
    Raises:
        DocumentServiceError: For database errors.
        # Note: Doesn't raise CaseNotFoundError, assumes case existence check happens before call
    """
    # --- ADD Authorization Check ---
    case = Case.query.filter_by(id=case_id, user_id=current_user.id).first()
    if case is None:
         # Case not found or doesn't belong to the user
         print(f"AUTH ERROR: User {current_user.id} tried to access documents for case {case_id} they don't own.")
         raise AuthorizationError(f"Case with ID {case_id} not found or access denied.")
    # --- END Authorization Check ---

    try:
        # If authorization passed, fetch the documents for that case
        documents = Document.query.filter_by(case_id=case_id).order_by(Document.upload_date.desc()).all()
        return documents
    except Exception as e:
        print(f"Error fetching documents for case {case_id} (owned by user {current_user.id}): {e}")
        raise DocumentServiceError(f"Failed to fetch documents for case {case_id}") from e

def delete_document_record(document_id):
    """
    Deletes a document record from the database.
    Args:
        document_id (int): The ID of the document record to delete.
    Returns:
        bool: True if deletion successful.
    Raises:
        DocumentNotFoundError: If the document record is not found.
        DocumentServiceError: For database errors.
    """
    doc_to_delete = db.session.get(Document, document_id)
    if doc_to_delete is None:
        raise DocumentNotFoundError(f"Document record with ID {document_id} not found.")

    try:
        # --- Store file path BEFORE deleting record ---
        file_path_to_delete = doc_to_delete.file_path
        # --- END Store ---

        db.session.delete(doc_to_delete)
        db.session.commit()
        print(f"Document record deleted from DB via service by User {current_user.id}: {document_id}")

        # --- ADD File Deletion AFTER DB commit ---
        if file_path_to_delete and os.path.exists(file_path_to_delete):
             try:
                  os.remove(file_path_to_delete)
                  print(f"Associated file deleted from disk: {file_path_to_delete}")
             except OSError as e:
                  # Log error but don't fail the operation just because file deletion failed
                  print(f"Error deleting file {file_path_to_delete} after DB record deletion: {e}")
        # --- END File Deletion ---

        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting document record {document_id} via service by User {current_user.id}: {e}")
        raise DocumentServiceError(f"Failed to delete document record {document_id}") from e

def create_document_and_extract_text(case_id, file_storage):
    """
    Handles saving uploaded file, creating DB record, extracting text,
    and updating the record, ensuring user owns the target case.
    Args:
        case_id (int): The ID of the case to associate with.
        file_storage (FileStorage): The file object from the request.
    Returns:
        Document: The newly created and potentially updated Document object.
    Raises:
        ValueError: file_storage is invalid.
        AuthorizationError: If the target case does not belong to the current user.
        DocumentServiceError: For errors during file saving, DB operations, or text extraction.
    """
    if not file_storage or not file_storage.filename:
        raise ValueError("Invalid file storage object provided.")

    # --- ADD Authorization Check ---
    case = Case.query.filter_by(id=case_id, user_id=current_user.id).first()
    if case is None:
         # Case not found or doesn't belong to the user
         print(f"AUTH ERROR: User {current_user.id} tried to upload document to case {case_id} they don't own.")
         raise AuthorizationError(f"Case with ID {case_id} not found or access denied.")
    # --- END Authorization Check ---

    filename = secure_filename(file_storage.filename)
    # Consider unique filename generation (e.g., using UUID)
    unique_filename = f"{uuid.uuid4()}_{filename}"


    # Determine save path using app config via current_app
    upload_folder = current_app.config['UPLOAD_FOLDER']
    # Use the unique filename for saving
    # Ensure case_upload_folder uses case_id confirmed to belong to user
    case_upload_folder = os.path.join(upload_folder, str(case.id)) # Use case.id from fetched case
    os.makedirs(case_upload_folder, exist_ok=True)
    file_path = os.path.join(case_upload_folder, unique_filename)

    # 1. Save the file
    try:
        file_storage.save(file_path)
        print(f"File saved via service by User {current_user.id} to: {file_path}")
    except Exception as e:
        print(f"Error saving file {unique_filename} via service by User {current_user.id}: {e}")
        raise DocumentServiceError(f"Failed to save file {unique_filename} on server") from e

    # 2. Create initial DB record (use unique_filename and case.id)
    new_doc = Document(case_id=case.id, file_name=filename, file_path=file_path) # Store original filename, save unique path
    #
    try:
        db.session.add(new_doc)
        db.session.commit()
        doc_id = new_doc.id # Get the ID after commit
        print(f"Document record created via service with ID: {doc_id}")
    except Exception as e:
        db.session.rollback()
        print(f"Error saving document record to DB via service: {e}")
        # Clean up the file we just saved if DB record fails
        if os.path.exists(file_path):
             try: os.remove(file_path)
             except OSError: pass
        raise DocumentServiceError("Failed to save document record to database") from e

    # 3. Extract text (Best effort)
    extracted_text = None
    try:
        print(f"Attempting to parse file via service: {filename}")
        if filename.lower().endswith('.pdf'):
            extracted_text = extract_text_from_pdf(file_path)
        elif filename.lower().endswith('.docx'):
            extracted_text = extract_text_from_docx(file_path)
        # Add other parsers if needed
    except Exception as e:
         # Log error but don't necessarily fail the whole operation
         print(f"Error extracting text from {filename} (ID: {doc_id}) via service: {e}")
         # Optionally raise DocumentServiceError here if extraction is critical

    # 4. Update DB record with extracted text (if successful)
    if extracted_text is not None:
        # Refetch the document record to ensure we have the latest state
        # (Could also use the 'new_doc' object if session state is reliable)
        doc_to_update = db.session.get(Document, doc_id)
        if doc_to_update:
            try:
                doc_to_update.extracted_text = extracted_text
                db.session.commit()
                print(f"Extracted text saved to DB via service for document ID: {doc_id}")
                # Return the updated object
                return doc_to_update
            except Exception as e:
                db.session.rollback()
                # Log error but maybe return the object without text? Or raise?
                print(f"Error saving extracted text to DB for doc ID {doc_id} via service: {e}")
                raise DocumentServiceError("Failed to save extracted text to database record") from e
        else:
             # This shouldn't happen if initial commit succeeded
             print(f"Consistency Error: Could not refetch doc ID {doc_id} to save text.")
             raise DocumentServiceError("Failed to find document record after creation to save text.")
    else:
        print(f"No text extracted or file type not supported for document ID via service: {doc_id}")
        # Return the object without the extracted text updated
        return new_doc

# --- backend/services/document_service.py ---
# ... (keep existing imports, exceptions, functions) ...

# --- ADD THESE FUNCTIONS ---
def get_document_by_id(document_id):
    doc = Document.query.join(Case, Document.case_id == Case.id)\
                            .filter(Document.id == document_id, Case.user_id == current_user.id)\
                            .first() # Fetch the first result

    if doc is None:
        # Document not found OR it belongs to a case the user doesn't own
        print(f"AUTH ERROR/NOT FOUND: User {current_user.id} failed to get document ID {document_id}.")
        raise DocumentNotFoundError(f"Document record with ID {document_id} not found or access denied.")
    return doc

def update_document_analysis(document_id, analysis_result):
    """
    Updates the analysis_json field of a document, ensuring user ownership first.
    Args:
         document_id (int): ID of the document to update.
         analysis_result (dict): The JSON analysis data.
    Returns:
         Document: The updated document object.
    Raises:
         DocumentNotFoundError: If doc not found or user not authorized.
            DocumentServiceError: For database errors.
        """
        # --- Use modified get_document_by_id for authorization ---
    doc = get_document_by_id(document_id)
        # If the line above didn't raise DocumentNotFoundError, the user is authorized
    try:
        doc.analysis_json = analysis_result
        # Optionally update status fields etc.
        db.session.commit()
        print(f"Analysis results saved to DB via service by User {current_user.id} for document ID: {document_id}")
        return doc
    except Exception as e:
        db.session.rollback()
        print(f"Error saving analysis results for doc ID {document_id} via service by User {current_user.id}: {e}")
        raise DocumentServiceError("Failed to save analysis results to database") from e
    # --- Add create/process function later ---