# --- backend/api/cases.py ---
import os # Needed for delete file path
import io
from flask import send_file, current_app # Import send_file and current_app (might need current_app for config later)
from flask import request, jsonify
from docxtpl import DocxTemplate 
from ..extensions import db # Import db from extensions
from ..models import Case, Document # Import necessary models
from . import bp # Import the blueprint instance from api/__init__.py
from ..services.case_service import (
    create_case, get_all_cases, get_case_by_id, update_case, delete_case, # Add update/delete
    DuplicateCaseError, CaseServiceError, CaseNotFoundError
)

# == Case Management Endpoints ==

# Consolidated route for /cases handling GET and POST (relative to /api prefix)
@bp.route('/cases', methods=['GET', 'POST']) # No OPTIONS needed here unless specific handling req.
def handle_cases():
    if request.method == 'GET':
        print("--- Handling GET /api/cases (Blueprint) ---")
        try:
            cases = Case.query.order_by(Case.display_name).all()
            cases_data = [{
                'id': case.id,
                'display_name': case.display_name,
                'official_case_name': case.official_case_name,
                'case_number': case.case_number,
                # Include updated_at and maybe parts of case_details if useful for list view
                'updated_at': case.updated_at.isoformat() if case.updated_at else None,
            } for case in cases]
            return jsonify(cases_data)
        except Exception as e:
            print(f"Error fetching cases: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to fetch cases'}), 500

    elif request.method == 'POST':
        print("--- Handling POST /api/cases (Blueprint) ---")
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        try:
            # Call the service function to handle creation logic
            new_case = create_case(data)

            # Format the successful response (route still owns response formatting)
            return jsonify({
                'id': new_case.id,
                'display_name': new_case.display_name,
                'official_case_name': new_case.official_case_name,
                'case_number': new_case.case_number,
                'judge': new_case.judge,
                'plaintiff': new_case.plaintiff,
                'defendant': new_case.defendant,
                'case_details': new_case.case_details,
                'created_at': new_case.created_at.isoformat() if new_case.created_at else None,
                'updated_at': new_case.updated_at.isoformat() if new_case.updated_at else None,
            }), 201 # Created

        # Handle specific errors raised by the service
        except ValueError as e:
            return jsonify({'error': str(e)}), 400 # Bad Request
        except DuplicateCaseError as e:
            return jsonify({'error': str(e)}), 409 # Conflict
        except CaseServiceError as e:
            return jsonify({'error': str(e)}), 500 # Internal Server Error
        except Exception as e:
            # Catch any other unexpected errors
            print(f"Unexpected error handling POST /api/cases: {e}")
            return jsonify({'error': 'An unexpected error occurred'}), 500

# Route for getting ONE specific case
@bp.route('/cases/<int:case_id>', methods=['GET'])
def get_case_details(case_id):
    """Fetches details for a specific case."""
    print(f"--- Handling GET /api/cases/{case_id} (Blueprint) ---")
    try:
        # Use .first_or_404() for slightly cleaner handling
        target_case = db.session.get(Case, case_id) # Use newer session.get syntax
        if target_case is None:
            return jsonify({'error': 'Case not found'}), 404

        case_data = {
            'id': target_case.id,
            'display_name': target_case.display_name,
            'official_case_name': target_case.official_case_name,
            'case_number': target_case.case_number,
            'judge': target_case.judge,
            'plaintiff': target_case.plaintiff,
            'defendant': target_case.defendant,
            'created_at': target_case.created_at.isoformat() if target_case.created_at else None,
            'updated_at': target_case.updated_at.isoformat() if target_case.updated_at else None,
            'case_details': target_case.case_details # Include the details field
        }
        return jsonify(case_data)
    except Exception as e:
        print(f"Error fetching case {case_id}: {e}")
        return jsonify({'error': 'Failed to fetch case details'}), 500


# Route for updating ONE specific case
@bp.route('/cases/<int:case_id>', methods=['PUT'])
def update_case_details(case_id):
    """Updates details for a specific case using service."""
    print(f"--- Handling PUT /api/cases/{case_id} (Blueprint) ---")
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No update data provided'}), 400

    try:
        # Call service function
        updated_case = update_case(case_id, data)

        # Format response in the route
        updated_data = {
            'id': updated_case.id,
            'display_name': updated_case.display_name,
            'official_case_name': updated_case.official_case_name,
            'case_number': updated_case.case_number,
            'judge': updated_case.judge,
            'plaintiff': updated_case.plaintiff,
            'defendant': updated_case.defendant,
            'created_at': updated_case.created_at.isoformat() if updated_case.created_at else None,
            'updated_at': updated_case.updated_at.isoformat() if updated_case.updated_at else None,
            'case_details': updated_case.case_details
        }
        return jsonify(updated_data)
    except CaseNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except CaseServiceError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
         print(f"Unexpected error handling PUT /api/cases/{case_id}: {e}")
         return jsonify({'error': 'An unexpected error occurred'}), 500


@bp.route('/cases/<int:case_id>', methods=['DELETE'])
def delete_case_and_documents(case_id):
    """Deletes a case (DB via service) and associated documents/files."""
    print(f"--- Handling DELETE /api/cases/{case_id} (Blueprint) ---")

    # We need file paths *before* deleting the case record
    try:
        # Fetch case first to get document paths (could also be done in service)
         case_to_delete = get_case_by_id(case_id)
         file_paths = [doc.file_path for doc in case_to_delete.documents if doc.file_path]
    except CaseNotFoundError as e:
         return jsonify({'error': str(e)}), 404
    except Exception as e: # Catch errors fetching paths
         print(f"Error fetching case/doc paths for deletion {case_id}: {e}")
         return jsonify({'error': 'Failed to retrieve case/document info for deletion'}), 500

    try:
        # Call service to delete case from DB
        delete_case(case_id)

        # --- File deletion logic remains in the route for now ---
        print(f"Attempting to delete files for case {case_id}: {file_paths}")
        for file_path in file_paths:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"Deleted file: {file_path}")
                except OSError as e:
                    # Log error but don't necessarily fail the whole request
                    print(f"Error deleting file {file_path}: {e}")

        return jsonify({'message': f'Case {case_id} and associated documents deleted successfully'}), 200

    except CaseNotFoundError as e: # Should have been caught above, but for safety
        return jsonify({'error': str(e)}), 404
    except CaseServiceError as e: # Error during DB deletion
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"Unexpected error handling DELETE /api/cases/{case_id}: {e}")
        return jsonify({'error': 'An unexpected error occurred during deletion'}), 500

        return jsonify({'message': f'Case {case_id} and associated documents deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting case {case_id}: {e}")
        return jsonify({'error': 'Failed to delete case'}), 500
    
# === Add this new route for Word document generation ===

@bp.route('/cases/<int:case_id>/download_word_document', methods=['POST'])
def download_word_document(case_id):
    """Generates and sends a Word document based on a specific template."""
    print(f"--- Handling POST /api/cases/{case_id}/download_word_document ---")

    # --- 1. Fetch Case Data ---
    try:
        # Use your existing service function
        case_data = get_case_by_id(case_id)
        # NOTE: Fetch any other related data needed for the template here
        # e.g., client_info = get_client_by_id(case_data.client_id)
    except CaseNotFoundError:
        return jsonify({'error': 'Case not found'}), 404
    except Exception as e:
        print(f"Error fetching data for case {case_id} (Word Gen): {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to fetch case data for document generation'}), 500

    # --- 2. Define Template ---
    # For now, we'll hardcode the jury fees template. Later, this could come from the request.
    template_name = 'jury_fees_template.docx'
    # Construct path relative to the blueprint's location (api folder)
    # Assumes 'templates' folder is one level up from the 'api' folder
    try:
        # bp.root_path should be the path to the 'api' directory
        template_path = os.path.join(bp.root_path, '..', 'templates', template_name)
        # Basic check if template exists
        if not os.path.exists(template_path):
             # Try path relative to app root as fallback (if app.py is in backend/)
             template_path_alt = os.path.join(current_app.root_path, 'templates', template_name)
             if not os.path.exists(template_path_alt):
                  print(f"Template file not found at primary path: {template_path} or alt path: {template_path_alt}")
                  return jsonify({'error': f'Template file "{template_name}" not found'}), 400
             else:
                  template_path = template_path_alt # Use the alternative path
        print(f"Using template: {template_path}")
    except Exception as e:
         print(f"Error constructing template path: {e}")
         return jsonify({'error': 'Could not determine template path'}), 500

    # --- 3. !!! IMPORTANT: Create Context Dictionary !!! ---
    # Map the placeholders in your Word doc (e.g., {{ case_num }})
    # to the actual data from your 'case_data' object.
    # ** YOU MUST REPLACE THE KEYS ('placeholder_1', etc.) WITH YOUR ACTUAL PLACEHOLDER NAMES **
    context = {
        'case_number': case_data.case_number,
        'plaintiff': case_data.plaintiff,
        'defendant': case_data.defendant,
        'judge': case_data.judge,
        # Accessing data from the case_details JSON blob (example)
        # Add placeholders 9 and 10 based on your template and data
        'complaint_filed': case_data.complaint_filed, # Example, replace with actual data
    
        # Add any other fields needed by jury_fees_template.docx
    }
    print(f"Context dictionary created for template rendering.")


    # --- 4. Load, Render, and Save Template to Memory ---
    try:
        doc = DocxTemplate(template_path)
        print("Rendering docx template...")
        doc.render(context)
        print("Template rendered.")

        # Save the rendered document to an in-memory stream
        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0) # Go back to the beginning of the stream
        print("Document saved to memory stream.")

    except Exception as e:
        print(f"Error rendering/saving template {template_name}: {e}")
        return jsonify({'error': f'Failed to process document template: {e}'}), 500

    # --- 5. Send the File for Download ---
    try:
        output_filename = f"Jury_Fees_{case_data.case_number or case_id}.docx"
        print(f"Sending file: {output_filename}")
        return send_file(
            file_stream,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True, # Important: Tells browser to download
            download_name=output_filename # Sets the default filename for the user
        )
    except Exception as e:
        print(f"Error sending file stream: {e}")
        return jsonify({'error': 'Failed to send document for download'}), 500

# === End Add New Route ===