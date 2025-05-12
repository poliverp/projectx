"""
Prompt builders for different types of discovery responses.
These classes build prompts for AI to generate responses to discovery requests.
"""
from typing import List, Dict, Any
from .base import DiscoveryQuestion, BasePromptBuilder


class GeneralPromptBuilder(BasePromptBuilder):
    """Shared logic for building discovery response prompts."""
    
    @staticmethod
    def build_common_prompt_header(case_details: Dict[str, Any], discovery_type: str) -> str:
        """
        Builds a common header section for discovery prompts with case context.
        
        Args:
            case_details: Dictionary containing case information
            discovery_type: Type of discovery (e.g., 'Requests for Production')
            
        Returns:
            Formatted prompt header string
        """
        # Extract common case information
        case_name = case_details.get('display_name', 'Unknown Case')
        case_number = case_details.get('case_number', 'Unknown')
        plaintiff = case_details.get('plaintiff_name', 'Unknown Plaintiff')
        defendant = case_details.get('defendant_name', 'Unknown Defendant')
        
        prompt = f"""
        You are an experienced legal assistant helping to prepare responses to {discovery_type}.
        
        CASE INFORMATION:
        - Case Name: {case_name}
        - Case Number: {case_number}
        - Plaintiff: {plaintiff}
        - Defendant: {defendant}
        """
        
        # Add more case details if available
        if case_details.get('court_name'):
            prompt += f"\n- Court: {case_details.get('court_name')}"
        
        if case_details.get('incident_date'):
            prompt += f"\n- Incident Date: {case_details.get('incident_date')}"
            
        # Add case summary if available
        if case_details.get('case_summary'):
            prompt += f"\n\nCASE SUMMARY:\n{case_details.get('case_summary')}\n"
            
        prompt += "\n"
        return prompt
    
    @staticmethod
    def build_prompt_instructions(objection_sheet: str) -> str:
        """
        Builds instruction section for discovery prompts.
        
        Args:
            objection_sheet: Text content with standard objections
            
        Returns:
            Formatted prompt instructions string
        """
        return f"""
        INSTRUCTIONS:
        1. For each discovery request, provide a draft response that includes:
           a. Any appropriate objections (see objection guidance below)
           b. A substantive response where appropriate (even if objecting)
        2. Format each response with:
           - "RESPONSE:" followed by the full response
           - For RFPs: indicate whether documents will be produced
           - For interrogatories: provide factual information that answers the question
           - For admissions: state whether the matter is admitted, denied, or cannot be admitted or denied
        3. Use a formal, professional tone appropriate for legal documents
        
        OBJECTION GUIDANCE:
        Here are common objections you may use when appropriate:
        - Vague and ambiguous
        - Overly broad and unduly burdensome
        - Calls for speculation
        - Calls for expert opinion
        - Attorney-client privilege or work product
        - Relevance
        
        {objection_sheet[:500] + '...' if len(objection_sheet) > 500 else objection_sheet}
        """
    
    @staticmethod
    def format_questions(questions: List[DiscoveryQuestion], prefix: str) -> str:
        """
        Formats a list of discovery questions for inclusion in the prompt.
        
        Args:
            questions: List of discovery questions
            prefix: Prefix for each question (e.g., 'REQUEST FOR PRODUCTION NO.')
            
        Returns:
            Formatted questions string
        """
        formatted = "\nDISCOVERY REQUESTS TO RESPOND TO:\n\n"
        
        for question in questions:
            formatted += f"{prefix} {question.number}: {question.text}\n"
            
            # Add subparts if any
            if question.subparts:
                for i, subpart in enumerate(question.subparts):
                    subpart_letter = chr(97 + i)  # a, b, c, ...
                    formatted += f"   ({subpart_letter}) {subpart}\n"
            
            formatted += "\n"
            
        return formatted


def build_form_interrogatories_prompt(questions: List[DiscoveryQuestion], 
                                     case_details: Dict[str, Any], 
                                     objection_sheet: str) -> str:
    """
    Build prompt for responding to Form Interrogatories.
    
    Args:
        questions: List of form interrogatories
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Complete prompt for AI to generate responses
    """
    header = GeneralPromptBuilder.build_common_prompt_header(
        case_details, "Form Interrogatories"
    )
    
    instructions = GeneralPromptBuilder.build_prompt_instructions(objection_sheet)
    
    formatted_questions = GeneralPromptBuilder.format_questions(
        questions, "FORM INTERROGATORY NO."
    )
    
    return f"""
    {header}
    
    {instructions}
    
    {formatted_questions}
    
    For each form interrogatory above, please draft a complete response including any appropriate objections.
    Start each response with "RESPONSE TO FORM INTERROGATORY NO. X:" and then provide the full response.
    """


def build_special_interrogatories_prompt(questions: List[DiscoveryQuestion], 
                                        case_details: Dict[str, Any], 
                                        objection_sheet: str) -> str:
    """
    Build prompt for responding to Special Interrogatories.
    
    Args:
        questions: List of special interrogatories
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Complete prompt for AI to generate responses
    """
    header = GeneralPromptBuilder.build_common_prompt_header(
        case_details, "Special Interrogatories"
    )
    
    instructions = GeneralPromptBuilder.build_prompt_instructions(objection_sheet)
    
    formatted_questions = GeneralPromptBuilder.format_questions(
        questions, "SPECIAL INTERROGATORY NO."
    )
    
    return f"""
    {header}
    
    {instructions}
    
    {formatted_questions}
    
    For each special interrogatory above, please draft a complete response including any appropriate objections.
    Start each response with "RESPONSE TO SPECIAL INTERROGATORY NO. X:" and then provide the full response.
    """


def build_requests_for_production_prompt(questions: List[DiscoveryQuestion], 
                                       case_details: Dict[str, Any], 
                                       objection_sheet: str) -> str:
    """
    Build prompt for responding to Requests for Production.
    
    Args:
        questions: List of requests for production
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Complete prompt for AI to generate responses
    """
    header = GeneralPromptBuilder.build_common_prompt_header(
        case_details, "Requests for Production of Documents"
    )
    
    instructions = GeneralPromptBuilder.build_prompt_instructions(objection_sheet)
    
    # Additional RFP-specific instructions
    rfp_instructions = """
    For Requests for Production specifically:
    1. Indicate whether documents will be produced or if there are no responsive documents
    2. If objecting, clearly state whether the objection is to all or part of the request
    3. For each request where documents will be produced, specify "Defendant will produce responsive, non-privileged documents"
    """
    
    formatted_questions = GeneralPromptBuilder.format_questions(
        questions, "REQUEST FOR PRODUCTION NO."
    )
    
    return f"""
    {header}
    
    {instructions}
    
    {rfp_instructions}
    
    {formatted_questions}
    
    For each request for production above, please draft a complete response including any appropriate objections.
    Start each response with "RESPONSE TO REQUEST FOR PRODUCTION NO. X:" and then provide the full response.
    """


def build_requests_for_admission_prompt(questions: List[DiscoveryQuestion], 
                                      case_details: Dict[str, Any], 
                                      objection_sheet: str) -> str:
    """
    Build prompt for responding to Requests for Admission.
    
    Args:
        questions: List of requests for admission
        case_details: Dictionary containing case information
        objection_sheet: Text content of objection master sheet
        
    Returns:
        Complete prompt for AI to generate responses
    """
    header = GeneralPromptBuilder.build_common_prompt_header(
        case_details, "Requests for Admission"
    )
    
    instructions = GeneralPromptBuilder.build_prompt_instructions(objection_sheet)
    
    # Additional RFA-specific instructions
    rfa_instructions = """
    For Requests for Admission specifically:
    1. Respond to each request with either:
       - "Admitted."
       - "Denied."
       - "Defendant cannot truthfully admit or deny this request because [reason]."
    2. If objecting, clearly state the objection, but still provide a response
    3. Denials should be straightforward without unnecessary elaboration
    """
    
    formatted_questions = GeneralPromptBuilder.format_questions(
        questions, "REQUEST FOR ADMISSION NO."
    )
    
    return f"""
    {header}
    
    {instructions}
    
    {rfa_instructions}
    
    {formatted_questions}
    
    For each request for admission above, please draft a complete response including any appropriate objections.
    Start each response with "RESPONSE TO REQUEST FOR ADMISSION NO. X:" and then provide the full response.
    """