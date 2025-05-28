"""
Formatters for different types of discovery responses.
"""
from typing import Dict, Any, List
import json
import logging
from datetime import datetime

from backend.services.analysis_service import call_gemini_with_prompt, AnalysisServiceError

logger = logging.getLogger(__name__)

def validate_responses(responses: Dict[str, str]) -> bool:
    """
    Validate the format of client responses.
    
    Args:
        responses: Dictionary of question numbers to responses
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not isinstance(responses, dict):
        logger.error("Responses must be a dictionary")
        return False
        
    for question_num, response in responses.items():
        if not isinstance(question_num, str) or not isinstance(response, str):
            logger.error(f"Invalid response format for question {question_num}")
            return False
            
        # Validate question number format (e.g., "1.5", "2.0")
        if not all(c.isdigit() or c == '.' for c in question_num):
            logger.error(f"Invalid question number format: {question_num}")
            return False
            
    return True

def format_form_interrogatory_responses(client_answers: Dict[str, str], case_details: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format client answers for form interrogatories using AI.
    
    Args:
        client_answers: Dict where keys are question numbers (e.g., "1.5", "2.0")
                       and values are the client's raw answers
        case_details: Dictionary containing case information
    
    Returns:
        Dict with formatted responses and metadata
    """
    logger.info(f"Formatting form interrogatory responses for case {case_details.get('case_id')}")
    
    # Validate inputs
    if not validate_responses(client_answers):
        raise ValueError("Invalid response format")
        
    prompt = f"""
    You are a legal assistant formatting responses to form interrogatories.
    
    CASE INFORMATION:
    {json.dumps(case_details, indent=2)}
    
    CLIENT ANSWERS:
    {json.dumps(client_answers, indent=2)}
    
    INSTRUCTIONS:
    1. For each question number in the client answers:
       - Format the response according to the question's built-in format
       - If the question has subparts (a, b, c), maintain that list format
       - If no specific format is requested, keep as normal sentences
       - Keep the response clear and concise
    
    2. Do NOT add any objections or "Subject to and without waiving" clauses
       - The template already includes these
       - Just format the substantive response
    
    3. For medical records sections (typically questions 6.4, 6.5, 6.6):
       - Format as a clear, structured list
       - Include all provider information
       - List dates and amounts clearly
    
    4. For income loss sections (typically questions 8.1-8.8):
       - Format dates clearly
       - List amounts with proper currency formatting
       - Include clear calculations where provided
    
    Return the formatted responses as a JSON object where:
    - Keys are the question numbers (e.g., "1.5", "2.0")
    - Values are the professionally formatted responses
    """
    
    try:
        logger.debug("Calling Gemini AI for response formatting")
        response = call_gemini_with_prompt(prompt)
        
        logger.debug("Parsing AI response as JSON")
        formatted_responses = json.loads(response)
        
        # Validate formatted responses
        if not validate_responses(formatted_responses):
            raise ValueError("AI returned invalid response format")
        
        # Add metadata
        result = {
            'responses': formatted_responses,
            'metadata': {
                'formatted_at': datetime.utcnow().isoformat(),
                'case_id': case_details.get('case_id'),
                'version': '1.0',
                'question_count': len(formatted_responses)
            }
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to format form interrogatory responses: {str(e)}", exc_info=True)
        raise AnalysisServiceError(f"Failed to format form interrogatory responses: {str(e)}")

def format_medical_records(medical_data: Dict[str, List[Dict]]) -> Dict[str, Any]:
    """
    Format medical records into structured lists for form interrogatories.
    
    Args:
        medical_data: Dict containing medical provider information
    
    Returns:
        Dict with formatted medical records and metadata
    """
    logger.info("Formatting medical records for form interrogatories")
    
    prompt = f"""
    You are a legal assistant formatting medical records for form interrogatories.
    
    MEDICAL RECORDS DATA:
    {json.dumps(medical_data, indent=2)}
    
    INSTRUCTIONS:
    1. Format each medical provider's information as a structured list:
       a) Provider Information:
          - Name
          - Address
          - Phone Number
       b) Treatment Dates:
          - List all dates in chronological order
       c) Amount:
          - Format as currency
       d) Additional Notes:
          - Include any relevant notes
    
    2. For each provider, create a clear, professional list format suitable for legal documents.
    
    3. Ensure all information is properly formatted and easy to read.
    
    4. Return the formatted responses as a JSON object where:
       - Keys are the question numbers (e.g., "6.4", "6.5", "6.6")
       - Values are the professionally formatted lists
    """
    
    try:
        logger.debug("Calling Gemini AI for medical records formatting")
        response = call_gemini_with_prompt(prompt)
        
        logger.debug("Parsing AI response as JSON")
        formatted_medical = json.loads(response)
        
        # Validate formatted responses
        if not validate_responses(formatted_medical):
            raise ValueError("AI returned invalid medical records format")
        
        # Add metadata
        result = {
            'responses': formatted_medical,
            'metadata': {
                'formatted_at': datetime.utcnow().isoformat(),
                'version': '1.0',
                'provider_count': len(medical_data),
                'question_count': len(formatted_medical)
            }
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to format medical records: {str(e)}", exc_info=True)
        raise AnalysisServiceError(f"Failed to format medical records: {str(e)}") 