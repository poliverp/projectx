"""
Discovery module for handling legal discovery documents.
"""
# For backward compatibility, re-export the parsers and prompt builders
from .parsers import (
    parse_form_interrogatories,
    parse_special_interrogatories,
    parse_requests_for_production,
    parse_requests_for_admission,
)

from .prompt_builders import (
    build_form_interrogatories_prompt,
    build_special_interrogatories_prompt,
    build_requests_for_production_prompt as build_rfp_prompt,  # Alias for backward compatibility
    build_requests_for_admission_prompt as build_rfa_prompt,  # Alias for backward compatibility
)

from .base import DiscoveryQuestion
from .service import DiscoveryResponseService
from .registry import DISCOVERY_TYPE_REGISTRY, get_discovery_type_info

# Version of the discovery module
__version__ = '1.0.0'