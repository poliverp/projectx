"""
AI-driven parser for Requests for Production (RFP) documents.
Extracts definitions and the main requests section, then uses Gemini to parse requests and generate responses.
Not hooked up to the registry or API yet.
"""
import re
import fitz  # PyMuPDF
from typing import List, Optional
from .base import DiscoveryQuestion
from backend.services.analysis_service import analyze_discovery_with_gemini


def ai_parse_requests_for_production(pdf_path: str, case_data: Optional[dict] = None, objections_list: Optional[List[str]] = None) -> List[DiscoveryQuestion]:
    """
    AI-driven parser for Requests for Production. Extracts definitions and the main numbered requests section,
    then sends the relevant text to Gemini for parsing and response generation.
    Returns a list of DiscoveryQuestion objects, each with a .response field containing the AI's answer.
    """
    try:
        # --- Extract full text from PDF ---
        with fitz.open(pdf_path) as doc:
            full_text = ""
            for page in doc:
                full_text += page.get_text()

        # --- Extract definitions section (optional, for AI context) ---
        definitions = None
        definitions_match = re.search(r'(EXHIBIT\s*"?A"?.*?DEFINITIONS AND INSTRUCTIONS[\s\S]{0,5000}?)(?=REQUESTS? FOR PRODUCTION|REQUESTS?\s*$)', full_text, re.IGNORECASE)
        if definitions_match:
            definitions = definitions_match.group(1).strip()
        else:
            # Try a fallback: look for 'DEFINITIONS' up to the first requests heading
            fallback = re.search(r'(DEFINITIONS[\s\S]{0,5000}?)(?=REQUESTS? FOR PRODUCTION|REQUESTS?\s*$)', full_text, re.IGNORECASE)
            if fallback:
                definitions = fallback.group(1).strip()

        # --- Find the main requests section (after the main heading) ---
        requests_heading = re.search(r'(REQUESTS? FOR PRODUCTION[\s\S]{0,2000})', full_text, re.IGNORECASE)
        if requests_heading:
            start_idx = requests_heading.start()
        else:
            # Fallback: look for 'REQUESTS' as a heading
            requests_heading = re.search(r'(REQUESTS?[\s\S]{0,2000})', full_text, re.IGNORECASE)
            start_idx = requests_heading.start() if requests_heading else 0

        # Only use text after the main heading
        main_text = full_text[start_idx:]

        # Optionally, trim to the end of the requests section (before signature, etc.)
        end_match = re.search(r'(DATED:|RESPECTFULLY SUBMITTED|BY:|SIGNATURE)', main_text, re.IGNORECASE)
        if end_match:
            main_text = main_text[:end_match.start()]

        # --- Build robust Gemini prompt ---
        prompt = """
You are a legal AI assistant. Your job is to extract and respond to numbered Requests for Production from the following legal document. Ignore all preamble, instructions, and definitions for the purpose of generating responses, but use definitions for context if provided. The actual requests are always numbered and may be labeled in any of the following ways:
- 1., 2., etc.
- 'REQUEST FOR PRODUCTION NO. X'
- 'DOCUMENT REQUEST NO. X'
- Or any similar variant (e.g., 'REQUEST NO. X', 'PRODUCTION REQUEST NO. X', etc.)

Extract and respond to any request labeled as 'DOCUMENT REQUEST NO. X', 'REQUEST FOR PRODUCTION NO. X', or any similar variant.

For each request, respond in the following format:

REQUEST FOR PRODUCTION NO.X:
<request text>
RESPONSE TO REQUEST FOR PRODUCTION NO.X:
<objection (if any)>
<relevant case data, formatted as a paralegal would respond, or 'Need User Input' if no data is available>

- Use objections from the provided list if relevant.
- If you do not have enough information to answer, respond with 'Need User Input' under the response.
- Do not include any requests that are not actually numbered or labeled as above.
- Do not include definitions, instructions, or preamble as requests.
- Always use the above format for each request/response pair.
"""
        if definitions:
            prompt += f"\nDEFINITIONS (for context only):\n{definitions}\n"
        prompt += f"\nREQUESTS FOR PRODUCTION SECTION:\n{main_text.strip()}\n"
        if objections_list:
            prompt += f"\nOBJECTIONS LIST (use these if relevant):\n" + "\n".join(objections_list) + "\n"
        if case_data:
            prompt += f"\nCASE DATA (use this to answer requests if possible):\n{case_data}\n"

        # --- Call Gemini to extract and answer requests ---
        print("[AI PARSER] Sending extracted text to Gemini for parsing and response generation...")
        ai_result = analyze_discovery_with_gemini(prompt)

        # --- Expecting ai_result['requests'] as a list of dicts ---
        questions = []
        if isinstance(ai_result, list):
            # Gemini returned a list directly
            for q in ai_result:
                # Parse each request/response pair
                for req_key, req_text in q.items():
                    if req_key.startswith("REQUEST FOR PRODUCTION NO."):
                        number = req_key.split("NO.")[1].split(":")[0].strip()
                        # Normalize text by replacing multiple spaces and newlines with a single space
                        text = ' '.join(req_text.split())
                        response_key = f"RESPONSE TO REQUEST FOR PRODUCTION NO.{number}"
                        response = q.get(response_key, "")
                        dq = DiscoveryQuestion(number=number, text=text, subparts=[])
                        dq.response = response
                        questions.append(dq)
        elif isinstance(ai_result, dict) and "requests" in ai_result:
            for q in ai_result["requests"]:
                number = q.get('number', '')
                text = q.get('text', '')
                subparts = q.get('subparts', [])
                response = q.get('response', '')
                dq = DiscoveryQuestion(number=number, text=text, subparts=subparts)
                dq.response = response
                questions.append(dq)
        else:
            print("[AI PARSER ERROR] Gemini response format not recognized.")

        print(f"[AI PARSER] Gemini returned {len(questions)} requests with responses.")
        return questions

    except Exception as e:
        print(f"[AI PARSER ERROR] {e}")
        import traceback
        traceback.print_exc()
        return []

def ai_parse_special_interrogatories(pdf_path: str, case_data: Optional[dict] = None, objections_list: Optional[List[str]] = None) -> List[DiscoveryQuestion]:
    """
    AI-driven parser for Special Interrogatories. Extracts definitions and the main numbered interrogatories section,
    then sends the relevant text to Gemini for parsing and response generation.
    Returns a list of DiscoveryQuestion objects, each with a .response field containing the AI's answer.
    """
    try:
        # --- Extract full text from PDF ---
        with fitz.open(pdf_path) as doc:
            full_text = ""
            for page in doc:
                full_text += page.get_text()

        # --- Extract definitions section (optional, for AI context) ---
        definitions = None
        definitions_match = re.search(r'(EXHIBIT\s*"?A"?.*?DEFINITIONS AND INSTRUCTIONS[\s\S]{0,5000}?)(?=SPECIAL INTERROGATORY|INTERROGATORIES|INTERROGATORY|$)', full_text, re.IGNORECASE)
        if definitions_match:
            definitions = definitions_match.group(1).strip()
        else:
            fallback = re.search(r'(DEFINITIONS[\s\S]{0,5000}?)(?=SPECIAL INTERROGATORY|INTERROGATORIES|INTERROGATORY|$)', full_text, re.IGNORECASE)
            if fallback:
                definitions = fallback.group(1).strip()

        # --- Find the main interrogatories section (after the main heading) ---
        interrogatories_heading = re.search(r'(SPECIAL INTERROGATOR(Y|IES)[\s\S]{0,2000})', full_text, re.IGNORECASE)
        if interrogatories_heading:
            start_idx = interrogatories_heading.start()
        else:
            interrogatories_heading = re.search(r'(INTERROGATOR(Y|IES)[\s\S]{0,2000})', full_text, re.IGNORECASE)
            start_idx = interrogatories_heading.start() if interrogatories_heading else 0

        # Only use text after the main heading
        main_text = full_text[start_idx:]

        # Optionally, trim to the end of the interrogatories section (before signature, etc.)
        end_match = re.search(r'(DATED:|RESPECTFULLY SUBMITTED|BY:|SIGNATURE)', main_text, re.IGNORECASE)
        if end_match:
            main_text = main_text[:end_match.start()]

        # --- Build robust Gemini prompt ---
        prompt = """
You are a legal AI assistant. Your job is to extract and respond to numbered Special Interrogatories from the following legal document. Ignore all preamble, instructions, and definitions for the purpose of generating responses, but use definitions for context if provided. The actual interrogatories are always numbered and may be labeled in any of the following ways:
- 1., 2., etc.
- 'SPECIAL INTERROGATORY NO. X'
- Or any similar variant (e.g., 'INTERROGATORY NO. X', etc.)

Extract and respond to any interrogatory labeled as 'SPECIAL INTERROGATORY NO. X' or any similar variant.

For each interrogatory, respond in the following format:

SPECIAL INTERROGATORY NO.X:
<interrogatory text>
RESPONSE TO SPECIAL INTERROGATORY NO.X:
<objection (if any)>
<relevant case data, formatted as a paralegal would respond, or 'Need User Input' if no data is available>

- Use objections from the provided list if relevant.
- If you do not have enough information to answer, respond with 'Need User Input' under the response.
- Do not include any interrogatories that are not actually numbered or labeled as above.
- Do not include definitions, instructions, or preamble as interrogatories.
- Always use the above format for each interrogatory/response pair.
"""
        if definitions:
            prompt += f"\nDEFINITIONS (for context only):\n{definitions}\n"
        prompt += f"\nSPECIAL INTERROGATORIES SECTION:\n{main_text.strip()}\n"
        if objections_list:
            prompt += f"\nOBJECTIONS LIST (use these if relevant):\n" + "\n".join(objections_list) + "\n"
        if case_data:
            prompt += f"\nCASE DATA (use this to answer interrogatories if possible):\n{case_data}\n"

        # --- Call Gemini to extract and answer interrogatories ---
        print("[AI PARSER] Sending extracted text to Gemini for parsing and response generation (Special Interrogatories)...")
        ai_result = analyze_discovery_with_gemini(prompt)

        # --- Expecting ai_result['interrogatories'] as a list of dicts ---
        questions = []
        if isinstance(ai_result, list):
            for q in ai_result:
                for req_key, req_text in q.items():
                    if req_key.startswith("SPECIAL INTERROGATORY NO."):
                        number = req_key.split("NO.")[1].split(":")[0].strip()
                        text = ' '.join(req_text.split())
                        response_key = f"RESPONSE TO SPECIAL INTERROGATORY NO.{number}"
                        response = q.get(response_key, "")
                        dq = DiscoveryQuestion(number=number, text=text, subparts=[])
                        dq.response = response
                        questions.append(dq)
        elif isinstance(ai_result, dict) and "interrogatories" in ai_result:
            for q in ai_result["interrogatories"]:
                number = q.get('number', '')
                text = q.get('text', '')
                subparts = q.get('subparts', [])
                response = q.get('response', '')
                dq = DiscoveryQuestion(number=number, text=text, subparts=subparts)
                dq.response = response
                questions.append(dq)
        else:
            print("[AI PARSER ERROR] Gemini response format not recognized for special interrogatories.")

        print(f"[AI PARSER] Gemini returned {len(questions)} special interrogatories with responses.")
        return questions

    except Exception as e:
        print(f"[AI PARSER ERROR] {e}")
        import traceback
        traceback.print_exc()
        return [] 