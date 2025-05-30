# --- backend/api/cases.py ---
import os # Needed for delete file path
import io
import datetime # <<< ADD THIS IMPORT
from flask import send_file, current_app # Import send_file and current_app (might need current_app for config later)
from flask import request, jsonify
from flask_login import login_required, current_user # <-- ADDED/ENSURE THIS
from werkzeug.exceptions import Forbidden # <-- ADDED/ENSURE THIS
from docxtpl import DocxTemplate 
from marshmallow import ValidationError # <<< Import ValidationError
from backend.extensions import db # Import db from extensions
from backend.models import Case, Document # Import necessary models
from . import bp # Import the blueprint instance from api/__init__.py
from backend.schemas import case_schema, case_update_input_schema, case_update_input_schema, case_create_input_schema, cases_schema

from backend.services.case_service import (
    create_case, get_case_by_id, update_case, delete_case, # Add update/delete
    DuplicateCaseError, CaseServiceError, CaseNotFoundError
)
from flask_login import login_required, current_user
# === REPLACE the entire TEMPLATE_CONTEXT_MAP dictionary near the top of cases.py with this ===
TEMPLATE_CONTEXT_MAP = {
    # --- Configuration for jury_fees_template.docx ---
    'jury_fees_template.docx': {
        # CONTEXT KEY (matches {{placeholder}}) : { CONFIGURATION }
        'plaintiff':          {'source': 'direct', 'attribute': 'plaintiff',          'default': ''},
        'defendant':          {'source': 'direct', 'attribute': 'defendant',          'default': ''},
        'judge':              {'source': 'direct', 'attribute': 'judge',              'default': ''},
        'case_number':        {'source': 'direct', 'attribute': 'case_number',        'default': ''},
        'jurisdiction':       {'source': 'direct', 'attribute': 'jurisdiction',       'default': ''},
        'county':             {'source': 'direct', 'attribute': 'county',             'default': ''},
        'filing_date':        {'source': 'direct', 'attribute': 'filing_date',        'default': ''}, 
        'trial_date':         {'source': 'direct', 'attribute': 'trial_date',         'default': ''}, 
        'incident_date':      {'source': 'direct', 'attribute': 'incident_date',      'default': ''}, 
        'incident_location':  {'source': 'direct', 'attribute': 'incident_location',  'default': ''},
        'incident_description': {'source': 'direct', 'attribute': 'incident_description', 'default': ''},
        'case_type':          {'source': 'direct', 'attribute': 'case_type',          'default': ''},
        'plaintiff_counsel_info': {'source': 'direct', 'attribute': 'plaintiff_counsel_info', 'default': ''},
        'vehicle_details':     {'source': 'direct', 'attribute': 'vehicle_details',    'default': ''},
        'acting_attorney':     {'source': 'direct', 'attribute': 'acting_attorney',    'default': ''},
        'acting_clerk':        {'source': 'direct', 'attribute': 'acting_clerk',       'default': ''},
        # Defendant counsel fields
        'defendant_counsel_attorneys': {'source': 'direct', 'attribute': 'defendant_counsel_attorneys', 'default': ''},
        'defendant_counsel_firm': {'source': 'direct', 'attribute': 'defendant_counsel_firm', 'default': ''},
        'defendant_counsel_address': {'source': 'direct', 'attribute': 'defendant_counsel_address', 'default': ''},
        'defendant_counsel_email': {'source': 'direct', 'attribute': 'defendant_counsel_email', 'default': ''},
        'defendant_counsel_phone': {'source': 'direct', 'attribute': 'defendant_counsel_phone', 'default': ''},
        'defendant_counsel_info': {'source': 'direct', 'attribute': 'defendant_counsel_info', 'default': ''},
        # New defendant fields
        'defendants':          {'source': 'direct', 'attribute': 'defendants',         'default': {}},
        'active_defendant':    {'source': 'direct', 'attribute': 'active_defendant',   'default': ''},
        'case_details':        {'source': 'direct', 'attribute': 'case_details',       'default': {}}
    },

    # --- Configuration for FR1_template.docx ---
    'FR1_template.docx': {
        'plaintiff':          {'source': 'direct', 'attribute': 'plaintiff',          'default': ''},
        'defendant':          {'source': 'direct', 'attribute': 'defendant',          'default': ''},
        'case_number':        {'source': 'direct', 'attribute': 'case_number',        'default': ''},
        'judge':              {'source': 'direct', 'attribute': 'judge',              'default': ''},
        'jurisdiction':       {'source': 'direct', 'attribute': 'jurisdiction',       'default': ''},
        'county':             {'source': 'direct', 'attribute': 'county',             'default': ''},
        'filing_date':        {'source': 'direct', 'attribute': 'filing_date',        'default': ''}, 
        'trial_date':         {'source': 'direct', 'attribute': 'trial_date',         'default': ''}, 
        'incident_date':      {'source': 'direct', 'attribute': 'incident_date',      'default': ''}, 
        'incident_location':  {'source': 'direct', 'attribute': 'incident_location',  'default': ''},
        'incident_description': {'source': 'direct', 'attribute': 'incident_description', 'default': ''},
        'case_type':          {'source': 'direct', 'attribute': 'case_type',          'default': ''},
        'plaintiff_counsel_info': {'source': 'direct', 'attribute': 'plaintiff_counsel_info', 'default': ''},
        'vehicle_details':     {'source': 'direct', 'attribute': 'vehicle_details',    'default': ''},
        'acting_attorney':     {'source': 'direct', 'attribute': 'acting_attorney',    'default': ''},
        'acting_clerk':        {'source': 'direct', 'attribute': 'acting_clerk',       'default': ''},
        # Defendant counsel fields
        'defendant_counsel_attorneys': {'source': 'direct', 'attribute': 'defendant_counsel_attorneys', 'default': ''},
        'defendant_counsel_firm': {'source': 'direct', 'attribute': 'defendant_counsel_firm', 'default': ''},
        'defendant_counsel_address': {'source': 'direct', 'attribute': 'defendant_counsel_address', 'default': ''},
        'defendant_counsel_email': {'source': 'direct', 'attribute': 'defendant_counsel_email', 'default': ''},
        'defendant_counsel_phone': {'source': 'direct', 'attribute': 'defendant_counsel_phone', 'default': ''},
        'defendant_counsel_info': {'source': 'direct', 'attribute': 'defendant_counsel_info', 'default': ''},
        # New defendant fields
        'defendants':          {'source': 'direct', 'attribute': 'defendants',         'default': {}},
        'active_defendant':    {'source': 'direct', 'attribute': 'active_defendant',   'default': ''},
        'current_date':        {'source': 'direct', 'attribute': 'current_date',       'default': ''},
        'current_year':        {'source': 'direct', 'attribute': 'current_year',       'default': ''},
        'responses':           {'source': 'direct', 'attribute': 'responses',          'default': {}}
    },

    # --- Configuration for RFP1_template.docx ---
    'RFP1_template.docx': {
        'plaintiff':          {'source': 'direct', 'attribute': 'plaintiff',          'default': ''},
        'defendant':          {'source': 'direct', 'attribute': 'defendant',          'default': ''},
        'case_number':        {'source': 'direct', 'attribute': 'case_number',        'default': ''},
        'judge':              {'source': 'direct', 'attribute': 'judge',              'default': ''},
        'jurisdiction':       {'source': 'direct', 'attribute': 'jurisdiction',       'default': ''},
        'county':             {'source': 'direct', 'attribute': 'county',             'default': ''},
        'filing_date':        {'source': 'direct', 'attribute': 'filing_date',        'default': ''}, 
        'trial_date':         {'source': 'direct', 'attribute': 'trial_date',         'default': ''}, 
        'incident_date':      {'source': 'direct', 'attribute': 'incident_date',      'default': ''}, 
        'incident_location':  {'source': 'direct', 'attribute': 'incident_location',  'default': ''},
        'incident_description': {'source': 'direct', 'attribute': 'incident_description', 'default': ''},
        'case_type':          {'source': 'direct', 'attribute': 'case_type',          'default': ''},
        'plaintiff_counsel_info': {'source': 'direct', 'attribute': 'plaintiff_counsel_info', 'default': ''},
        'vehicle_details':     {'source': 'direct', 'attribute': 'vehicle_details',    'default': ''},
        'acting_attorney':     {'source': 'direct', 'attribute': 'acting_attorney',    'default': ''},
        'acting_clerk':        {'source': 'direct', 'attribute': 'acting_clerk',       'default': ''},
        # Defendant counsel fields
        'defendant_counsel_attorneys': {'source': 'direct', 'attribute': 'defendant_counsel_attorneys', 'default': ''},
        'defendant_counsel_firm': {'source': 'direct', 'attribute': 'defendant_counsel_firm', 'default': ''},
        'defendant_counsel_address': {'source': 'direct', 'attribute': 'defendant_counsel_address', 'default': ''},
        'defendant_counsel_email': {'source': 'direct', 'attribute': 'defendant_counsel_email', 'default': ''},
        'defendant_counsel_phone': {'source': 'direct', 'attribute': 'defendant_counsel_phone', 'default': ''},
        'defendant_counsel_info': {'source': 'direct', 'attribute': 'defendant_counsel_info', 'default': ''},
        # New defendant fields
        'defendants':          {'source': 'direct', 'attribute': 'defendants',         'default': {}},
        'active_defendant':    {'source': 'direct', 'attribute': 'active_defendant',   'default': ''},
        'current_date':        {'source': 'direct', 'attribute': 'current_date',       'default': ''},
        'current_year':        {'source': 'direct', 'attribute': 'current_year',       'default': ''},
        'responses':           {'source': 'direct', 'attribute': 'responses',          'default': {}}
    },

    # --- Configuration for demand_letter_template.docx (EXAMPLE) ---
    'demand_letter_template.docx': {
        # Read from direct columns
        'plaintiff':          {'source': 'direct', 'attribute': 'plaintiff',          'default': 'Valued Client'},
        'defendant':          {'source': 'direct', 'attribute': 'defendant',          'default': 'Opposing Party'},
        'case_number':        {'source': 'direct', 'attribute': 'case_number',        'default': 'N/A'},
         # Read from case_details JSON (ensure keys 'demand_amount', 'demand_deadline_date' exist in your JSON)
        'amount_demanded':    {'source': 'case_details', 'key': 'demand_amount',        'default': '[AMOUNT]'},
        'demand_deadline':    {'source': 'case_details', 'key': 'demand_deadline_date', 'default': '[DATE]'},
        # New defendant fields
        'defendants':          {'source': 'direct', 'attribute': 'defendants',         'default': {}},
        'active_defendant':    {'source': 'direct', 'attribute': 'active_defendant',   'default': ''},
    },

     # --- Configuration for case_summary_template.docx (EXAMPLE) ---
     'case_summary_template.docx': {
        'plaintiff':          {'source': 'direct', 'attribute': 'plaintiff', 'default': ''},
        'defendant':          {'source': 'direct', 'attribute': 'defendant', 'default': ''},
        'case_number':        {'source': 'direct', 'attribute': 'case_number', 'default': 'N/A'},
         # Read summary from case_details JSON (ensure key 'summary' exists in your JSON)
        'summary':            {'source': 'case_details', 'key': 'summary', 'default': 'No summary available.'},
        # New defendant fields
        'defendants':          {'source': 'direct', 'attribute': 'defendants',         'default': {}},
        'active_defendant':    {'source': 'direct', 'attribute': 'active_defendant',   'default': ''},
     }
    # --- Add entries for your other templates here ---
}
# === END REPLACEMENT ===
# == Case Management Endpoints ==

# Consolidated route for /cases handling GET and POST (relative to /api prefix)
@bp.route('/cases', methods=['GET', 'POST'])
@login_required
def handle_cases():
    """Handles fetching all cases (GET) and creating a new case (POST)."""
    if request.method == 'GET':
        # --- GET Logic (Serialization using output schema) ---
        print("--- Handling GET /api/cases (Blueprint) ---")
        try:
            cases = Case.query.filter_by(user_id=current_user.id).order_by(Case.display_name).all()
            result = cases_schema.dump(cases)
            return jsonify(result)
        except Exception as e:
            print(f"Error fetching cases: {e}")
            return jsonify({'error': 'Failed to fetch cases'}), 500

    elif request.method == 'POST':
        # --- POST Logic (Validation using input schema, call service, Serialization using output schema) ---
        print("--- Handling POST /api/cases (Blueprint - AUTH REQUIRED by user {current_user.id}) ---") # Added user logging
        request_data = request.get_json()
        if not request_data:
            return jsonify({'error': 'No data provided'}), 400

        # ---### START CHANGE ###---
        # 1. Validate input data using the specific CREATE input schema
        try:
            # Use validate() which doesn't require session or instance
            errors = case_create_input_schema.validate(request_data) # Use create schema
            if errors:
                print(f"Validation Error on Case Create: {errors}")
                return jsonify({'error': 'Validation failed', 'messages': errors}), 400
            # Data is structurally valid according to CaseCreateInputSchema
        except Exception as val_err:
             print(f"Error during validation call: {val_err}")
             return jsonify({'error': 'Data validation process failed'}), 500

        # 2. Call the service function with the original (now validated) data
        try:
            # Pass the original request_data dictionary to the service
            new_case = create_case(request_data, user_id=current_user.id)

            # 3. Serialize the successful response using the standard OUTPUT schema
            result = case_schema.dump(new_case)
            return jsonify(result), 201 # Created

        # Handle specific errors raised by the service
        except ValueError as e: return jsonify({'error': str(e)}), 400 # e.g., display_name empty
        except DuplicateCaseError as e: return jsonify({'error': str(e)}), 409
        except CaseServiceError as e: return jsonify({'error': str(e)}), 500
        except Exception as e:
            print(f"Unexpected error handling POST /api/cases: {e}")
            # Potentially rollback if service didn't already
            # db.session.rollback()
            return jsonify({'error': 'An unexpected error occurred'}), 500
        # ---### END CHANGE ###---
        
    return jsonify({'error': 'Method not allowed'}), 405

# Route for getting ONE specific case
@bp.route('/cases/<int:case_id>', methods=['GET'])
@login_required
def get_case_details(case_id):
    """Fetches details for a specific case."""
    print(f"--- Handling GET /api/cases/{case_id} (AUTH REQUIRED) ---")
    try:
        # Use .first_or_404() for slightly cleaner handling
        target_case = get_case_by_id(case_id, user_id=current_user.id)
        if target_case is None:
            return jsonify({'error': 'Case not found'}), 404
            
        # Add debug prints
        print(f"DEBUG: Retrieved case {case_id} from database")
        print(f"DEBUG: Case details: {target_case.case_details}")
        
        # Serialize the case object using the schema
        result = case_schema.dump(target_case)
        print(f"DEBUG: Serialized case data: {result}")
        return jsonify(result)
    except Forbidden as e: return jsonify({'error': str(e) or 'Permission denied'}), 403
    except Exception as e:
        print(f"Error fetching case {case_id}: {e}")
        return jsonify({'error': 'Failed to fetch case details'}), 500


# For your PUT request handler:
@bp.route('/cases/<int:case_id>', methods=['PUT'])
@login_required
def update_case_details(case_id):
    """Updates details for a specific case using service."""
    print(f"--- Handling PUT /api/cases/{case_id} (AUTH REQUIRED by user {current_user.id}) ---")
    data = request.get_json()  # Use a consistent variable name
    if not data:
        return jsonify({'error': 'No update data provided'}), 400
    
    case_details = data.pop('case_details', None)

    try:
        # First verify the case exists and belongs to the user
        case = get_case_by_id(case_id, user_id=current_user.id)
        if not case:
            return jsonify({'error': 'Case not found'}), 404
            
        # Validate the data structure
        errors = case_update_input_schema.validate(data, partial=True)
        if errors:
            return jsonify({'error': 'Validation failed', 'messages': errors}), 400
        
        # Put case_details back into data 
        if case_details is not None:
            data['case_details'] = case_details
            
        # Call the update service with the validated data
        updated_case = update_case(case_id, data, user_id=current_user.id)  # Use the same variable name
        
        # Serialize the result
        result = case_schema.dump(updated_case)
        return jsonify(result)
        
    except ValidationError as err:
        return jsonify({'error': 'Validation failed', 'messages': err.messages}), 400
    except CaseNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Forbidden as e:
        return jsonify({'error': str(e) or 'Permission denied'}), 403
    except Exception as e:
        print(f"Error updating case: {e}")
        return jsonify({'error': str(e)}), 500
    


@bp.route('/cases/<int:case_id>', methods=['DELETE'])
@login_required # <-- ADD THIS decorator
def delete_case_and_documents(case_id):
    """Deletes a case (DB via service) and associated documents/files."""
    print(f"--- Handling DELETE /api/cases/{case_id} (AUTH REQUIRED) ---")

    # We need file paths *before* deleting the case record
    try:
        # --- MODIFIED: Fetch case AND verify ownership first ---
        case_to_delete = get_case_by_id(case_id, user_id=current_user.id)
        file_paths_to_delete = [doc.file_path for doc in case_to_delete.documents if doc.file_path]
        print(f"Identified files for potential deletion: {file_paths_to_delete}")

        # --- MODIFIED: Call delete service, passing user_id ---
        delete_successful = delete_case(case_id, user_id=current_user.id)

        if not delete_successful: raise CaseServiceError("Case service reported delete failure.")

        # --- File deletion logic (keep your existing logic here) ---
        # ... your loop to os.remove(file_path) ...
        print(f"Attempting to delete files...") # Example log
        # ...
        message = f'Case {case_id} deleted successfully...' # Your success message logic

        return jsonify({'message': message}), 200

    except CaseNotFoundError as e: return jsonify({'error': str(e)}), 404
    except Forbidden as e: return jsonify({'error': str(e) or 'Permission denied'}), 403 # <-- ADDED handling
    except CaseServiceError as e: return jsonify({'error': str(e)}), 500
    except Exception as e:
         print(f"Error fetching case/doc paths for deletion {case_id}: {e}")
         return jsonify({'error': 'Failed to retrieve case/document info for deletion'}), 500

    
# === Add this new route for Word document generation ===

@bp.route('/cases/<int:case_id>/download_word_document', methods=['POST'])
@login_required # <-- ADDED decorator
def download_word_document(case_id):
    """
    Generates and sends a Word document based on a template name
    provided in the request body.
    """
    print(f"--- Handling POST /api/cases/{case_id}/download_word_document (AUTH REQUIRED by user {current_user.id}) ---")

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
        case_data = get_case_by_id(case_id=case_id, user_id=current_user.id)
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
# === Function: build_dynamic_context in backend/api/cases.py ===
# Make sure 'import datetime' is at the top of the file

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
            # --- Get value based on source (Keep your existing logic) ---
            if source == 'case_details':
                key = config.get('key')
                if key:
                    current_level = details_dict
                    nested_keys = key.split('.')
                    for i, nested_key in enumerate(nested_keys):
                         if isinstance(current_level, dict):
                             if i == len(nested_keys) - 1: value_found = current_level.get(nested_key)
                             else: current_level = current_level.get(nested_key)
                             if current_level is None: break
                         else: value_found = None; break
                else:
                     print(f"Warning: Missing 'key' in config for {context_key} (source: case_details)")

            elif source == 'direct':
                attribute = config.get('attribute')
                if attribute:
                    value_found = getattr(case_data, attribute, None)
                else:
                     print(f"Warning: Missing 'attribute' in config for {context_key} (source: direct)")
            # --- End Get value ---


            # ---### START CHANGE: Format Date Objects ###---
            # Store the potentially formatted value
            value_to_use_in_context = value_found

            # Check if the found value is a date object (and not a datetime object)
            if isinstance(value_found, datetime.date) and not isinstance(value_found, datetime.datetime):
                try:
                    # Format as "Month day, year"
                    value_to_use_in_context = value_found.strftime('%B %d, %Y')
                    print(f"Formatted date for key '{context_key}': {value_to_use_in_context}") # Added log
                except ValueError:
                     # Handle potential errors with date formatting if needed
                     print(f"Warning: Could not format date {value_found} for key {context_key}. Using original or default.")
                     value_to_use_in_context = value_found # Revert to original on format error
            # ---### END CHANGE ###---


            # --- Determine the default value if needed ---
            default_to_use = None
            if callable(default_value_config):
                 # ... (Keep your existing lambda default logic) ...
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
            # Use the potentially FORMATTED value if it's not None, otherwise use the calculated default
            context[context_key] = value_to_use_in_context if value_to_use_in_context is not None else default_to_use

        except Exception as e:
             # ... (Keep your existing error handling for key processing) ...
             print(f"Error processing context key '{context_key}' for template '{template_name}': {e}")
             default_to_use_on_error = default_value_config if not callable(default_value_config) else ''
             context[context_key] = default_to_use_on_error

    return context
# === End Function ===