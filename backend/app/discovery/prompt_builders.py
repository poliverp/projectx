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
    
    # Instead of using the general instructions, create specific form interrogatory instructions
    fi_instructions = """
    INSTRUCTIONS:
    For each Form Interrogatory, please follow these specific formatting guidelines:
    
    1. Format each interrogatory and response in this exact structure:
       
       **FORM INTERROGATORY NO. X:**
       [Include the full interrogatory text here, indented on first line if possible]
       
       **RESPONSE TO FORM INTERROGATORY NO. X:**
       Objection. [Include each applicable objection from the objection list as its own full sentence, exactly as written in the list]
       
       Subject to and without waiving the foregoing objections, Plaintiff responds as follows:
       [Your response here, maintaining any list formatting (a, b, c, d) that exists in the template]
    
    2. Important requirements:
       - ALWAYS start each response with "Objection." followed by the specific objections
       - Use the EXACT wording from the objection list provided below - do not combine or paraphrase objections
       - If no objections apply, write "No objections found."
       - ALWAYS end each response with: "Subject to and without waiving the foregoing objections, Plaintiff responds as follows:"
       - Maintain list formatting (a, b, c, d) that exists in the template
       - For medical records sections (typically 6.4, 6.5, 6.6), format as clear structured lists
       - For income loss sections (typically 8.1-8.8), format dates and amounts clearly
    
    3. Responding party is always the Plaintiff in these responses
    """
    
    # Include the ENTIRE objection sheet instead of truncating it
    objection_guidance = """
    OBJECTION LIST (Use these exact objections as written - do not modify or combine them):
    
    """ + objection_sheet
    
    formatted_questions = ""
    for question in questions:
        formatted_questions += f"**FORM INTERROGATORY NO. {question.number}:**\n"
        formatted_questions += f"            {question.text}\n\n"
    
    return f"""
    {header}
    
    {fi_instructions}
    
    {objection_guidance}
    
    DISCOVERY REQUESTS TO RESPOND TO:
    
    {formatted_questions}
    
    Remember: 
    1. For each interrogatory above, provide a response that starts with "**RESPONSE TO FORM INTERROGATORY NO. X:**"
    2. Always start with "Objection." followed by applicable objections from the list as full sentences
    3. Always end with "Subject to and without waiving the foregoing objections, Plaintiff responds as follows:"
    4. Use the EXACT wording from the objection list - do not combine or summarize objections
    5. Format exactly as shown in the instructions
    6. Maintain list formatting (a, b, c, d) that exists in the template
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
    
    # Instead of using the general instructions, create specific RFP instructions
    rfp_instructions = """
    INSTRUCTIONS:
    For each Request for Production document, please follow these specific formatting guidelines:
    
    1. Format each request and response in this exact structure:
       
       **REQUEST FOR PRODUCTION NO. X:**
       [Include the full request text here, indented on first line if possible]
       
       **RESPONSE TO REQUEST FOR PRODUCTION NO. X:**
       Objection. [Include each applicable objection from the objection list as its own full sentence, exactly as written in the list]
       
       Subject to and without waiving the foregoing objections, Plaintiff responds as follows:
    
    2. Important requirements:
       - ALWAYS start each response with "Objection." followed by the specific objections
       - Use the EXACT wording from the objection list provided below - do not combine or paraphrase objections
       - If no objections apply, write "No objections found."
       - ALWAYS end each response with: "Subject to and without waiving the foregoing objections, Plaintiff responds as follows:"
       - Do NOT add any substantive response after this closing phrase - that will be added by the user
    
    3. Responding party is always the Plaintiff in these responses
    """
    
    # Include the ENTIRE objection sheet instead of truncating it
    # This ensures all objections are available to the AI
    objection_guidance = """
    OBJECTION LIST (Use these exact objections as written - do not modify or combine them):
    
    """ + objection_sheet
    
    formatted_questions = ""
    for question in questions:
        formatted_questions += f"**REQUEST FOR PRODUCTION NO. {question.number}:**\n"
        formatted_questions += f"            {question.text}\n\n"
    
    return f"""
    {header}
    
    {rfp_instructions}
    
    {objection_guidance}
    
    DISCOVERY REQUESTS TO RESPOND TO:
    
    {formatted_questions}
    
    Remember: 
    1. For each request above, provide a response that starts with "**RESPONSE TO REQUEST FOR PRODUCTION NO. X:**"
    2. Always start with "Objection." followed by applicable objections from the list as full sentences
    3. Always end with "Subject to and without waiving the foregoing objections, Plaintiff responds as follows:"
    4. Use the EXACT wording from the objection list - do not combine or summarize objections
    5. Format exactly as shown in the instructions
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