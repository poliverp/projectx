"""
Parsers for different types of discovery documents.
"""
import re
import pdfplumber
from typing import List, Pattern, Dict, Any, Optional
from .base import DiscoveryQuestion, BaseDiscoveryParser
import pytesseract
from pdf2image import convert_from_path
import fitz  # PyMuPDF
from PIL import Image, ImageEnhance, ImageFilter


class GeneralDiscoveryParser:
    """Base implementation with shared parsing logic for discovery documents."""
    
    @classmethod
    def parse(cls, pdf_path: str, pattern: Pattern) -> List[DiscoveryQuestion]:
        """
        Generic PDF parser for discovery documents using the provided regex pattern.
        
        Args:
            pdf_path: Path to the PDF file
            pattern: Compiled regex pattern to match questions/requests
            
        Returns:
            List of parsed DiscoveryQuestion objects
        """
        questions = []
        
        import sys
        # Open with PyMuPDF
        doc = fitz.open(pdf_path)
        # Deep debug: print number of pages
        print(f"[DEBUG] PDF has {len(doc)} pages")
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            print(f"[DEBUG] Page {page_num+1} PyMuPDF text (first 200 chars): {repr(text[:200]) if text else 'None'}")
            # Now force OCR for comparison
            images = convert_from_path(pdf_path, first_page=page_num+1, last_page=page_num+1)
            if images:
                img = images[0].convert('L').filter(ImageFilter.SHARPEN)
                img = ImageEnhance.Contrast(img).enhance(2)
                ocr_text = pytesseract.image_to_string(img, config='--psm 6')
                print(f"[DEBUG] Page {page_num+1} OCR text (first 200 chars): {repr(ocr_text[:200]) if ocr_text else 'None'}")
            else:
                print(f"[DEBUG] Could not convert page {page_num+1} to image for OCR.")
            if text and text.strip():
                print(f"[DEBUG] PyMuPDF extracted text from page {page_num+1}:\n{text}\n{'-'*40}")
            else:
                print(f"[DEBUG] PyMuPDF found no text on page {page_num+1}, falling back to OCR...")
            lines = text.split('\n')
            for line_num, line in enumerate(lines):
                print(f"[DEBUG] Checking line {line_num+1}: {line}")
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