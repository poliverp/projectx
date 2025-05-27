"""
Service class for orchestrating discovery document processing.
Enhanced to handle different document formats and improve debugging.
"""
from typing import Dict, Any, List, Optional
import os
import io
import json

from .base import DiscoveryQuestion
from .registry import get_discovery_type_info
from backend.services.analysis_service import call_gemini_with_prompt, AnalysisServiceError
from backend.schemas import case_schema


class DiscoveryResponseService:
    """
    Orchestrates parsing, prompt building, and AI call for discovery responses.
    """
    
    def respond(self, discovery_type: str, pdf_path: str, case_details: Dict, objection_sheet: str) -> Dict:
        """
        Parses the uploaded discovery PDF, builds the AI prompt, and returns parsed questions and prompt.
        Enhanced with improved error handling and debugging.
        
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
        try:
            type_info = get_discovery_type_info(discovery_type)
            parser = type_info['parser']
            prompt_builder = type_info['prompt_builder']
            
            print(f"[DEBUG] Using parser for {discovery_type}: {parser.__name__}")
            
            # Parse questions - handle both RFPs and Special Interrogatories consistently
            if discovery_type in ['requests_for_production', 'special_interrogatories']:
                # Serialize the full case object
                serialized_case = case_schema.dump(case_details) if case_details else {}
                # Pass the full objection sheet as a list of lines (or as a string)
                objections_list = [line.strip() for line in objection_sheet.split('\n') if line.strip()] if objection_sheet else []
                questions = parser(pdf_path, case_data=serialized_case, objections_list=objections_list)
            else:
                questions = parser(pdf_path)
            
            # Verify we got questions
            if not questions:
                print(f"[ERROR] Parser returned no questions for {pdf_path}")
                # Try to extract some text to help diagnose the issue
                try:
                    import fitz
                    with fitz.open(pdf_path) as doc:
                        sample_text = ""
                        for page in doc:
                            sample_text += page.get_text()[:500]
                            if len(sample_text) >= 500:
                                break
                        print(f"[DEBUG] Sample text from PDF: {sample_text[:500]}")
                except Exception as e:
                    print(f"[ERROR] Failed to extract sample text: {e}")
                
                # Convert questions to list of dicts for JSON serialization with type-specific error message
                return {
                    'questions': [],
                    'prompt': "",
                    'ai_response': None,
                    'ai_error': f"Failed to parse any {type_info['display_name'].lower()} from the PDF. Check if document format is supported.",
                    'discovery_type': discovery_type,
                    'display_name': type_info['display_name']
                }
            
            # Debug questions found
            print(f"[DEBUG] Parsed {len(questions)} questions")
            for i, q in enumerate(questions[:5]):  # Log first 5 for debugging
                print(f"[DEBUG] Question {i+1}: #{q.number} - {q.text[:100]}")
            
            # Convert questions to list of dicts for JSON serialization
            questions_list = [q.to_dict() for q in questions]
            print(f"[DEBUG] Converted questions to dict format, count: {len(questions_list)}")
            
            # Build prompt
            prompt = prompt_builder(questions, case_details, objection_sheet)
            print(f"[DEBUG] Prompt built, length: {len(prompt)}")
            
            # Call Gemini AI with the prompt
            ai_response = None
            ai_error = None
            
            try:
                if prompt:
                    print(f"[DEBUG] Calling Gemini AI with prompt")
                    ai_response = call_gemini_with_prompt(prompt)
                    print(f"[DEBUG] AI response received, length: {len(ai_response) if ai_response else 0}")
                else:
                    ai_error = f"Failed to generate prompt for {type_info['display_name'].lower()}"
            except AnalysisServiceError as e:
                ai_error = str(e)
                print(f"[ERROR] Analysis service error: {ai_error}")
            except Exception as e:
                ai_error = f"Unexpected error processing {type_info['display_name'].lower()}: {e}"
                print(f"[ERROR] Unexpected error: {ai_error}")
            
            return {
                'questions': questions_list,
                'prompt': prompt,
                'ai_response': ai_response,
                'ai_error': ai_error,
                'discovery_type': discovery_type,
                'display_name': type_info['display_name']
            }
        
        except Exception as e:
            import traceback
            error_message = f"Error processing {type_info['display_name'].lower()}: {str(e)}"
            error_trace = traceback.format_exc()
            print(f"[ERROR] {error_message}")
            print(f"[ERROR] {error_trace}")
            
            return {
                'questions': [],
                'prompt': "",
                'ai_response': None,
                'ai_error': error_message,
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