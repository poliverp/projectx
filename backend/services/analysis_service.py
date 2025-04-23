# --- backend/services/analysis_service.py ---
import time # For simulating delay
import json # For handling JSON
from flask import current_app

import google.generativeai as genai
from google.generativeai.types import GenerationConfig # For JSON mode
import traceback

# Import necessary services and exceptions
from backend.services.document_service import get_document_by_id, update_document_analysis, DocumentNotFoundError, DocumentServiceError
from backend.services.case_service import get_case_by_id, update_case, CaseNotFoundError, CaseServiceError

# --- Define Exceptions ---
class AnalysisServiceError(Exception):
    """Base exception for analysis errors."""
    pass

class NoTextToAnalyzeError(AnalysisServiceError):
    """Raised when a document has no extracted text."""
    pass

# --- Service Functions ---
def analyze_text_with_gemini(text_content):
    """
    Analyzes the provided text using the Google Gemini API,
    requesting structured JSON output.
    """
    api_key = current_app.config.get("AI_API_KEY")
    if not api_key:
        print("ERROR: AI_API_KEY not found in config.")
        raise AnalysisServiceError("AI API Key is not configured.")

    try:
        genai.configure(api_key=api_key)

        # --- Choose a Model ---
        # gemini-1.5-flash-latest is fast and capable for text tasks
        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        # --- Define the Prompt ---
        # Instruct the model clearly: context, task, desired output format (JSON!)
        # Provide an example of the desired JSON structure.
        prompt = """
            You are an expert legal assistant analyzing text extracted from legal documents.
            Analyze the following document text and extract the specified information.
            Return the extracted information ONLY as a single JSON object matching the structure below.
            Do not include any explanatory text before or after the JSON object.
            For all date fields, format the output as 'Month day, year' (e.g., "February 24, 2024") or null if not found.

            Desired JSON structure:
            {{
              "plaintiff": "string or null",
              "defendant": "string or null",
              "plaintiff_address": "string or null",
              "defendant_counsel_info": "string describing firm/lawyer contact info or null",
              "case_number_doc": "string identifying case number mentioned in doc or null",
              "court_info": {{
                "county": "string or null",
                "jurisdiction": "string or null"
              }},
              "judge_doc": "string name of judge mentioned in doc or null",
              "case_type": "string or null (e.g., 'Breach of Contract', 'Personal Injury')",
              "key_dates": {{
                "filing_date": "Month day, year string or null",
                "incident_date": "Month day, year string or null",
                "cmc_date": "Month day, year string or null",
                "trial_date": "Month day, year string or null"
              }},
              "incident_location": "string describing location or null",
              "incident_description": "string describing alleged cause/reason for incident or null",
              "general_allegations": "string summarizing general allegations or null",
              "causes_of_action": [
                "string cause 1 or null",
                "string cause 2 or null"
              ],
              "injuries_described": "string describing injuries or list[string] or null",
              "vehicle_details": "string describing relevant vehicle info (make, plate) or null",
              "drivers_license_mentioned": "boolean, true if mentioned, false/null otherwise",
              "extracted_value": "number or null (e.g., monetary amount mentioned)",
              "summary": "A brief summary of the document's core subject matter (string or null)"
            }}

            Here is the document text:
            --- START DOCUMENT TEXT ---
            {document_text}
            --- END DOCUMENT TEXT ---

            Now, provide the analysis strictly in the JSON format described above. Ensure all dates adhere to the 'Month day, year' format.
            """.format(document_text=text_content) # Inject the actual text

            # ... rest of the function (JSON config, API call, parsing) remains the same ...

        # --- Configure for JSON Output ---
        json_output_config = GenerationConfig(response_mime_type="application/json")

                # --- ADD DEBUG PRINTS ---
        print(f"--- Text Content Type: {type(text_content)} ---")
        print(f"--- Prompt Start (first 500 chars): {prompt[:500]}...")

        # --- Make the API Call ---
        print(f"--- Calling Gemini API (Model: {model.model_name}) ---")
        start_time = time.time()
        response = model.generate_content(
            prompt,
            generation_config=json_output_config
            # You might add safety_settings here if needed later
        )
        end_time = time.time()
        print(f"--- Gemini API Call took {end_time - start_time:.2f} seconds ---")

        # --- Parse the Response ---
        # Because we requested JSON, response.text should be a JSON string
        response_text = response.text
        print(f"--- Gemini Raw Response Text: {response_text[:500]}... ---") # Log beginning of response

        parsed_json = json.loads(response_text) # Parse the JSON string into a Python dict

        # Add status/metadata if desired (optional)
        parsed_json['analysis_metadata'] = {
             'model_used': model.model_name,
             'response_time_sec': round(end_time - start_time, 2),
             'status': 'success' # Assume success if parsing worked
        }

        return parsed_json # Return the Python dictionary

    except json.JSONDecodeError as e:
         print(f"ERROR: Failed to parse JSON response from Gemini: {e}")
         print(f"Gemini Raw Text was: {response_text}")
         raise AnalysisServiceError("Failed to parse analysis result from AI.") from e
    except Exception as e:
        # --- MODIFY THIS BLOCK ---
        print(f"ERROR: AI API call failed unexpectedly.")
        print(f"Caught Exception Type: {type(e)}") # Print the type of exception
        print(f"Caught Exception Args: {e.args}") # Print the arguments of the exception
        print("--- Full Traceback ---")
        traceback.print_exc() # Print the full stack trace
        print("--- End Traceback ---")
        raise AnalysisServiceError("Analysis failed due to an API error.") from e
        # -------------------------




# --- backend/services/analysis_service.py ---
# ... (imports and other functions remain the same) ...

def trigger_analysis_and_update(document_id):
    """
    Orchestrates fetching doc, calling Gemini for analysis, updating
    document record, and storing suggestions in the Case record.
    """
    print(f"Analysis requested for document ID: {document_id}")
    try:
        # 1. Get Document and Text (Remains the same)
        doc = get_document_by_id(document_id)
        if not doc.extracted_text:
            raise NoTextToAnalyzeError(f"Document {document_id} has no extracted text.")

        # 2. Perform Analysis (using REAL Gemini API) (Remains the same)
        analysis_result_json = analyze_text_with_gemini(doc.extracted_text)

        # 3. Update Document Record with FULL Analysis Result (Remains the same)
        update_document_analysis(document_id, analysis_result_json)

        # --- START REPLACEMENT for Step #4 ---
        # 4. Store Extracted Fields as Pending Suggestions in Case Record
        try:
            case_id = doc.case_id
            current_case = get_case_by_id(case_id)
            current_details = dict(current_case.case_details or {}) # Get existing details

            updated_case_details = False # Flag

            # Check if analysis_result_json is a dictionary
            if isinstance(analysis_result_json, dict):

                # Prepare the suggestion data: create a copy and remove our metadata
                suggestion_data = analysis_result_json.copy()
                suggestion_data.pop('analysis_metadata', None) # Remove metadata key if it exists

                # Ensure 'pending_suggestions' key exists
                if 'pending_suggestions' not in current_details:
                    current_details['pending_suggestions'] = {}

                # Store the suggestion data under a key for this document
                suggestion_key = f'doc_{document_id}'
                current_details['pending_suggestions'][suggestion_key] = suggestion_data # Store dict without metadata
                print(f"Stored suggestions for {suggestion_key} in case {case_id}")
                updated_case_details = True

                # Add/Update metadata directly in case_details
                if 'analysis_metadata' in analysis_result_json:
                    current_details['last_analysis_metadata'] = analysis_result_json['analysis_metadata']
                    updated_case_details = True # Ensure update happens even if only metadata changed

                current_details['last_analyzed_doc_id'] = document_id
                updated_case_details = True # Always update this tracker

            # Only call update_case if changes were made
            if updated_case_details:
                case_update_data = {'case_details': current_details}
                # (Keep the debug prints around update_case if you want)
                print("--- DEBUG: Preparing to update case_details with:")
                print(json.dumps(current_details, indent=2))
                update_case(case_id, case_update_data)
                print(f"--- DEBUG: update_case call completed for case {case_id} ---")
                print(f"Case {case_id} details updated with pending suggestions/metadata for doc {document_id}")
            else:
                print(f"Analysis for doc {document_id} did not yield a dictionary result to store as suggestions in case {case_id}.")

        except (CaseNotFoundError, CaseServiceError) as e:
             print(f"Warning: Could not update case {doc.case_id} with suggestions after analysis: {e}")
        except Exception as e:
             print(f"Unexpected error storing suggestions in case {doc.case_id} after analysis: {e}")
             traceback.print_exc() # Keep traceback for this unexpected block
        # --- END REPLACEMENT for Step #4 ---
        return analysis_result_json # Return the raw analysis result

    except (DocumentNotFoundError, NoTextToAnalyzeError) as e:
        raise e
    except Exception as e:
        print(f"Error during analysis orchestration for doc {document_id}: {e}")
        raise AnalysisServiceError(f"Analysis failed for document {document_id}") from e