# --- backend/services/case_service.py ---
import os
from backend.models import Case, Document, User # Import relevant models
from backend.extensions import db # Import the db instance
from flask_login import current_user # Import current_user to check ownership
from werkzeug.exceptions import Forbidden # Import Forbidden for authorization errors
from sqlalchemy.exc import IntegrityError # To catch potential unique constraint errors

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

# MODIFIED: Added user_id argument
def create_case(data, user_id):
    """
    Creates a new case in the database, associated with a specific user.
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

    # Optional: Check for duplicates only for the current user
    existing_case = Case.query.filter_by(display_name=display_name, user_id=user_id).first()
    if existing_case:
        raise DuplicateCaseError(f'Case with display name "{display_name}" already exists for this user')

    # Create new Case object, assigning the owner
    new_case = Case(
        display_name=display_name,
        user_id=user_id, # <-- Assign the owner
        official_case_name=data.get('official_case_name'),
        case_number=data.get('case_number'),
        judge=data.get('judge'),
        plaintiff=data.get('plaintiff'),
        defendant=data.get('defendant'),
        case_details=data.get('case_details', {}) # Default to empty dict
    )

    try:
        db.session.add(new_case)
        db.session.commit()
        print(f"Case '{display_name}' created successfully for user {user_id}.")
        return new_case
    except IntegrityError as e: # Catch potential DB integrity errors (e.g., unexpected constraint)
        db.session.rollback()
        print(f"IntegrityError creating case for user {user_id}: {e}")
        raise CaseServiceError("Database integrity error creating case") from e
    except Exception as e:
        db.session.rollback()
        print(f"Error creating case for user {user_id}: {e}")
        raise CaseServiceError("Failed to create case in database") from e

def get_all_cases_for_user(user_id):
    """Fetches all cases for a specific user, ordered by display name."""
    # NOTE: The API route GET /api/cases currently does this filtering directly.
    # This service function is provided for completeness if needed elsewhere.
    try:
        return Case.query.filter_by(user_id=user_id).order_by(Case.display_name).all()
    except Exception as e:
        print(f"Error fetching cases for user {user_id} via service: {e}")
        raise CaseServiceError(f"Failed to fetch cases for user {user_id} from database") from e

# MODIFIED: Added ownership check
def get_case_by_id(case_id, user_id):
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
        case = db.session.get(Case, case_id) # Use newer session.get syntax
        if case is None:
            raise CaseNotFoundError(f"Case with ID {case_id} not found.")

        # --- ADDED: Ownership Check ---
        if case.user_id != user_id:
            raise Forbidden(f"User {user_id} does not have permission to access case {case_id}.")
        # --- END ADDED ---

        return case
    except (CaseNotFoundError, Forbidden) as e: # Re-raise specific errors
        raise e
    except Exception as e:
        print(f"Error fetching case {case_id} for user {user_id} via service: {e}")
        raise CaseServiceError(f"Failed to fetch case {case_id} from database") from e

# MODIFIED: Added ownership check
def update_case(case_id, update_data, user_id):
    """
    Updates an existing case, ensuring ownership.
    Args:
        case_id (int): The ID of the case to update.
        update_data (dict): Dictionary containing attributes to update.
        user_id (int): The ID of the user attempting the update.
    Returns:
        Case: The updated Case object.
    Raises:
        CaseNotFoundError: If the case is not found.
        Forbidden: If the user does not own the case.
        CaseServiceError: For database errors during update.
    """
    # Fetch the case using the ownership-checking function
    target_case = get_case_by_id(case_id, user_id)

    try:
        # Define fields allowed to be updated via this service function
        allowed_fields = [
            'display_name', 'official_case_name', 'case_number',
            'judge', 'plaintiff', 'defendant', 'case_details'
            # DO NOT allow updating user_id here directly
        ]

        for key, value in update_data.items():
            if key in allowed_fields:
                setattr(target_case, key, value)
            # Add validation if needed (e.g., display_name uniqueness for this user)

        db.session.commit()
        print(f"Case {case_id} updated successfully via service by user {user_id}.")
        return target_case
    except IntegrityError as e: # Catch potential unique constraint violations on update
         db.session.rollback()
         print(f"IntegrityError updating case {case_id} by user {user_id}: {e}")
         # Check if it's the display name unique constraint for this user
         if 'display_name' in str(e).lower() or ('case' in str(e).lower() and 'display_name' in str(e).lower()):
              raise DuplicateCaseError(f"Case display name '{update_data.get('display_name')}' might already exist for this user.") from e
         else:
              raise CaseServiceError(f"Database integrity error updating case {case_id}") from e
    except Exception as e:
        db.session.rollback()
        print(f"Error updating case {case_id} by user {user_id} via service: {e}")
        raise CaseServiceError(f"Failed to update case {case_id} in database") from e

# MODIFIED: Added ownership check
def delete_case(case_id, user_id):
    """
    Deletes a case from the database, ensuring ownership.
    Note: This only handles DB deletion. File deletion should be handled separately (likely in API route).
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
    # Fetch the case using the ownership-checking function
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