"""
Registry for discovery document types and their related functions.
"""
from .parsers import (
    parse_form_interrogatories,
    parse_special_interrogatories,
    parse_requests_for_production,
    parse_requests_for_admission,
)
from .prompt_builders import (
    build_form_interrogatories_prompt,
    build_special_interrogatories_prompt,
    build_requests_for_production_prompt,
    build_requests_for_admission_prompt,
)

# Registry for discovery types
DISCOVERY_TYPE_REGISTRY = {
    'form_interrogatories': {
        'parser': parse_form_interrogatories,
        'prompt_builder': build_form_interrogatories_prompt,
        'display_name': 'Form Interrogatories',
        'request_type': 'Form Interrogatory No.',
        'response_type': 'Response to Form Interrogatory No.'
    },
    'special_interrogatories': {
        'parser': parse_special_interrogatories,
        'prompt_builder': build_special_interrogatories_prompt,
        'display_name': 'Special Interrogatories',
        'request_type': 'Special Interrogatory No.',
        'response_type': 'Response to Special Interrogatory No.'
    },
    'requests_for_production': {
        'parser': parse_requests_for_production,
        'prompt_builder': build_requests_for_production_prompt,
        'display_name': 'Requests for Production',
        'request_type': 'Request for Production No.',
        'response_type': 'Response to Request for Production No.'
    },
    'requests_for_admission': {
        'parser': parse_requests_for_admission,
        'prompt_builder': build_requests_for_admission_prompt,
        'display_name': 'Requests for Admission',
        'request_type': 'Request for Admission No.',
        'response_type': 'Response to Request for Admission No.'
    },
}

def get_discovery_type_info(discovery_type: str) -> dict:
    """
    Returns information for the specified discovery type.
    
    Args:
        discovery_type: Key for the discovery type
        
    Returns:
        Dictionary with parser, prompt_builder, and metadata
        
    Raises:
        ValueError: If discovery_type is not found in registry
    """
    if discovery_type not in DISCOVERY_TYPE_REGISTRY:
        raise ValueError(f"Unsupported discovery type: {discovery_type}")
    
    return DISCOVERY_TYPE_REGISTRY[discovery_type]