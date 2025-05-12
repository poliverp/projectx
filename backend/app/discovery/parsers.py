"""
Parsers for different types of discovery documents.
Enhanced to handle various document formats including simple numbered items.
"""
import re
import fitz  # PyMuPDF
from typing import List, Pattern, Dict, Any, Optional
from .base import DiscoveryQuestion, BaseDiscoveryParser


class GeneralDiscoveryParser:
    """Base implementation with shared parsing logic for discovery documents."""
    
    @classmethod
    def parse(cls, pdf_path: str, primary_patterns: List[Pattern], numbered_pattern: Pattern = None) -> List[DiscoveryQuestion]:
        """
        Generic PDF parser for discovery documents using multiple regex patterns.
        
        Args:
            pdf_path: Path to the PDF file
            primary_patterns: List of regex patterns to try for formal request formats
            numbered_pattern: Pattern to match simple numbered items
            
        Returns:
            List of parsed DiscoveryQuestion objects
        """
        questions = []
        doc_text = ""
        
        try:
            # Open the PDF with PyMuPDF
            doc = fitz.open(pdf_path)
            print(f"[DEBUG] PDF has {len(doc)} pages")
            
            # First, extract all text from the document
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text")
                if text and text.strip():
                    print(f"[DEBUG] Extracted text from page {page_num+1} ({len(text)} chars)")
                    doc_text += text + "\n\n"  # Add extra line breaks between pages
                else:
                    print(f"[DEBUG] No text found on page {page_num+1}")
            
            # Normalize line endings and whitespace
            doc_text = doc_text.replace("\r", "\n")
            
            # Check if document has expected pattern in it
            document_type = cls._determine_document_type(doc_text)
            print(f"[DEBUG] Detected document type: {document_type}")
            
            # Process the text line by line
            lines = doc_text.split('\n')
            i = 0
            
            # First try to find structured requests (REQUEST FOR PRODUCTION NO. X)
            structured_questions = cls._parse_structured_requests(lines, primary_patterns)
            if structured_questions:
                print(f"[DEBUG] Found {len(structured_questions)} structured requests")
                questions.extend(structured_questions)
            
            # If no structured requests or too few found, try numbered format
            if not questions and numbered_pattern:
                numbered_questions = cls._parse_numbered_requests(lines, numbered_pattern)
                print(f"[DEBUG] Found {len(numbered_questions)} numbered requests")
                questions.extend(numbered_questions)
            
            # Close the document
            doc.close()
            
            # Print detailed information about what was found
            print(f"[DEBUG] Successfully extracted {len(questions)} questions total")
            for i, q in enumerate(questions[:5]):  # Print first 5 for debugging
                print(f"[DEBUG] Question {i+1}: #{q.number} - {q.text[:50]}...")
            
            return questions
            
        except Exception as e:
            print(f"[ERROR] Failed to process PDF: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def _determine_document_type(text: str) -> str:
        """Determine the type of discovery document based on text content"""
        text_lower = text.lower()
        
        if "request for production" in text_lower or "requests for production" in text_lower:
            return "requests_for_production"
        elif "form interrogatory" in text_lower or "form interrogatories" in text_lower:
            return "form_interrogatories"
        elif "special interrogatory" in text_lower or "special interrogatories" in text_lower:
            return "special_interrogatories"
        elif "request for admission" in text_lower or "requests for admission" in text_lower:
            return "requests_for_admission"
        else:
            return "unknown"
    
    @staticmethod
    def _parse_structured_requests(lines: List[str], patterns: List[Pattern]) -> List[DiscoveryQuestion]:
        """Parse structured requests using multiple patterns"""
        questions = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # Try all patterns
            for pattern in patterns:
                match = pattern.match(line)
                if match:
                    number = match.group(1)
                    q_text = match.group(2) if len(match.groups()) > 1 else ""
                    
                    # Look ahead for continued text
                    next_idx = i + 1
                    while next_idx < len(lines) and next_idx < i + 10:
                        next_line = lines[next_idx].strip()
                        if not next_line or re.match(r'^\d+\.', next_line) or any(p.match(next_line) for p in patterns):
                            break
                        q_text += " " + next_line
                        next_idx += 1
                    
                    # Process subparts if any
                    subparts = re.findall(r"\([a-zA-Z]\)\s+([^\(\)]+)", q_text)
                    if subparts:
                        main_text = q_text.split("(")[0].strip()
                        clean_subparts = [subpart.strip() for subpart in subparts]
                        questions.append(
                            DiscoveryQuestion(number=number, text=main_text, subparts=clean_subparts)
                        )
                    else:
                        questions.append(
                            DiscoveryQuestion(number=number, text=q_text.strip())
                        )
                    break  # Found a match with one pattern, move to next line
                    
        return questions
    
    @staticmethod
    def _parse_numbered_requests(lines: List[str], pattern: Pattern) -> List[DiscoveryQuestion]:
        """
        Parse simple numbered requests with enhanced handling for various formats and layouts.
        Now handles line breaks between number and text, and different whitespace patterns.
        """
        questions = []
        current_number = None
        current_text = ""
        
        # First, we'll try a standard approach looking for numbered lines
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Try the standard pattern first
            match = pattern.match(line)
            if match:
                # If we were already building a question, save it
                if current_number is not None:
                    questions.append(DiscoveryQuestion(number=current_number, text=current_text.strip()))
                
                # Start a new question
                current_number = match.group(1)
                current_text = match.group(2) if len(match.groups()) > 1 else ""
                
                # Look ahead for continued text (stop at next number)
                next_idx = i + 1
                while next_idx < len(lines) and next_idx < i + 10:
                    next_line = lines[next_idx].strip()
                    if not next_line or re.match(r'^\d+\.', next_line):
                        break
                    current_text += " " + next_line
                    next_idx += 1
            # Alternative approach for numbers that stand alone on a line
            elif re.match(r'^\d+$', line) and i + 1 < len(lines):
                # This might be a number with text on the next line
                next_line = lines[i+1].strip()
                if next_line and not re.match(r'^\d+\.', next_line) and not re.match(r'^\d+$', next_line):
                    # If we were already building a question, save it
                    if current_number is not None:
                        questions.append(DiscoveryQuestion(number=current_number, text=current_text.strip()))
                    
                    # Start a new question
                    current_number = line
                    current_text = next_line
                    
                    # Look ahead for continued text (skip the next line since we already included it)
                    next_idx = i + 2
                    while next_idx < len(lines) and next_idx < i + 10:
                        next_line = lines[next_idx].strip()
                        if not next_line or re.match(r'^\d+$', next_line) or re.match(r'^\d+\.', next_line):
                            break
                        current_text += " " + next_line
                        next_idx += 1
        
        # Don't forget to add the last question if we were building one
        if current_number is not None:
            questions.append(DiscoveryQuestion(number=current_number, text=current_text.strip()))
        
        # If the above approach didn't find any questions, try a more aggressive approach
        if not questions:
            print("[DEBUG] No questions found with standard approach, trying alternative approach...")
            
            # Combine lines into text blocks to handle multi-line questions
            text_blocks = []
            current_block = ""
            
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    if current_block:
                        text_blocks.append(current_block)
                        current_block = ""
                else:
                    if current_block:
                        current_block += " " + stripped
                    else:
                        current_block = stripped
            
            if current_block:
                text_blocks.append(current_block)
            
            # Now look for number patterns in the text blocks
            current_request = None
            
            for block in text_blocks:
                # Look for numeric pattern starts like "1." or "1 " or just a number
                num_match = re.match(r'.*?(\d+)[\.\s]+(.*)', block)
                if num_match:
                    num = num_match.group(1)
                    text = num_match.group(2)
                    questions.append(DiscoveryQuestion(number=num, text=text.strip()))
        
        print(f"[DEBUG] Found {len(questions)} questions using enhanced numbered request parsing")
        return questions


def parse_form_interrogatories(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Parses a Form Interrogatories PDF into a list of DiscoveryQuestion objects.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of parsed DiscoveryQuestion objects
    """
    # Patterns for structured form interrogatories
    structured_patterns = [
        re.compile(r"^(?:FORM|Form)\s+INTERROGATORY\s+NO\.\s*([\d\.]+)[\.:]?\s*(.*)", re.IGNORECASE),
        re.compile(r"^INTERROGATORY\s+NO\.\s*([\d\.]+)[\.:]?\s*(.*)", re.IGNORECASE)
    ]
    
    # Pattern for numbered format
    numbered_pattern = re.compile(r"^(\d+)\.\s+(.*)", re.IGNORECASE)
    
    return GeneralDiscoveryParser.parse(pdf_path, structured_patterns, numbered_pattern)


def parse_special_interrogatories(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Parses a Special Interrogatories PDF into a list of DiscoveryQuestion objects.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of parsed DiscoveryQuestion objects
    """
    # Patterns for structured special interrogatories
    structured_patterns = [
        re.compile(r"^(?:SPECIAL|Special)\s+INTERROGATORY\s+NO\.\s*([\d\.]+)[\.:]?\s*(.*)", re.IGNORECASE),
        re.compile(r"^INTERROGATORY\s+NO\.\s*([\d\.]+)[\.:]?\s*(.*)", re.IGNORECASE)
    ]
    
    # Pattern for numbered format
    numbered_pattern = re.compile(r"^(\d+)\.\s+(.*)", re.IGNORECASE)
    
    return GeneralDiscoveryParser.parse(pdf_path, structured_patterns, numbered_pattern)


def parse_requests_for_production(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Improved parser for Requests for Production:
    - Ignores definitions/instructions/preamble (but can extract for AI context)
    - Only starts parsing after the main requests heading (e.g., 'REQUESTS FOR PRODUCTION')
    - Handles both 'REQUEST FOR PRODUCTION NO. X' and simple numbered formats
    - Only uses the first/longest/main numbered list after the heading
    - Subparts remain part of the main request
    """
    import fitz
    import re
    questions = []
    try:
        # --- Extract full text from PDF ---
        with fitz.open(pdf_path) as doc:
            full_text = ""
            for page in doc:
                full_text += page.get_text()

        # --- Optionally extract definitions for AI context (not used for questions) ---
        definitions = None
        definitions_match = re.search(r'(EXHIBIT\s*"?A"?.*?DEFINITIONS AND INSTRUCTIONS[\s\S]{0,5000}?)(?=REQUESTS? FOR PRODUCTION|REQUESTS?\s*$)', full_text, re.IGNORECASE)
        if definitions_match:
            definitions = definitions_match.group(1).strip()
        else:
            fallback = re.search(r'(DEFINITIONS[\s\S]{0,5000}?)(?=REQUESTS? FOR PRODUCTION|REQUESTS?\s*$)', full_text, re.IGNORECASE)
            if fallback:
                definitions = fallback.group(1).strip()

        # --- Find the main requests section (after the main heading) ---
        requests_heading = re.search(r'(REQUESTS? FOR PRODUCTION[\s\S]{0,2000})', full_text, re.IGNORECASE)
        if requests_heading:
            start_idx = requests_heading.start()
        else:
            requests_heading = re.search(r'(REQUESTS?[\s\S]{0,2000})', full_text, re.IGNORECASE)
            start_idx = requests_heading.start() if requests_heading else 0

        # Only use text after the main heading
        main_text = full_text[start_idx:]

        # Optionally, trim to the end of the requests section (before signature, etc.)
        end_match = re.search(r'(DATED:|RESPECTFULLY SUBMITTED|BY:|SIGNATURE)', main_text, re.IGNORECASE)
        if end_match:
            main_text = main_text[:end_match.start()]

        # --- Now parse only the main_text for requests ---
        # Multiple patterns for structured requests for production
        structured_patterns = [
            re.compile(r"^(?:REQUEST|Request)\s+FOR\s+PRODUCTION\s+NO\.\s*(\d+)[\.:]?\s*(.*)", re.IGNORECASE),
            re.compile(r"^(?:DEMAND|Demand)\s+FOR\s+PRODUCTION\s+NO\.\s*(\d+)[\.:]?\s*(.*)", re.IGNORECASE),
            re.compile(r"^(?:PRODUCTION\s+REQUEST|Production\s+Request)\s+NO\.\s*(\d+)[\.:]?\s*(.*)", re.IGNORECASE)
        ]
        numbered_pattern = re.compile(r"^(\d+)\.\s+(.*)", re.IGNORECASE)

        # Parse lines from main_text only
        lines = main_text.split('\n')
        # Try structured first
        structured_questions = GeneralDiscoveryParser._parse_structured_requests(lines, structured_patterns)
        if structured_questions:
            questions.extend(structured_questions)
        # If not enough, try numbered
        if not questions:
            numbered_questions = GeneralDiscoveryParser._parse_numbered_requests(lines, numbered_pattern)
            questions.extend(numbered_questions)

        # If there are multiple numbered lists, pick the longest one (to avoid definitions)
        if questions:
            # Group by consecutive numbering
            grouped = []
            current = []
            last_num = None
            for q in questions:
                try:
                    num = int(q.number)
                except Exception:
                    num = None
                if last_num is not None and num is not None and num == last_num + 1:
                    current.append(q)
                else:
                    if current:
                        grouped.append(current)
                    current = [q]
                last_num = num
            if current:
                grouped.append(current)
            # Pick the longest group
            questions = max(grouped, key=len)

        print(f"[DEBUG] Improved parser extracted {len(questions)} requests after main heading.")
        return questions
    except Exception as e:
        print(f"[ERROR] Exception in improved parse_requests_for_production: {e}")
        import traceback
        traceback.print_exc()
        return []


def parse_requests_for_admission(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Parses a Requests for Admission PDF into a list of DiscoveryQuestion objects.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of parsed DiscoveryQuestion objects
    """
    # Patterns for structured requests for admission
    structured_patterns = [
        re.compile(r"^(?:REQUEST|Request)\s+FOR\s+ADMISSION\s+NO\.\s*([\d\.]+)[\.:]?\s*(.*)", re.IGNORECASE),
        re.compile(r"^(?:ADMISSION\s+REQUEST|Admission\s+Request)\s+NO\.\s*(\d+)[\.:]?\s*(.*)", re.IGNORECASE)
    ]
    
    # Pattern for numbered format
    numbered_pattern = re.compile(r"^(\d+)\.\s+(.*)", re.IGNORECASE)
    
    return GeneralDiscoveryParser.parse(pdf_path, structured_patterns, numbered_pattern)