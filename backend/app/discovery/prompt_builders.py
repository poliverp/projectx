"""
Prompt builders for different types of discovery documents.
"""
from typing import List, Dict, Any, Optional
from .base import DiscoveryQuestion, BasePromptBuilder, format_bold_underline


class GeneralPromptBuilder:
    """Base implementation with shared prompt building logic for discovery documents."""
    
    @classmethod
    def build_prompt(cls, 
                     questions: List[DiscoveryQuestion], 
                     case_details: Dict, 
                     objection_sheet: str,
                     request_type: str,
                     response_type: str) -> str:
        """
        Generic prompt builder for discovery documents.
        
        Args:
            questions: List of discovery questions to respond to
            case_details: Dictionary containing case information
            objection_sheet: Text content of objection master sheet
            request_type: Type of request (e.g., "Request for Production No.")
            response_type: Type of response (e.g., "Response to Request for Production No.")
            
        Returns:
            Formatted prompt string for the AI
        """
        prompt = []
        
        # Case details section
        prompt.append(format_bold_underline("Case Details:") + f"\n{case_details}\n")
        
        # Objection master sheet section
        prompt.append(format_bold_underline("Objection Master Sheet:") + f"\n{objection_sheet}\n")
        
        # Instructions
        prompt.append(format_bold_underline("Instructions:") + 
                     "\nFormat each response as follows: Headers bolded/underlined with colons, " + 
                     "objections as paragraphs, answers as indented paragraphs, subparts as lists. " +
                     "If you cannot answer, output a 'call sheet' for missing info.\n")
        
        # Questions section
        for q in questions:
            prompt.append(format_bold_underline(f"{request_type} {q.number}:") + f"\n{q.text}\n")
            prompt.append(format_bold_underline("Objection:") + "\n[Insert objection paragraph here]\n")
            
            if q.subparts:
                prompt.append(format_bold_underline("Answer:") + "\n" + 
                             "\n".join([f"    ({chr(97+i)}) [Insert answer for subpart]" 
                                      for i, _ in enumerate(q.subparts)]))
            else:
                prompt.append(format_bold_underline("Answer:") + 
                            "\n    [Insert answer paragraph here]\n")
            prompt.append("")
        
        # Call sheet placeholder
        prompt.append(format_bold_underline("Call Sheet:") + 
                    "\n[List any missing information needed to answer above questions]\n")

        # Explicit AI instruction
        prompt.append(
            "INSTRUCTIONS FOR AI: For each question above, fill in the placeholders (e.g., [Insert objection paragraph here], [Insert answer paragraph here]) with appropriate legal objections and draft answers, using the provided objection master sheet and instructions. Do NOT repeat the objection master sheet. Output only the completed responses for each question, clearly labeled."
        )
        return "\n".join(prompt)


def build_form_interrogatories_prompt(questions: List[DiscoveryQuestion], 
                                     case_details: Dict, 
                                     objection_sheet: str) -> str:
    """
    Builds an AI prompt for generating responses to Form Interrogatories.
    
    Args:
        questions: List of discovery questions to respond to
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Formatted prompt string for the AI
    """
    return GeneralPromptBuilder.build_prompt(
        questions=questions,
        case_details=case_details,
        objection_sheet=objection_sheet,
        request_type="Form Interrogatory No.",
        response_type="Response to Form Interrogatory No."
    )


def build_special_interrogatories_prompt(questions: List[DiscoveryQuestion], 
                                        case_details: Dict, 
                                        objection_sheet: str) -> str:
    """
    Builds an AI prompt for generating responses to Special Interrogatories.
    
    Args:
        questions: List of discovery questions to respond to
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Formatted prompt string for the AI
    """
    return GeneralPromptBuilder.build_prompt(
        questions=questions,
        case_details=case_details,
        objection_sheet=objection_sheet,
        request_type="Special Interrogatory No.",
        response_type="Response to Special Interrogatory No."
    )


def build_requests_for_production_prompt(questions: List[DiscoveryQuestion], 
                                        case_details: Dict, 
                                        objection_sheet: str) -> str:
    """
    Builds an AI prompt for generating responses to Requests for Production.
    
    Args:
        questions: List of discovery questions to respond to
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Formatted prompt string for the AI
    """
    return GeneralPromptBuilder.build_prompt(
        questions=questions,
        case_details=case_details,
        objection_sheet=objection_sheet,
        request_type="Request for Production No.",
        response_type="Response to Request for Production No."
    )


def build_requests_for_admission_prompt(questions: List[DiscoveryQuestion], 
                                       case_details: Dict, 
                                       objection_sheet: str) -> str:
    """
    Builds an AI prompt for generating responses to Requests for Admission.
    
    Args:
        questions: List of discovery questions to respond to
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Formatted prompt string for the AI
    """
    return GeneralPromptBuilder.build_prompt(
        questions=questions,
        case_details=case_details,
        objection_sheet=objection_sheet,
        request_type="Request for Admission No.",
        response_type="Response to Request for Admission No."
    )