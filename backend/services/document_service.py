# --- backend/services/document_service.py ---
from backend.models import Case, Document
from backend.extensions import db
import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app
from backend.utils.document_parser import extract_text_from_pdf, extract_text_from_docx
from flask_login import current_user
from backend.services.case_service import CaseNotFoundError
# Import our new security module
from backend.utils.file_security import (
    process_and_validate_file, 
    FileSecurityError, 
    FileSizeExceededError, 
    FileTypeNotAllowedError,
    file_security_logger
)

# --- Define Exceptions ---
class DocumentServiceError(Exception):
    """Base exception for errors in the Document service."""
    pass

class DocumentNotFoundError(DocumentServiceError):
    """Raised when a specific document is not found."""
    pass

class AuthorizationError(DocumentServiceError):
    """Raised when user is not authorized to access a resource."""
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
        AuthorizationError: If user doesn't own the case.
    """
    # --- Authorization Check ---
    case = Case.query.filter_by(id=case_id, user_id=current_user.id).first()
    if case is None:
         # Case not found or doesn't belong to the user
         file_security_logger.warning(f"AUTH ERROR: User {current_user.id} tried to access documents for case {case_id} they don't own.")
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
    Deletes a document record from the database and securely deletes the file.
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
        file_security_logger.info(f"Document record deleted from DB via service by User {current_user.id}: {document_id}")

        # --- SECURE File Deletion AFTER DB commit ---
        if file_path_to_delete and os.path.exists(file_path_to_delete):
             try:
                  # Use secure deletion instead of standard os.remove
                  from backend.utils.secure_deletion import secure_delete_file
                  secure_delete_result = secure_delete_file(file_path_to_delete)
                  
                  if secure_delete_result:
                      file_security_logger.info(f"Associated file SECURELY deleted from disk: {file_path_to_delete}")
                  else:
                      file_security_logger.error(f"Secure deletion failed for file {file_path_to_delete}")
             except Exception as e:
                  # Log error but don't fail the operation just because file deletion failed
                  file_security_logger.error(f"Error during secure deletion of file {file_path_to_delete}: {e}")
        # --- END Secure File Deletion ---

        return True
    except Exception as e:
        db.session.rollback()
        file_security_logger.error(f"Error deleting document record {document_id} via service by User {current_user.id}: {e}")
        raise DocumentServiceError(f"Failed to delete document record {document_id}") from e

def create_document_and_extract_text(case_id, file_storage):
    """
    Handles saving uploaded file, creating DB record, extracting text,
    and updating the record, ensuring user owns the target case.
    Files are encrypted after text extraction.
    """
    if not file_storage or not file_storage.filename:
        raise ValueError("Invalid file storage object provided.")

    # --- Authorization Check ---
    case = Case.query.filter_by(id=case_id, user_id=current_user.id).first()
    if case is None:
         # Case not found or doesn't belong to the user
         file_security_logger.warning(f"AUTH ERROR: User {current_user.id} tried to upload document to case {case_id} they don't own.")
         raise AuthorizationError(f"Case with ID {case_id} not found or access denied.")
    # --- END Authorization Check ---

    try:
        # Process and validate the file using our security module
        file_path, clean_filename, mime_type = process_and_validate_file(file_storage, case.id)
        
        # Save the file
        try:
            file_storage.save(file_path)
            file_security_logger.info(f"File saved securely via service by User {current_user.id} to: {file_path}")
        except Exception as e:
            file_security_logger.error(f"Error saving file {clean_filename} via service by User {current_user.id}: {e}")
            raise DocumentServiceError(f"Failed to save file {clean_filename} on server") from e
    
        # Create initial DB record
        new_doc = Document(
            case_id=case.id, 
            file_name=clean_filename, 
            file_path=file_path,
            # Optionally store the mime_type if your model supports it
        )
        
        try:
            db.session.add(new_doc)
            db.session.commit()
            doc_id = new_doc.id # Get the ID after commit
            file_security_logger.info(f"Document record created via service with ID: {doc_id}")
        except Exception as e:
            db.session.rollback()
            file_security_logger.error(f"Error saving document record to DB via service: {e}")
            # Clean up the file we just saved if DB record fails
            if os.path.exists(file_path):
                 try: os.remove(file_path)
                 except OSError: pass
            raise DocumentServiceError("Failed to save document record to database") from e
    
        # Extract text (Best effort) - BEFORE encryption
        extracted_text = None
        try:
            file_security_logger.info(f"Attempting to parse file via service: {clean_filename}")
            if mime_type == 'application/pdf':
                extracted_text = extract_text_from_pdf(file_path)
            elif mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mime_type == 'application/msword':
                extracted_text = extract_text_from_docx(file_path)
            # Add other parsers if needed
        except Exception as e:
             # Log error but don't necessarily fail the whole operation
             file_security_logger.error(f"Error extracting text from {clean_filename} (ID: {doc_id}) via service: {e}")
             # Optionally raise DocumentServiceError here if extraction is critical
        
        # NOW ENCRYPT THE FILE - after text extraction
        try:
            from backend.utils.file_encryption import file_encryptor
            # Create temp file for backup in case encryption fails
            temp_backup = file_path + ".bak"
            import shutil
            shutil.copy2(file_path, temp_backup)
            
            # Encrypt in place
            file_encryptor.encrypt_file(file_path)
            
            # Remove backup if successful
            os.remove(temp_backup)
            file_security_logger.info(f"File encrypted successfully: {file_path}")
        except Exception as e:
            # Restore from backup if encryption fails
            if os.path.exists(temp_backup):
                shutil.copy2(temp_backup, file_path)
                os.remove(temp_backup)
            file_security_logger.error(f"Error encrypting file {file_path}: {e}")
            # Continue without encryption rather than failing the upload
    
        # Update DB record with extracted text (if successful)
        if extracted_text is not None:
            # Refetch the document record to ensure we have the latest state
            doc_to_update = db.session.get(Document, doc_id)
            if doc_to_update:
                try:
                    doc_to_update.extracted_text = extracted_text
                    db.session.commit()
                    file_security_logger.info(f"Extracted text saved to DB via service for document ID: {doc_id}")
                    # Return the updated object
                    return doc_to_update
                except Exception as e:
                    db.session.rollback()
                    # Log error but maybe return the object without text? Or raise?
                    file_security_logger.error(f"Error saving extracted text to DB for doc ID {doc_id} via service: {e}")
                    raise DocumentServiceError("Failed to save extracted text to database record") from e
            else:
                 # This shouldn't happen if initial commit succeeded
                 file_security_logger.error(f"Consistency Error: Could not refetch doc ID {doc_id} to save text.")
                 raise DocumentServiceError("Failed to find document record after creation to save text.")
        else:
            file_security_logger.info(f"No text extracted or file type not supported for document ID via service: {doc_id}")
            # Return the object without the extracted text updated
            return new_doc
    except (FileSizeExceededError, FileTypeNotAllowedError, FileSecurityError) as e:
        # Let security exceptions propagate up to the API
        raise
    except Exception as e:
        # Generic error handling
        file_security_logger.error(f"Unexpected error in document creation: {e}")
        raise DocumentServiceError(f"Unexpected error: {str(e)}") from e
        

# Remaining functions...
def get_document_by_id(document_id):
    doc = Document.query.join(Case, Document.case_id == Case.id)\
                            .filter(Document.id == document_id, Case.user_id == current_user.id)\
                            .first() # Fetch the first result

    if doc is None:
        # Document not found OR it belongs to a case the user doesn't own
        file_security_logger.warning(f"AUTH ERROR/NOT FOUND: User {current_user.id} failed to get document ID {document_id}.")
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
        file_security_logger.info(f"Analysis results saved to DB via service by User {current_user.id} for document ID: {document_id}")
        return doc
    except Exception as e:
        db.session.rollback()
        file_security_logger.error(f"Error saving analysis results for doc ID {document_id} via service by User {current_user.id}: {e}")
        raise DocumentServiceError("Failed to save analysis results to database") from e