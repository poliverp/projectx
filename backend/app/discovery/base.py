"""
Base classes and shared functionality for discovery document handling.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Protocol, Any, Optional
import re


@dataclass
class DiscoveryQuestion:
    """
    Represents a question/request from a discovery document.
    Common structure for all discovery types.
    """
    number: str
    text: str
    subparts: List[str] = field(default_factory=list)


class BaseDiscoveryParser(Protocol):
    """
    Protocol defining the interface for all discovery parsers.
    """
    @staticmethod
    def parse(pdf_path: str) -> List[DiscoveryQuestion]:
        """
        Parses a discovery document PDF into a list of DiscoveryQuestion objects.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of parsed DiscoveryQuestion objects
        """
        ...


class BasePromptBuilder(Protocol):
    """
    Protocol defining the interface for all discovery prompt builders.
    """
    @staticmethod
    def build_prompt(questions: List[DiscoveryQuestion], case_details: Dict, 
                     objection_sheet: str) -> str:
        """
        Builds an AI prompt for generating responses to discovery questions.
        
        Args:
            questions: List of discovery questions to respond to
            case_details: Dictionary containing case information
            objection_sheet: Text content of objection master sheet
            
        Returns:
            Formatted prompt string for the AI
        """
        ...


def format_bold_underline(text: str) -> str:
    """
    Helper function to format text with bold and underline markdown.
    
    Args:
        text: Text to format
        
    Returns:
        Formatted text with markdown bold and underline
    """
    return f"**__{text}__**"