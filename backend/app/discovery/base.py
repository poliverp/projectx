"""
Base classes for discovery document processing.
"""
from typing import List, Dict, Any, Optional


class DiscoveryQuestion:
    """
    Represents a single discovery question/request with optional subparts.
    """
    
    def __init__(self, number: str, text: str, subparts: List[str] = None):
        """
        Initialize a discovery question.
        
        Args:
            number: Question/request number (e.g., "1", "2.1")
            text: Text of the question/request
            subparts: Optional list of subpart texts
        """
        self.number = number
        self.text = text
        self.subparts = subparts or []
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary for JSON serialization.
        """
        return {
            'number': self.number,
            'text': self.text,
            'subparts': self.subparts
        }
    
    def __str__(self) -> str:
        """String representation for debugging."""
        subparts_str = f" with {len(self.subparts)} subparts" if self.subparts else ""
        return f"Question {self.number}{subparts_str}: {self.text[:50]}..."


class BaseDiscoveryParser:
    """
    Base class for discovery document parsers.
    """
    
    @staticmethod
    def parse(pdf_path: str) -> List[DiscoveryQuestion]:
        """
        Parse a PDF document and extract discovery questions.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of parsed DiscoveryQuestion objects
            
        Raises:
            NotImplementedError: This method should be implemented by subclasses
        """
        raise NotImplementedError("Subclasses must implement parse method")


class BasePromptBuilder:
    """
    Base class for discovery prompt builders.
    """
    
    @staticmethod
    def build_prompt(questions: List[DiscoveryQuestion], case_details: Dict[str, Any], 
                    objection_sheet: str) -> str:
        """
        Build an AI prompt for responding to discovery requests.
        
        Args:
            questions: List of discovery questions
            case_details: Dictionary containing case information
            objection_sheet: Text content of objection master sheet
            
        Returns:
            Prompt string for AI
            
        Raises:
            NotImplementedError: This method should be implemented by subclasses
        """
        raise NotImplementedError("Subclasses must implement build_prompt method")