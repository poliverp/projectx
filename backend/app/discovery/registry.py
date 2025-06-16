# backend/app/discovery/registry.py
"""
Registry for discovery document types and their related functions.
Enhanced to include template mapping and data source configuration.
"""
from .parsers import (
    parse_form_interrogatories,
    parse_special_interrogatories,
    parse_requests_for_admission,
)
from .ai_parsers import (
    ai_parse_requests_for_production,
    ai_parse_special_interrogatories,
    ai_parse_requests_for_admission,
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
        'response_type': 'Response to Form Interrogatory No.',
        'template_file': 'FR1_template.docx',
        'data_source': 'session',  # Uses session.get('formatted_responses')
        'workflow_type': 'format_responses',  # Uses format-responses endpoint
    },
    'special_interrogatories': {
        'parser': ai_parse_special_interrogatories,
        'prompt_builder': build_special_interrogatories_prompt,
        'display_name': 'Special Interrogatories',
        'request_type': 'Special Interrogatory No.',
        'response_type': 'Response to Special Interrogatory No.',
        'template_file': 'SR1_template.docx',  # Updated to use correct template name
        'data_source': 'app_config',  # Uses current_app.config[session_key]
        'workflow_type': 'parse_and_select',  # Uses parse → select → generate
    },
    'requests_for_production': {
        'parser': ai_parse_requests_for_production,
        'prompt_builder': build_requests_for_production_prompt,
        'display_name': 'Requests for Production',
        'request_type': 'Request for Production No.',
        'response_type': 'Response to Request for Production No.',
        'template_file': 'discovery_responses_template.docx',  # Rename to rfp_template.docx later
        'data_source': 'app_config',  # Uses current_app.config[session_key]
        'workflow_type': 'parse_and_select',  # Uses parse → select → generate
    },
    'requests_for_admission': {
        'parser': ai_parse_requests_for_admission,
        'prompt_builder': build_requests_for_admission_prompt,
        'display_name': 'Requests for Admission',
        'request_type': 'Request for Admission No.',
        'response_type': 'Response to Request for Admission No.',
        'template_file': 'RFA_template.docx',  # Use RFA-specific template
        'data_source': 'app_config',  # Uses current_app.config[session_key]
        'workflow_type': 'parse_and_select',  # Uses parse → select → generate
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

def get_supported_discovery_types():
    """Returns list of all supported discovery types."""
    return list(DISCOVERY_TYPE_REGISTRY.keys())

def get_discovery_types_by_workflow(workflow_type: str):
    """Returns discovery types that use a specific workflow."""
    return [
        discovery_type for discovery_type, config in DISCOVERY_TYPE_REGISTRY.items()
        if config.get('workflow_type') == workflow_type
    ]