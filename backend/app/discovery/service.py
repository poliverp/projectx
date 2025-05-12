"""
Service class for orchestrating discovery document processing.
"""
from typing import Dict, Any, List, Optional
import os
import io

from .base import DiscoveryQuestion
from .registry import get_discovery_type_info
from backend.services.analysis_service import call_gemini_with_prompt, AnalysisServiceError


class DiscoveryResponseService:
    """
    Orchestrates parsing, prompt building, and AI call for discovery responses.
    """
    
    def respond(self, discovery_type: str, pdf_path: str, case_details: Dict, objection_sheet: str) -> Dict:
        """
        Parses the uploaded discovery PDF, builds the AI prompt, and returns parsed questions and prompt.
        
        Args:
            discovery_type: Type of discovery (e.g., 'form_interrogatories')
            pdf_path: Path to the uploaded PDF
            case_details: Dictionary containing case information
            objection_sheet: Text content of objection master sheet
            
        Returns:
            Dictionary containing 'questions', 'prompt', 'ai_response', and 'ai_error'
            
        Raises:
            ValueError: If discovery_type is not supported
        """
        # Get parser and prompt builder from registry
        type_info = get_discovery_type_info(discovery_type)
        parser = type_info['parser']
        prompt_builder = type_info['prompt_builder']
        
        # Parse questions
        questions = parser(pdf_path)
        print("[DEBUG] Parsed questions:", questions)
        
        # Build prompt
        prompt = prompt_builder(questions, case_details, objection_sheet)
        print("[DEBUG] Prompt sent to Gemini:\n", prompt)
        
        # Call Gemini AI with the prompt
        ai_response = None
        ai_error = None
        try:
            ai_response = call_gemini_with_prompt(prompt)
        except AnalysisServiceError as e:
            ai_error = str(e)
        except Exception as e:
            ai_error = f"Unexpected error: {e}"
        
        return {
            'questions': questions,
            'prompt': prompt,
            'ai_response': ai_response,
            'ai_error': ai_error,
            'discovery_type': discovery_type,
            'display_name': type_info['display_name']
        }
    
    def create_response_document(self, discovery_type: str, questions: List[DiscoveryQuestion], 
                                responses: Dict, case_info: Dict) -> io.BytesIO:
        """
        Creates a formatted Word document with the responses.
        
        Args:
            discovery_type: Type of discovery document
            questions: List of parsed questions
            responses: AI-generated responses
            case_info: Information about the case
            
        Returns:
            BytesIO stream containing the generated document
            
        Note:
            This is a placeholder method. Implement the actual document generation.
        """
        # Get discovery type info
        type_info = get_discovery_type_info(discovery_type)
        
        # TODO: Implement document generation
        # from docx import Document
        # doc = Document()
        # ...
        # output = io.BytesIO()
        # doc.save(output)
        # output.seek(0)
        # return output
        
        # For now, return empty BytesIO
        return io.BytesIO()