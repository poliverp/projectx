"""
Parsers for different types of discovery documents.
"""
import re
import fitz  # PyMuPDF
from typing import List, Pattern, Dict, Any, Optional
from .base import DiscoveryQuestion, BaseDiscoveryParser


class GeneralDiscoveryParser:
    """Base implementation with shared parsing logic for discovery documents."""
    
    @classmethod
    def parse(cls, pdf_path: str, pattern: Pattern) -> List[DiscoveryQuestion]:
        """
        Generic PDF parser for discovery documents using the provided regex pattern.
        Uses only PyMuPDF for text extraction.
        
        Args:
            pdf_path: Path to the PDF file
            pattern: Compiled regex pattern to match questions/requests
            
        Returns:
            List of parsed DiscoveryQuestion objects
        """
        questions = []
        
        # Open with PyMuPDF
        try:
            doc = fitz.open(pdf_path)
            print(f"[DEBUG] PDF has {len(doc)} pages")
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                
                if text and text.strip():
                    print(f"[DEBUG] Processing text from page {page_num+1}")
                else:
                    print(f"[DEBUG] No text found on page {page_num+1}")
                    continue
                
                # Process the extracted text line by line
                lines = text.split('\n')
                for line_num, line in enumerate(lines):
                    match = pattern.match(line.strip())
                    if match:
                        number = match.group(1)
                        q_text = match.group(2)
                        
                        # Check for subparts
                        subparts = re.findall(r"\([a-zA-Z]\)\s+([^\n]+)", q_text)
                        if subparts:
                            questions.append(
                                DiscoveryQuestion(
                                    number=number, 
                                    text=q_text.split('(')[0].strip(), 
                                    subparts=subparts
                                )
                            )
                        else:
                            questions.append(
                                DiscoveryQuestion(
                                    number=number, 
                                    text=q_text
                                )
                            )
            
            # Close the document
            doc.close()
            
        except Exception as e:
            print(f"[ERROR] Failed to process PDF: {e}")
        
        return questions


def parse_form_interrogatories(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Parses a Form Interrogatories PDF into a list of DiscoveryQuestion objects.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of parsed DiscoveryQuestion objects
    """
    pattern = re.compile(r"^FORM INTERROGATORY NO\.\s*([\d\.]+):\s*(.*)", re.IGNORECASE)
    return GeneralDiscoveryParser.parse(pdf_path, pattern)


def parse_special_interrogatories(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Parses a Special Interrogatories PDF into a list of DiscoveryQuestion objects.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of parsed DiscoveryQuestion objects
    """
    pattern = re.compile(r"^SPECIAL INTERROGATORY NO\.\s*([\d\.]+):\s*(.*)", re.IGNORECASE)
    return GeneralDiscoveryParser.parse(pdf_path, pattern)


def parse_requests_for_production(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Parses a Requests for Production PDF into a list of DiscoveryQuestion objects.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of parsed DiscoveryQuestion objects
    """
    # Match 'REQUEST FOR PRODUCTION NO. 41.' or 'REQUEST FOR PRODUCTION NO. 41:' or 'REQUEST FOR PRODUCTION NO. 41'
    pattern = re.compile(r"^REQUEST FOR PRODUCTION NO\.\s*(\d+)[\.:]?\s*(.*)", re.IGNORECASE)
    return GeneralDiscoveryParser.parse(pdf_path, pattern)


def parse_requests_for_admission(pdf_path: str) -> List[DiscoveryQuestion]:
    """
    Parses a Requests for Admission PDF into a list of DiscoveryQuestion objects.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        List of parsed DiscoveryQuestion objects
    """
    pattern = re.compile(r"^REQUEST FOR ADMISSION NO\.\s*([\d\.]+):\s*(.*)", re.IGNORECASE)
    return GeneralDiscoveryParser.parse(pdf_path, pattern)