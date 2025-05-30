# --- backend/services/case_service.py ---
import os
from backend.models import Case, Document, User # Import relevant models
from backend.extensions import db # Import the db instance
from flask_login import current_user # Import current_user to check ownership (though functions receive user_id explicitly)
from werkzeug.exceptions import Forbidden # Import Forbidden for authorization errors
from sqlalchemy.exc import IntegrityError # To catch potential unique constraint errors
from sqlalchemy import inspect # <<< Import inspect to read model columns
from sqlalchemy.orm.attributes import flag_modified # <<< Import to mark JSON as modified


# --- Custom Exceptions ---
class CaseServiceError(Exception):
    """Base exception for errors in the Case service."""
    pass

class CaseNotFoundError(CaseServiceError):
    """Raised when a specific case is not found."""
    pass

class DuplicateCaseError(CaseServiceError):
    """Raised when trying to create a case with a duplicate display name (potentially per user)."""
    pass

# --- Service Functions ---

def create_case(data, user_id):
    """
    Creates a new case in the database, associated with a specific user,
    relying on the Case model definition for fields.
    Args:
        data (dict): Dictionary containing case attributes. Must include 'display_name'.
        user_id (int): The ID of the user creating the case.
    Returns:
        Case: The newly created Case object.
    Raises:
        ValueError: If required data (display_name) is missing.
        DuplicateCaseError: If a case with the same display_name already exists *for this user*.
        CaseServiceError: For other database errors.
    """
    display_name = data.get('display_name')
    if not display_name:
        raise ValueError("Display name is required to create a case.")
    display_name = display_name.strip()
    if not display_name: # Also check after stripping
         raise ValueError("Display name cannot be empty.")

    # Check for duplicates only for the current user
    existing_case = Case.query.filter_by(display_name=display_name, user_id=user_id).first()
    if existing_case:
        raise DuplicateCaseError(f'Case with display name "{display_name}" already exists for this user')

    # --- Refactored: Get allowed fields from model ---
    mapper = inspect(Case)
    # Fields that are auto-managed or set explicitly elsewhere
    protected_keys = {'id', 'user_id', 'created_at', 'updated_at', 'display_name'}
    allowed_keys = {col.key for col in mapper.columns if col.key not in protected_keys}
    # Note: 'display_name' is handled separately above, but keep it in allowed_keys
    # if you want to allow setting it via the generic loop (though explicit handling is safer)

    # Filter the input data to only include allowed keys
    filtered_data = {key: value for key, value in data.items() if key in allowed_keys}

    # Process filtered data: Trim strings, handle None for nullable fields
    for key, value in filtered_data.items():
        if isinstance(value, str):
            stripped_value = value.strip()
            # Check if column is nullable using the mapper
            is_nullable = mapper.columns[key].nullable
            if not stripped_value and is_nullable:
                filtered_data[key] = None # Set empty strings to None if column allows it
            elif not stripped_value and not is_nullable:
                 # This case should ideally be caught by frontend validation
                 raise ValueError(f"Field '{key}' cannot be empty as it's required.")
            else:
                 filtered_data[key] = stripped_value # Keep stripped non-empty string
        # Ensure case_details defaults to {} if not provided or explicitly None
        if key == 'case_details' and filtered_data.get('case_details') is None:
             filtered_data['case_details'] = {}

    # --- End Refactored Part ---

    # Create new Case object using dictionary unpacking
    new_case = Case(
        display_name=display_name, # Set required field explicitly
        user_id=user_id,           # Set owner explicitly
        **filtered_data            # Pass the processed allowed fields
    )

    try:
        db.session.add(new_case)
        db.session.commit()
        print(f"Case '{display_name}' created successfully for user {user_id}.")
        return new_case
    except IntegrityError as e: # Catch potential DB integrity errors
        db.session.rollback()
        print(f"IntegrityError creating case for user {user_id}: {e}")
        # Check if it's a unique constraint violation (could be display_name, case_number etc.)
        # Providing a generic message might be safer unless you parse the specific constraint name
        raise DuplicateCaseError(f"Database integrity error creating case. A unique field (like display name or case number) might already exist.") from e
    except Exception as e:
        db.session.rollback()
        print(f"Error creating case for user {user_id}: {e}")
        raise CaseServiceError("Failed to create case in database") from e

def get_all_cases_for_user(user_id):
    """Fetches all cases for a specific user, ordered by display name."""
    try:
        # Ensure user exists (optional, depends on how user_id is obtained)
        # user = db.session.get(User, user_id)
        # if not user:
        #     raise ValueError(f"User with ID {user_id} not found.")
        return Case.query.filter_by(user_id=user_id).order_by(Case.display_name).all()
    except Exception as e:
        print(f"Error fetching cases for user {user_id} via service: {e}")
        raise CaseServiceError(f"Failed to fetch cases for user {user_id} from database") from e

# MODIFIED: Added ownership check (Keep this logic)
def get_case_by_id(case_id, user_id):
    print(f"DEBUG: Attempting to get case {case_id} for user {user_id}")
    case = Case.query.get_or_404(case_id)
    print(f"DEBUG: Found case {case_id}, owned by user {case.user_id}")
    
    # Check if this user owns the case
    if case.user_id != user_id:
        print(f"DEBUG: Permission denied - user {user_id} does not own case {case_id} (owned by {case.user_id})")
        raise Forbidden("You don't have permission to access this case.")
    """
    Fetches a single case by its ID, ensuring ownership.
    Args:
        case_id (int): The ID of the case to fetch.
        user_id (int): The ID of the user requesting the case.
    Returns:
        Case: The found Case object.
    Raises:
        CaseNotFoundError: If no case with the given ID is found.
        Forbidden: If the user does not own the case.
        CaseServiceError: For other database errors.
    """
    try:
        # Use session.get for primary key lookup (often slightly faster)
        case = db.session.get(Case, case_id)
        if case is None:
            raise CaseNotFoundError(f"Case with ID {case_id} not found.")

        # --- Ownership Check ---
        if case.user_id != user_id:
            # Log the attempt for security auditing
            print(f"SECURITY ALERT: User {user_id} attempted to access case {case_id} owned by user {case.user_id}.")
            raise Forbidden(f"Access denied: You do not own case {case_id}.")
        # --- END Ownership Check ---

        return case
    except (CaseNotFoundError, Forbidden) as e: # Re-raise specific errors
        raise e
    except Exception as e:
        print(f"Error fetching case {case_id} for user {user_id} via service: {e}")
        raise CaseServiceError(f"Failed to fetch case {case_id} from database") from e

def _parse_defendants(defendant_str):
    """
    Parse the defendant string into a dictionary of defendants.
    Ignores "DOES 1-100" and similar patterns.
    
    Args:
        defendant_str (str): The defendant string from the case
        
    Returns:
        dict: Dictionary of defendants with IDs as keys
    """
    if not defendant_str:
        return {}
        
    # Split by semicolons and clean up
    parts = [p.strip() for p in defendant_str.split(';')]
    
    # Filter out "DOES" entries and empty strings
    real_defendants = [p for p in parts if p and not p.lower().startswith('does')]
    
    # Create dictionary with IDs as keys
    defendants = {}
    for i, name in enumerate(real_defendants):
        def_id = f"def_{i+1}"
        defendants[def_id] = {
            'name': name,
            'id': def_id
        }
    
    return defendants

# MODIFIED: Added ownership check, refactored allowed fields & update logic
def update_case(case_id, update_data, user_id):
    """
    Updates an existing case, ensuring ownership and using model definition for fields.
    Args:
        case_id (int): The ID of the case to update.
        update_data (dict): Dictionary containing attributes to update.
        user_id (int): The ID of the user attempting the update.
    Returns:
        Case: The updated Case object.
    Raises:
        CaseNotFoundError: If the case is not found.
        Forbidden: If the user does not own the case.
        DuplicateCaseError: If update causes a unique constraint violation.
        CaseServiceError: For other database errors during update.
    """
    # Fetch the case using the ownership-checking function
    target_case = get_case_by_id(case_id, user_id)
    print(f"DEBUG: Retrieved case {case_id} for update")
    print(f"DEBUG: Current case_details: {target_case.case_details}")

    # Get allowed fields from model
    mapper = inspect(Case)
    protected_fields = {'id', 'user_id', 'created_at'}
    allowed_fields = {col.key for col in mapper.columns if col.key not in protected_fields}

    # Get locked fields from case_details
    locked_fields = []
    if 'case_details' in update_data and isinstance(update_data['case_details'], dict):
        locked_fields = update_data['case_details'].get('locked_fields', [])
    elif hasattr(target_case, 'case_details') and isinstance(target_case.case_details, dict):
        locked_fields = target_case.case_details.get('locked_fields', [])
    print(f"DEBUG: Locked fields: {locked_fields}")

    try:
        updated = False
        json_modified = False

        # First handle case_details separately to preserve its structure
        if 'case_details' in update_data:
            current_details = target_case.case_details or {}
            new_details = update_data['case_details']
            print(f"DEBUG: New case_details to merge: {new_details}")
            
            # Ensure new_details is a dict
            if not isinstance(new_details, dict):
                print(f"Warning: Non-dict value provided for case_details. Setting to empty dict.")
                new_details = {}
            
            # Merge the new details with existing ones
            merged_details = {**current_details, **new_details}
            print(f"DEBUG: Merged case_details: {merged_details}")
            
            # Always preserve locked_fields if they exist in new_details
            if 'locked_fields' in new_details:
                merged_details['locked_fields'] = new_details['locked_fields']
            
            # Update case_details if there are changes
            if current_details != merged_details:
                target_case.case_details = merged_details
                json_modified = True
                updated = True
                print(f"DEBUG: Updated case_details for case {case_id}")
                print(f"DEBUG: New case_details value: {target_case.case_details}")

        # Then handle dedicated fields
        for key, value in update_data.items():
            if key in allowed_fields and key != 'case_details':  # Skip case_details as we handled it above
                # Process the value update first, before checking if field is locked
                current_value = getattr(target_case, key)
                new_value = value

                # Process strings: trim and handle None for nullable fields
                if isinstance(new_value, str):
                    stripped_value = new_value.strip()
                    is_nullable = mapper.columns[key].nullable
                    if not stripped_value and is_nullable:
                        new_value = None
                    elif not stripped_value and not is_nullable:
                        print(f"Warning: Attempted to set non-nullable field '{key}' to empty string. Skipping update.")
                        continue
                    else:
                        new_value = stripped_value

                # Update if value changed
                if current_value != new_value:
                    # Only skip if field is locked AND this is not part of a suggestion application
                    if key in locked_fields and 'pending_suggestions' not in update_data.get('case_details', {}):
                        print(f"Field '{key}' is locked. Skipping update.")
                        continue
                        
                    setattr(target_case, key, new_value)
                    updated = True
                    print(f"Updated field {key} for case {case_id}")
                    
                    # If defendant field was updated, also update defendants JSON field
                    if key == 'defendant':
                        defendants = _parse_defendants(new_value)
                        target_case.defendants = defendants
                        print(f"Updated defendants JSON field with {len(defendants)} defendants")

        # Save changes if any were made
        if updated:
            try:
                db.session.commit()
                print(f"Successfully committed updates to case {case_id}")
            except IntegrityError as e:
                db.session.rollback()
                print(f"Integrity error updating case {case_id}: {str(e)}")
                raise DuplicateCaseError(f"Update would create duplicate case: {str(e)}")
            except Exception as e:
                db.session.rollback()
                print(f"Error committing updates to case {case_id}: {str(e)}")
                raise CaseServiceError(f"Failed to update case: {str(e)}")
        else:
            print(f"No changes to commit for case {case_id}")

        return target_case

    except Exception as e:
        db.session.rollback()
        print(f"Error in update_case: {str(e)}")
        raise CaseServiceError(f"Failed to update case: {str(e)}")

# MODIFIED: Added ownership check (Keep this logic)
def delete_case(case_id, user_id):
    """
    Deletes a case from the database, ensuring ownership.
    Note: This only handles DB deletion. File deletion should be handled separately.
    Args:
        case_id (int): The ID of the case to delete.
        user_id (int): The ID of the user attempting deletion.
    Returns:
        bool: True if deletion was successful.
    Raises:
        CaseNotFoundError: If the case is not found.
        Forbidden: If the user does not own the case.
        CaseServiceError: For database errors during deletion.
    """
    # Fetch the case using the ownership-checking function (raises error if not found/owned)
    target_case = get_case_by_id(case_id, user_id)

    try:
        # Cascade delete should handle associated Document records if configured in model
        db.session.delete(target_case)
        db.session.commit()
        print(f"Case {case_id} deleted successfully from DB via service by user {user_id}.")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting case {case_id} by user {user_id} via service: {e}")
        raise CaseServiceError(f"Failed to delete case {case_id} from database") from e

