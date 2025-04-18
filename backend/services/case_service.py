# --- backend/services/case_service.py ---
from models import Case # Import the Case model
from extensions import db # Import the db instance

class CaseServiceError(Exception):
    """Base exception for errors in the Case service."""
    pass

# --- Define Specific Exceptions Inheriting from Base ---
class CaseNotFoundError(CaseServiceError):
    """Raised when a specific case is not found."""
    pass

class DuplicateCaseError(CaseServiceError):
    """Raised when trying to create a case with a duplicate display name."""
    pass

def create_case(case_data):
    """
    Creates a new case in the database.
    Args:
        case_data (dict): Dictionary containing case attributes.
                            Must include 'display_name'.
    Returns:
        Case: The newly created Case object.
    Raises:
        DuplicateCaseError: If a case with the same display_name already exists.
        ValueError: If required data (display_name) is missing.
        CaseServiceError: For other database errors.
    """
    display_name = case_data.get('display_name')
    if not display_name:
        raise ValueError("Display name is required to create a case.")

    display_name = display_name.strip()

    # Check for duplicates
    existing_case = Case.query.filter_by(display_name=display_name).first()
    if existing_case:
        raise DuplicateCaseError(f'Case with display name "{display_name}" already exists')

    # Create new Case object
    new_case = Case(
        display_name=display_name,
        official_case_name=case_data.get('official_case_name'),
        case_number=case_data.get('case_number'),
        judge=case_data.get('judge'),
        plaintiff=case_data.get('plaintiff'),
        defendant=case_data.get('defendant'),
        case_details=case_data.get('case_details', {})
    )

    try:
        db.session.add(new_case)
        db.session.commit()
        print(f"Case created successfully via service: {new_case.id}")
        return new_case
    except Exception as e:
        db.session.rollback()
        print(f"Error creating case via service: {e}")
        # Raise a generic service error or re-raise the specific DB error
        raise CaseServiceError("Failed to create case in database") from e
    
def get_all_cases():
    """Fetches all cases, ordered by display name."""
    try:
        return Case.query.order_by(Case.display_name).all()
    except Exception as e:
        print(f"Error fetching all cases via service: {e}")
        raise CaseServiceError("Failed to fetch cases from database") from e

def get_case_by_id(case_id):
    """
    Fetches a single case by its ID.
    Args:
        case_id (int): The ID of the case to fetch.
    Returns:
        Case: The found Case object.
    Raises:
        CaseNotFoundError: If no case with the given ID is found.
        CaseServiceError: For other database errors.
    """
    try:
        # case = Case.query.get(case_id) # Old way
        case = db.session.get(Case, case_id) # Use newer session.get syntax
        if case is None:
            raise CaseNotFoundError(f"Case with ID {case_id} not found.")
        return case
    except CaseNotFoundError: # Re-raise specific error
         raise
    except Exception as e:
        print(f"Error fetching case {case_id} via service: {e}")
        raise CaseServiceError(f"Failed to fetch case {case_id} from database") from e
# --- END ADD FUNCTIONS ---

# --- backend/services/case_service.py ---
# ... (keep existing imports and functions) ...

# --- ADD THESE FUNCTIONS ---
def update_case(case_id, update_data):
    """
    Updates an existing case.
    Args:
        case_id (int): The ID of the case to update.
        update_data (dict): Dictionary containing attributes to update.
    Returns:
        Case: The updated Case object.
    Raises:
        CaseNotFoundError: If the case with the given ID is not found.
        CaseServiceError: For database errors during update.
    """
    target_case = get_case_by_id(case_id) # Reuse get_case_by_id to handle not found

    try:
        # Update fields present in update_data
        for key, value in update_data.items():
            # Be careful about which fields are allowed to be updated
            # Example: only update specific known fields
            allowed_fields = ['display_name', 'official_case_name', 'case_number',
                              'judge', 'plaintiff', 'defendant', 'case_details']
            if key in allowed_fields:
                setattr(target_case, key, value)
            # Add validation if needed (e.g., display_name uniqueness check if changed)

        db.session.commit()
        print(f"Case updated successfully via service: {case_id}")
        return target_case
    except Exception as e:
        db.session.rollback()
        print(f"Error updating case {case_id} via service: {e}")
        raise CaseServiceError(f"Failed to update case {case_id} in database") from e

def delete_case(case_id):
    """
    Deletes a case from the database.
    Note: This only handles DB deletion. File deletion should be handled separately.
    Args:
        case_id (int): The ID of the case to delete.
    Returns:
        bool: True if deletion was successful.
    Raises:
        CaseNotFoundError: If the case with the given ID is not found.
        CaseServiceError: For database errors during deletion.
    """
    target_case = get_case_by_id(case_id) # Reuse get_case_by_id

    try:
        # Get associated file paths *before* deleting from DB session
        # (though cascade delete should handle Document records)
        # This might be better handled in the route if file deletion is tied closely
        # For now, service focuses on DB object deletion
        db.session.delete(target_case)
        db.session.commit()
        print(f"Case deleted successfully from DB via service: {case_id}")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting case {case_id} via service: {e}")
        raise CaseServiceError(f"Failed to delete case {case_id} from database") from e
# --- END ADD FUNCTIONS ---
# --- Add other case-related functions here later ---
# e.g., get_all_cases(), get_case_by_id(case_id), update_case(case_id, update_data), etc.