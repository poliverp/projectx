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
# === REPLACE the entire TEMPLATE_CONTEXT_MAP dictionary near the top of cases.py with this ===
# === Make sure the previous incorrect one is fully deleted first ===
TEMPLATE_CONTEXT_MAP = {
    'jury_fees_template.docx': {
        'plaintiff': {'source': 'case_details', 'key': 'plaintiff', 'default': ''},
        'defendant': {'source': 'case_details', 'key': 'defendant', 'default': ''},
        # CORRECTED DEFAULT: Use lambda for fallback logic
        'judge_doc': {'source': 'case_details', 'key': 'judge_doc', 'default': lambda details: details.get('judge_doc', '')},
        # CORRECTED DEFAULT: Use lambda for fallback logic (accessing details and case)
        'case_number_doc': {'source': 'case_details', 'key': 'case_number_doc', 'default': lambda details, case: details.get('case_number_doc', getattr(case, 'case_number', ''))},
        'filing_date': {'source': 'case_details', 'key': 'filing_date', 'default': ''},
        'trial_date': {'source': 'case_details', 'key': 'trial_date', 'default': ''},
        'county': {'source': 'case_details', 'key': 'county', 'default': ''},
        'jurisdiction': {'source': 'case_details', 'key': 'jurisdiction', 'default': ''},

        # Add/verify other fields needed by jury_fees_template.docx here
    },
    'demand_letter_template.docx': { # EXAMPLE
        'plaintiff': {'source': 'case_details', 'key': 'plaintiff', 'default': 'UNKNOWN PLAINTIFF'},
        'defendant': {'source': 'case_details', 'key': 'defendant', 'default': 'UNKNOWN DEFENDANT'},
        'amount_demanded': {'source': 'case_details', 'key': 'demand_amount', 'default': '[AMOUNT NOT FOUND]'},
        'demand_deadline': {'source': 'case_details', 'key': 'demand_deadline_date', 'default': '[DATE NOT FOUND]'},
    },
     'case_summary_template.docx': { # EXAMPLE
        'plaintiff': {'source': 'case_details', 'key': 'plaintiff', 'default': ''},
        'defendant': {'source': 'case_details', 'key': 'defendant', 'default': ''},
        'summary': {'source': 'case_details', 'key': 'summary', 'default': 'No summary available.'},
        'case_number': {'source': 'direct', 'attribute': 'case_number', 'default': 'N/A'},
     }
    # --- Add entries for your other templates here ---
}
# === END REPLACEMENT ===
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
    """
    Generates and sends a Word document based on a template name
    provided in the request body.
    """
    print(f"--- Handling POST /api/cases/{case_id}/download_word_document ---")

    # --- Get Template Name from Request ---
    request_data = request.get_json()
    if not request_data:
        print("Error: No JSON data provided in request body")
        return jsonify({'error': 'No JSON data provided in request body'}), 400

    template_name = request_data.get('template_name')
    if not template_name:
        print("Error: Missing 'template_name' in request body")
        return jsonify({'error': 'Missing "template_name" in request body'}), 400

    # Basic validation (optional but recommended): Check for potentially unsafe names
    # Prevent directory traversal and check extension
    if '..' in template_name or '/' in template_name or '\\' in template_name or not template_name.endswith('.docx'):
         print(f"Error: Invalid template name format or characters: {template_name}")
         return jsonify({'error': 'Invalid template name specified'}), 400
    # Optional: Limit to known/allowed templates
    # allowed_templates = ['jury_fees_template.docx', 'another_template.docx']
    # if template_name not in allowed_templates:
    #    print(f"Error: Template '{template_name}' is not allowed.")
    #    return jsonify({'error': f"Template '{template_name}' not allowed"}), 400

    print(f"--- Requested template: {template_name} ---")

    # --- 1. Fetch Case Data ---
    try:
        # Make sure get_case_by_id returns the ORM object
        case_data = get_case_by_id(case_id)
    except CaseNotFoundError:
        print(f"Error: Case ID {case_id} not found.")
        return jsonify({'error': 'Case not found'}), 404
    except Exception as e:
        print(f"Error fetching data for case {case_id} (Word Gen): {e}")
        # db might not be needed if get_case_by_id handles rollback, but good practice
        if 'db' in locals() and db.session.is_active:
             db.session.rollback()
        return jsonify({'error': 'Failed to fetch case data for document generation'}), 500

    # --- 2. Construct Template Path ---
    # Construct path relative to the application's template folder
    # Assumes 'templates' folder is at the root of the backend app or configured
    try:
        # Use current_app.root_path which points to the application root directory
        # Ensure your 'templates' folder is located like 'backend/templates/'
        template_dir = os.path.join(current_app.root_path, 'templates')
        template_path = os.path.join(template_dir, template_name) # Use the DYNAMIC template_name

        print(f"Attempting to use template path: {template_path}")
        if not os.path.exists(template_path):
             # Fallback check (might be needed depending on blueprint/app structure)
             # Path relative to blueprint folder if 'templates' is there
             try:
                  alt_template_path = os.path.join(bp.root_path, '..', 'templates', template_name)
                  print(f"Attempting fallback template path: {alt_template_path}")
                  if os.path.exists(alt_template_path):
                       template_path = alt_template_path
                  else:
                       raise FileNotFoundError # Trigger the main FileNotFoundError catch
             except Exception: # Catch potential errors if bp doesn't have root_path etc.
                  raise FileNotFoundError # Ensure FileNotFoundError is raised if fallback fails


        # This check should now happen after trying both primary and fallback paths
        if not os.path.exists(template_path):
             print(f"Error: Template file '{template_name}' not found at tested paths.")
             return jsonify({'error': f'Template file "{template_name}" not found'}), 400

        print(f"Using template file path: {template_path}")

    except FileNotFoundError: # Catch specific error if path checks fail
         print(f"Error: Template file '{template_name}' not found after checks.")
         return jsonify({'error': f'Template file "{template_name}" not found'}), 400
    except Exception as e:
         print(f"Error constructing template path: {e}")
         return jsonify({'error': 'Could not determine template path'}), 500


    # --- 3. Create Context Dictionary ---
    # !!! IMPORTANT !!!
    # This context currently reads primarily from dedicated DB columns.
    # It will likely only work correctly for templates (like jury_fees)
    # that need these specific fields (plaintiff, defendant, judge etc.).
    # We will need to make this context dynamic later to support
    # different templates needing different data sources (e.g., more from case_details).
    # For now, we keep the existing logic that reads from direct attributes:
    try:
        context = build_dynamic_context(template_name, case_data)
        if not context and template_name in TEMPLATE_CONTEXT_MAP: # Check if context is empty but config existed
             print(f"Warning: Built empty context for known template '{template_name}'. Check config and data source.")
             # Decide if empty context is an error or okay
             # return jsonify({'error': f"Failed to build context for template '{template_name}'"}), 500
        print(f"Dynamic context created for '{template_name}': {context}")
    except Exception as e:
         print(f"Error building dynamic context for {template_name}: {e}")
         return jsonify({'error': 'Failed to build document context'}), 500
    # --- END OF REPLACEMENT ---

    # --- 4. Load, Render, and Save Template to Memory ---
    try:
        doc = DocxTemplate(template_path) # Uses dynamic path
        print(f"Rendering docx template: {template_name}...")
        doc.render(context)
        print("Template rendered.")

        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        print("Document saved to memory stream.")

    except Exception as e: # Catch potential Jinja/DocxTemplate errors here
        print(f"Error rendering/saving template {template_name}: {e}")
        # Check specifically for docxtpl rendering errors (e.g., missing context key)
        # The exact error message might vary depending on Jinja/docxtpl version
        if 'is not defined' in str(e) or isinstance(e, NameError): # Check for common Jinja errors
             # Attempt to extract the missing key if possible (may not always work)
             try:
                  missing_key = str(e).split("'")[1]
             except IndexError:
                  missing_key = "(unknown)"
             error_msg = f"Template '{template_name}' rendering failed: Missing data for placeholder like '{{ {missing_key} }}'."
             print(f"Context provided was: {context}") # Log context when error occurs
             return jsonify({'error': error_msg}), 400 # Return specific error
        else:
             # Generic processing error
             return jsonify({'error': f'Failed to process document template: {e}'}), 500


    # --- 5. Send the File for Download ---
    try:
        # Make output filename dynamic based on template maybe?
        # For now, use case number/id and maybe template base name
        base_template_name = os.path.splitext(template_name)[0] # Get name without extension
        # Sanitize names for filesystem/HTTP headers if necessary
        safe_case_identifier = str(case_data.case_number or case_id).replace('/','_').replace('\\','_')
        safe_template_name = base_template_name.replace('/','_').replace('\\','_')
        output_filename = f"{safe_template_name}_{safe_case_identifier}.docx"

        print(f"Sending file: {output_filename}")
        return send_file(
            file_stream,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=output_filename # Suggest filename to browser
        )
    except Exception as e:
        print(f"Error sending file stream: {e}")
        return jsonify({'error': 'Failed to send document for download'}), 500
# === End of updated function ===

# === REPLACE the existing build_dynamic_context function with this corrected version ===
def build_dynamic_context(template_name, case_data):
    context = {}
    template_config = TEMPLATE_CONTEXT_MAP.get(template_name)

    if not template_config:
        print(f"Warning: No context configuration found for template '{template_name}'. Returning empty context.")
        return {}

    # Ensure details_dict is a dictionary, even if case_details is None
    details_dict = case_data.case_details if isinstance(case_data.case_details, dict) else {}

    # Iterate through the configuration for the requested template
    for context_key, config in template_config.items():
        value_found = None # Use a temporary variable to store the found value
        source = config.get('source')
        default_value_config = config.get('default', '') # Default default is empty string

        try:
            # --- Get value based on source ---
            if source == 'case_details':
                key = config.get('key')
                if key:
                    # Handle potentially nested keys like "court_info.county"
                    current_level = details_dict
                    nested_keys = key.split('.')
                    for i, nested_key in enumerate(nested_keys):
                         if isinstance(current_level, dict):
                              # Check if this is the last key in the path
                              if i == len(nested_keys) - 1:
                                   value_found = current_level.get(nested_key) # Get the final value
                              else:
                                   current_level = current_level.get(nested_key) # Go deeper
                                   if current_level is None: # Stop if path breaks
                                        break
                         else: # Path broken, cannot traverse further
                              value_found = None
                              break
                    # If loop completed but current_level is not dict (e.g., key was "plaintiff.name" but plaintiff is string)
                    # value_found should correctly be None or the target value here
                else:
                     print(f"Warning: Missing 'key' in config for {context_key} (source: case_details)")

            elif source == 'direct':
                attribute = config.get('attribute')
                if attribute:
                    value_found = getattr(case_data, attribute, None)
                else:
                     print(f"Warning: Missing 'attribute' in config for {context_key} (source: direct)")

            # --- Determine the default value if needed ---
            default_to_use = None
            if callable(default_value_config):
                 # If default is a function, call it potentially with details and case
                 try:
                      import inspect
                      sig = inspect.signature(default_value_config)
                      params_to_pass = {}
                      if 'details' in sig.parameters: params_to_pass['details'] = details_dict
                      if 'case' in sig.parameters: params_to_pass['case'] = case_data
                      default_to_use = default_value_config(**params_to_pass)
                 except Exception as lambda_err:
                      print(f"Error executing lambda default for {context_key}: {lambda_err}")
                      default_to_use = '' # Fallback default on lambda error
            else:
                 default_to_use = default_value_config # Use the static default value

            # --- Assign to final context ---
            # Use the found value if it's not None, otherwise use the calculated default
            context[context_key] = value_found if value_found is not None else default_to_use

        except Exception as e:
             # Log error and assign default on unexpected error during processing this key
             print(f"Error processing context key '{context_key}' for template '{template_name}': {e}")
             # Determine default value even on error
             default_to_use_on_error = default_value_config if not callable(default_value_config) else '' # Safer default on error
             context[context_key] = default_to_use_on_error


    return context
# === END REPLACEMENT ===