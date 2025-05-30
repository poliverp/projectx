// src/config/caseFields.js

/**
 * Configuration for Case fields used across the frontend.
 * This should be kept in sync with the backend models.py Case model.
 */
export const caseFieldConfig = [
  // --- Top-Level Columns from models.py ---
  {
    name: 'display_name',        // Matches DB column name
    label: 'Display Name',       // User-facing label
    isDedicated: true,           // It's a top-level column
    isEditable: true,            // Can be edited in the modal
    showInList: true,            // Show in ManageCasesScreen table
    showInitially: true,         // Show in initial CasePage details card
    isRequired: true,            // Required for creation/editing
    placeholder: 'Enter a short name for easy identification',
  },
  {
    name: 'official_case_name',
    label: 'Official Name',
    isDedicated: true,
    isEditable: true,
    showInList: true,
    showInitially: true,
    isRequired: false,
    placeholder: 'e.g., Smith v. Jones',
    span: 2 // For Descriptions layout on CasePage
  },
  {
    name: 'case_number',
    label: 'Case Number',
    isDedicated: true,
    isEditable: true,
    showInList: true,
    showInitially: true,
    isRequired: false,
    placeholder: 'e.g., 2:24-cv-01234',
  },
  {
    name: 'judge',
    label: 'Judge',
    isDedicated: true,
    isEditable: true,
    showInList: false, // Example: Not shown in main list table
    showInitially: true,
    isRequired: false,
    placeholder: 'e.g., Hon. Jane Doe',
  },
  {
    name: 'plaintiff',
    label: 'Plaintiff',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: true,
    isRequired: false,
    placeholder: 'Primary plaintiff name',
  },
  {
    name: 'defendant',
    label: 'Defendant',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'Primary defendant name',
  },
  {
    name: 'defendants',
    label: 'Defendants',
    isDedicated: false,
    isEditable: true,
    showInList: false,
    showInitially: true,
    isRequired: false,
    placeholder: 'List of defendants (separated by semicolons)',
    group: 'parties',
  },
  {
    name: 'active_defendant',
    label: 'Active Defendant',
    isDedicated: false,
    isEditable: true,
    showInList: false,
    showInitially: true,
    isRequired: false,
    placeholder: 'Currently selected defendant',
    group: 'parties',
  },
  {
    name: 'filing_date',
    label: 'Filing Date',
    type: 'date',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'YYYY-MM-DD',
  },
  {
    name: 'jurisdiction',
    label: 'Jurisdiction',
    isDedicated: true,   // It's a dedicated column now
    isEditable: true,    // Allow editing
    showInList: false,   // Don't show in list table
    showInitially: false, // Don't show in initial details view
    isRequired: false,   // Not required
    placeholder: 'e.g., UNLIMITED JURISDICTION',
    displayTransform: value => value, // No transformation needed, already uppercase
  },
  {
    name: 'county', 
    label: 'County',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., LOS ANGELES COUNTY',
    displayTransform: value => value, // No transformation needed, already uppercase
  },
  {
    name: 'trial_date',
    label: 'Trial Date',
    type: 'date', // Add this property
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'YYYY-MM-DD',
  },
  {
    name: 'incident_date',
    label: 'Incident Date',
    type: 'date', // Add this property
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'YYYY-MM-DD',
  },
  {
    name: 'incident_location',
    label: 'Incident Location',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., Corner of Main St & 1st Ave',
  },
  {
    name: 'incident_description',
    label: 'Incident Description',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'Brief description of the incident',
    // Note: Might need a TextArea component in forms later
  },
  {
    name: 'case_type',
    label: 'Case Type',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., Personal Injury, Breach of Contract',
  },
  {
    name: 'defendant_counsel_attorneys',
    label: 'Defendant Attorneys',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., W. CHRISTOPHER MALONEY, ESQ.',
    group: 'defendant_counsel',
  },
  {
    name: 'defendant_counsel_firm',
    label: 'Defendant Firm',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., WILSON, ELSER, MOSKOWITZ',
    group: 'defendant_counsel',
  },
  {
    name: 'defendant_counsel_address',
    label: 'Defendant Firm Address',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., 655 Montgomery Street, Suite 900',
    group: 'defendant_counsel',
  },
  {
    name: 'defendant_counsel_email',
    label: 'Defendant Firm Email',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., contact@firm.com',
    group: 'defendant_counsel',
  },
  {
    name: 'defendant_counsel_phone',
    label: 'Defendant Firm Phone',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., (555) 123-4567',
    group: 'defendant_counsel',
  },
  {
    name: 'plaintiff_counsel_info',
    label: 'Plaintiff Counsel Info',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'Name, Firm, Contact Info',
  },
  {
    name: 'vehicle_details',
    label: 'Vehicle Details',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'e.g., Make, Model, License Plate',
  },
  {
    name: 'acting_attorney',
    label: 'Acting Attorney',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'Current attorney handling the case',
  },
  {
    name: 'acting_clerk',
    label: 'Acting Clerk',
    isDedicated: true,
    isEditable: true,
    showInList: false,
    showInitially: false,
    isRequired: false,
    placeholder: 'Current clerk assigned to the case',
  },
  {
    name: 'id',
    label: 'Case ID',
    isDedicated: true,
    isEditable: false,
    showInList: false,
    showInitially: false,
  },
  {
    name: 'created_at',
    label: 'Date Created',
    isDedicated: true,
    isEditable: false,
    showInList: true,
    showInitially: false,
  },
  {
    name: 'updated_at',
    label: 'Last Updated',
    isDedicated: true,
    isEditable: false,
    showInList: true,
    showInitially: false,
  },
  {
    name: 'last_analyzed_doc_id',
    label: 'Last Analyzed Doc ID',
    isDedicated: false, // Assuming this lives in case_details
    isEditable: false,
    showInList: false,
    showInitially: false,
  },
  // Add case_details itself if you ever need to refer to the whole blob? Unlikely needed here.
  // { name: 'case_details', label: 'Raw Details JSON', isDedicated: true, isEditable: false, showInList: false, showInitially: false },
];

// Helper function (optional, can also do this logic inline)
export function getCaseFieldValue(caseDetails, fieldName, fieldConfig) {
    const config = fieldConfig.find(f => f.name === fieldName);
    if (!config || !caseDetails) {
        return 'N/A'; // Or null, or undefined
    }

    if (config.isDedicated) {
        // Access top-level property
        const value = caseDetails[config.name];
        return (value !== null && value !== undefined && value !== '') ? value : 'N/A';
    } else {
        // Access property within case_details JSON blob
        const details = caseDetails.case_details || {};
        // Handle potentially nested keys like 'court_info.county' if needed later
        const value = details[config.name];
        return (value !== null && value !== undefined && value !== '') ? value : 'N/A';
    }
}