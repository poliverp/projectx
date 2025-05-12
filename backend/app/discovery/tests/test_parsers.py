"""
Tests for the discovery document parsers.
Run these tests to verify that the parsers are working correctly.
"""
import unittest
import os
import tempfile
from pathlib import Path
from ..parsers import (
    parse_requests_for_production,
    parse_form_interrogatories,
    parse_special_interrogatories,
    parse_requests_for_admission
)

# Create a base class for parser tests
class BaseParserTest(unittest.TestCase):
    """Base class for parser tests with common utilities."""
    
    def create_test_pdf(self, content, filename="test.pdf"):
        """Create a simple PDF file with the given content for testing."""
        import fitz  # PyMuPDF
        
        # Create a temporary directory
        test_dir = tempfile.mkdtemp()
        pdf_path = os.path.join(test_dir, filename)
        
        # Create a new PDF with fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), content)
        doc.save(pdf_path)
        doc.close()
        
        return pdf_path
    
    def cleanup_test_pdf(self, pdf_path):
        """Remove the test PDF file and its directory."""
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            # Also remove parent directory if empty
            parent_dir = os.path.dirname(pdf_path)
            if os.path.exists(parent_dir) and not os.listdir(parent_dir):
                os.rmdir(parent_dir)


class TestRequestsForProduction(BaseParserTest):
    """Test the requests for production parser."""
    
    def test_standard_format(self):
        """Test parsing standard 'REQUEST FOR PRODUCTION NO. X' format."""
        content = """
        REQUEST FOR PRODUCTION NO. 1: All documents relating to the incident.
        
        REQUEST FOR PRODUCTION NO. 2: All photographs of the scene.
        """
        
        pdf_path = self.create_test_pdf(content, "rfp_standard.pdf")
        try:
            questions = parse_requests_for_production(pdf_path)
            
            self.assertEqual(len(questions), 2)
            self.assertEqual(questions[0].number, "1")
            self.assertTrue("documents relating to the incident" in questions[0].text)
            self.assertEqual(questions[1].number, "2")
            self.assertTrue("photographs of the scene" in questions[1].text)
        finally:
            self.cleanup_test_pdf(pdf_path)
    
    def test_demand_format(self):
        """Test parsing 'DEMAND FOR PRODUCTION' format."""
        content = """
        DEMAND FOR PRODUCTION (C.C.P. §2031.010 et seq.)
        
        1. All reports regarding the INCIDENT prepared by anyone.
        
        2. All policies of insurance that were in effect.
        """
        
        pdf_path = self.create_test_pdf(content, "rfp_demand.pdf")
        try:
            questions = parse_requests_for_production(pdf_path)
            
            self.assertEqual(len(questions), 2)
            self.assertEqual(questions[0].number, "1")
            self.assertTrue("reports regarding the INCIDENT" in questions[0].text)
            self.assertEqual(questions[1].number, "2")
            self.assertTrue("policies of insurance" in questions[1].text)
        finally:
            self.cleanup_test_pdf(pdf_path)
    
    def test_plaintiff_format(self):
        """Test parsing 'PLAINTIFF'S REQUESTS FOR PRODUCTION' format."""
        content = """
        PLAINTIFF'S REQUESTS FOR PRODUCTION, SET ONE
        
        1. All documents relating to any video surveillance.
        
        2. All documents relating to maintenance.
        """
        
        pdf_path = self.create_test_pdf(content, "rfp_plaintiff.pdf")
        try:
            questions = parse_requests_for_production(pdf_path)
            
            self.assertEqual(len(questions), 2)
            self.assertEqual(questions[0].number, "1")
            self.assertTrue("video surveillance" in questions[0].text)
            self.assertEqual(questions[1].number, "2")
            self.assertTrue("relating to maintenance" in questions[1].text)
        finally:
            self.cleanup_test_pdf(pdf_path)


if __name__ == '__main__':
    unittest.main()