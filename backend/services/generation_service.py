# --- backend/services/generation_service.py ---

import json
import time
from flask import current_app
import google.generativeai as genai
from flask_login import current_user # <--- ADD THIS IMPORT

from backend.services.case_service import get_case_by_id, CaseNotFoundError, CaseServiceError

class GenerationServiceError(Exception): pass
class InvalidDocumentTypeError(GenerationServiceError): pass # New specific error
class AnsweringServiceError(Exception): pass

STANDARD_OBJECTIONS = {
    "VAGUE_AMBIGUOUS": "Objection: This interrogatory is vague and ambiguous.",
    "OVERLY_BROAD": "Objection: This interrogatory is overly broad in scope and time.",
    "UNDULY_BURDENSOME": "Objection: This interrogatory is unduly burdensome and harassing.",
    "PRIVILEGED_ATTORNEY_CLIENT": "Objection: This interrogatory seeks information protected by the attorney-client privilege.",
    "PRIVILEGED_WORK_PRODUCT": "Objection: This interrogatory seeks information protected by the attorney work product doctrine.",
    "NOT_RELEVANT": "Objection: This interrogatory seeks information that is not relevant to the subject matter of this action and is not reasonably calculated to lead to the discovery of admissible evidence.",
    "CALLS_FOR_LEGAL_CONCLUSION": "Objection: This interrogatory calls for a legal conclusion.",
    "PREMATURE": "Objection: This interrogatory is premature as discovery is ongoing.",
    # --- ADD MORE of your standard objections here ---
    # Use a unique key (like "VAGUE_AMBIGUOUS") for each phrase.
}

def answer_interrogatory(case_id, interrogatory_text):
    """
    Generates objections and an answer for a given interrogatory based on case data.
    Args:
        case_id (int): The ID of the case.
        interrogatory_text (str): The text of the interrogatory to answer.
    Returns:
        str: A string containing selected objections and the generated answer.
    Raises:
        CaseNotFoundError: If the case_id is not found.
        AnsweringServiceError: For errors during the process.
    """
    print(f"--- Received request to answer interrogatory for Case ID: {case_id} ---")
    print(f"Interrogatory Text: {interrogatory_text}")

   # --- Step 1: Fetch Case Data ---
    try:
        case = get_case_by_id(case_id)
        # Combine top-level fields and the case_details JSON blob for context
        # Adjust this based on how get_case_by_id returns data and what's in your Case model
        case_data_for_prompt = {
            "display_name": case.display_name,
            "official_case_name": case.official_case_name,
            "case_number": case.case_number,
            "judge": case.judge,
            "plaintiff": case.plaintiff,
            "defendant": case.defendant,
            **(case.case_details or {}) # Merge the JSON blob, handle if it's None
        }
        # Remove pending suggestions if they exist, we don't want the AI answering based on those
        case_data_for_prompt.pop('pending_suggestions', None)

        # Convert the combined data to a JSON string for the prompt
        case_details_str = json.dumps(case_data_for_prompt, indent=2)
        print(f"Successfully fetched case data for Case ID: {case_id}")

    except CaseNotFoundError:
        print(f"ERROR: Case not found for Case ID: {case_id}")
        # Re-raise the specific error so the calling route can handle it (e.g., return 404)
        raise
    except Exception as e:
        # Catch other potential errors during data fetching/processing
        print(f"ERROR: Failed to fetch or process case data for Case ID: {case_id} - {e}")
        raise AnsweringServiceError(f"Failed to retrieve data for case {case_id}") from e

    # --- Step 2: Construct Prompt (We'll implement this next) ---
    # Placeholder for now
    prompt = f"Placeholder: Construct prompt using interrogatory, objections list, and case data: {interrogatory_text}"
    print("Placeholder: Prompt constructed.")

    # --- Step 3: Call AI Model (We'll implement this next) ---
    # Placeholder for now
    ai_response_text = "Placeholder: AI response with objections and answer will go here."
    print("Placeholder: AI response generated.")

    # --- Step 4: Return combined result ---
    return ai_response_text

# --- Define Document Prompt Templates ---
# Keys should be simple identifiers used in API calls/UI dropdowns
# Values are the detailed prompts for each type
DOCUMENT_PROMPTS = {
    "case_summary": """
        Act as an expert paralegal creating a concise internal case summary.
        Based ONLY on the provided Case Details JSON, generate a summary including:
        1. Case Identification: Plaintiff vs. Defendant names, Case Number (if available).
        2. Key Allegations/Facts: Briefly summarize the core incident/dispute from the 'summary' or 'incident_description' field in the details.
        3. Key Dates: List any relevant dates found in the 'key_dates' section (formatted as Month day, year).
        4. Current Status/Next Steps: Briefly mention next steps if indicated (e.g., by CMC or trial date).
        Keep the summary objective and brief (2-3 paragraphs max). Do not add information not present in the provided details. Output only the summary text.

        Case Details:
        ```json
        {case_details_str}
        ```

        Custom Instructions:
        {custom_instructions}

        Generate the Case Summary:
        """,

    "demand_letter_simple": """
        Act as a legal assistant drafting a simple demand letter based on the provided case details.
        The letter should be addressed from the Plaintiff (or their assumed counsel) to the Defendant.
        Include the following sections clearly:
        - RE: Case Name (Plaintiff vs Defendant, Case Number if available)
        - Introduction: State the purpose of the letter (demand for compensation/resolution).
        - Brief Facts: Briefly mention the incident date and location (if available).
        - Demand: Clearly state what is being demanded (use 'extracted_value' if available, otherwise state 'appropriate compensation').
        - Deadline: Give a deadline for response (e.g., 14 days from the date of this letter - assume today's date for calculation if needed, or state 'within 14 days').
        - Consequence: Mention potential legal action if the demand is not met.
        Use a formal and professional tone. Output only the letter text.

        Case Details:
        ```json
        {case_details_str}
        ```

        Custom Instructions:
        {custom_instructions}

        Generate the Demand Letter:
        """,
    # --- Add templates for other document types here ---
    # "client_intake_summary": """ Prompt for summarizing intake info... """,
    # "notice_of_representation": """ Prompt for notice... """,
}
# ------------------------------------

# --- Modify the service function ---
def generate_document_for_case(case_id, generation_data):
    print(f"--- Real Generation Request Received ---")
    print(f"Case ID: {case_id}, User ID: {current_user.id}") # Log user_id too
    print(f"Case ID: {case_id}")
    print(f"Generation Data: {generation_data}")

    doc_type = generation_data.get('document_type')
    custom_instructions = generation_data.get('custom_instructions', 'None') # Default to 'None' string
    if not doc_type:
        raise ValueError("Missing 'document_type' in generation data.")

    # --- Select the prompt template ---
    if doc_type not in DOCUMENT_PROMPTS:
        valid_types = list(DOCUMENT_PROMPTS.keys())
        raise InvalidDocumentTypeError(f"Invalid document_type '{doc_type}'. Valid types are: {valid_types}")
    prompt_template = DOCUMENT_PROMPTS[doc_type]
    # ---------------------------------

    try:
        # 1. Fetch Case Data
        case = get_case_by_id(case_id=case_id, user_id=current_user.id)
        case_details_dict = dict(case.case_details or {})
        # Add top-level fields if needed (same as before)
        if 'display_name' not in case_details_dict: case_details_dict['display_name'] = case.display_name
        if 'case_number' not in case_details_dict: case_details_dict['case_number'] = case.case_number
        if 'plaintiff' not in case_details_dict: case_details_dict['plaintiff'] = case.plaintiff
        if 'defendant' not in case_details_dict: case_details_dict['defendant'] = case.defendant

        case_details_str = json.dumps(case_details_dict, indent=2)

        # 2. Format the *selected* prompt
        prompt = prompt_template.format(
            case_details_str=case_details_str,
            custom_instructions=custom_instructions
        )
        print(f"--- Using prompt template: {doc_type} ---")
        print(f"--- Prompt for Generation (first 500 chars): {prompt[:500]}...")


        # 3. Configure and Call Gemini API (remains the same)
        api_key = current_app.config.get("AI_API_KEY")
        if not api_key:
            raise GenerationServiceError("AI API Key is not configured.")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro-latest') # Using Pro for potentially better drafting

        print(f"--- Calling Gemini API for Generation (Model: {model.model_name}) ---")
        start_time = time.time()
        # Consider adjusting generation config for creativity/length if needed
        # generation_config = genai.types.GenerationConfig(temperature=0.7)
        response = model.generate_content(
             prompt
             # generation_config=generation_config
        )
        end_time = time.time()
        print(f"--- Gemini Generation Call took {end_time - start_time:.2f} seconds ---")

        # 4. Process Response (remains the same)
        generated_text = response.text
        print(f"--- Gemini Generated Text (first 500 chars): {generated_text[:500]}...")

        return generated_text

    # Error handling remains largely the same, but add InvalidDocumentTypeError
    except (CaseNotFoundError, InvalidDocumentTypeError, ValueError):
        raise
    except Exception as e:
        print(f"ERROR: Gemini API call failed during generation for case {case_id}, type {doc_type}: {e}")
        raise GenerationServiceError(f"Failed to generate document using AI for case {case_id}") from e