# subpoena_service.py

import os
import json
import fitz  # PyMuPDF
from typing import Dict, List, Any, Optional
import google.generativeai as genai
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SubpoenaService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from a PDF file with page markers."""
        try:
            doc = fitz.open(pdf_path)
            text = ""
            
            # Extract first few pages as potential summary
            summary_pages = min(3, len(doc))
            summary_text = "POTENTIAL SUMMARY SECTION:\n\n"
            
            for page_num in range(summary_pages):
                page = doc.load_page(page_num)
                summary_text += page.get_text()
                summary_text += f"\n[END OF PAGE {page_num + 1}]\n"
            
            text += summary_text + "\n\n"
            
            # Extract full document text
            text += "COMPLETE DOCUMENT TEXT:\n\n"
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text += page.get_text()
                text += f"\n[END OF PAGE {page_num + 1}]\n"
                
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise e

    def format_prompt(self, pdf_text: str) -> str:
        """Create a prompt for the generative model to extract subpoena information."""
        
        prompt = """
You are a specialized legal assistant tasked with extracting structured information from medical record subpoenas. 
Your job is to identify and extract key information from the subpoena text, regardless of the exact format or headers used.

IMPORTANT: Some documents may contain a summary list of all locations and record types in the first few pages.
Cross-reference information from both summary sections and detailed sections for completeness and accuracy.

For each subpoena found in the document, extract the following information:
1. The custodian/provider/facility name and complete address
2. The types of records requested (e.g., Medical, Billing, Radiology Films)
3. The date range for requested records (format as "Month Day, Year")
4. Any body part limitations specified (typically found in the attachment sections)
5. Case information (case name, case number, etc.)
6. Reference or identification numbers (e.g., 66302-XX)

Group the subpoenas primarily by record type (Medical, Billing, Radiology Films, etc.), 
and secondarily by location when the same location has multiple record types.

Return the results as a structured JSON object with the following format:
{
  "record_types": {
    "Medical": [
      {
        "location": "Provider Name",
        "address": "Complete address",
        "date_range": "Formatted date range",
        "body_parts": ["HEAD", "SHOULDERS", ...],
        "case_info": {
          "case_name": "Name",
          "case_number": "Number",
          "claim_number": "Claim number if present" 
        },
        "reference_number": "66302-XX or similar"
      }
    ],
    "Billing": [...],
    "Radiology Films": [...]
  }
}

Look for the following patterns in the document:
1. Tables with columns like "Location", "Department", "City/State/Zip", "Records"
2. Sections labeled "Notification of Subpoenaed Records"
3. Sections labeled "DEPOSITION SUBPOENA For Production of Business Records"
4. Sections labeled "ATTACHMENT 3 - Specified Records Requested"
5. Details about body part limitations often labeled as "SCOPE/ BODY PART LIMITATIONS"
6. Date ranges often formatted as "Records requested from [date] through Present"

Document Text:
"""
        prompt += pdf_text
        
        prompt += """

Extract all the subpoena information from this document and return it in the JSON format specified.
Focus on accuracy and completeness in identifying all subpoenas and their details.
Use both summary information (if available) and detailed sections to ensure complete extraction.
"""
        return prompt

    def extract_subpoena_info(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract subpoena information from a PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dictionary containing structured subpoena information
        """
        try:
            # Extract text from PDF
            pdf_text = self.extract_text_from_pdf(pdf_path)
            
            # Create prompt for the generative model
            prompt = self.format_prompt(pdf_text)
            
            # Generate response
            response = self.model.generate_content(prompt)
            
            # Extract and parse JSON from response
            response_text = response.text
            
            # Find JSON content in the response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            
            if json_start == -1 or json_end == 0:
                logger.error("Failed to find JSON in response")
                return {"error": "Failed to extract structured data from the subpoena"}
            
            json_str = response_text[json_start:json_end]
            
            try:
                result = json.loads(json_str)
                return result
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing JSON: {e}")
                return {"error": f"Error parsing extracted data: {e}"}
                
        except Exception as e:
            logger.error(f"Error in subpoena extraction: {e}")
            return {"error": f"Error in subpoena extraction: {e}"}

    def process_subpoena(self, pdf_path: str) -> Dict[str, Any]:
        """
        Process a subpoena PDF file and return structured information.
        This is the main method to call from external code.
        
        Args:
            pdf_path: Path to the subpoena PDF file
            
        Returns:
            Dictionary containing structured subpoena information
        """
        return self.extract_subpoena_info(pdf_path)

    def format_result_summary(self, result: Dict[str, Any]) -> str:
        """Format the extraction result as a readable summary."""
        if "error" in result:
            return f"Error: {result['error']}"
        
        if "record_types" not in result:
            return "No record types found in the extraction result."
        
        summary = "Subpoena Information Summary:\n\n"
        record_types = result["record_types"]
        
        for record_type, locations in record_types.items():
            summary += f"== {record_type} Records ==\n"
            
            for location_info in locations:
                summary += f"- {location_info.get('location', 'Unknown Location')}\n"
                summary += f"  Address: {location_info.get('address', 'Not specified')}\n"
                summary += f"  Date Range: {location_info.get('date_range', 'Not specified')}\n"
                
                if "body_parts" in location_info and location_info["body_parts"]:
                    summary += f"  Body Parts: {', '.join(location_info['body_parts'])}\n"
                
                if "reference_number" in location_info:
                    summary += f"  Reference: {location_info['reference_number']}\n"
                
                summary += "\n"
        
        return summary