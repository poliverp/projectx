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
      showInitially: false, // Example: Don't show this one initially
      isRequired: false,
      placeholder: 'Primary defendant name',
    },
    // --- Fields expected inside case_details JSON blob ---
    // Add fields here that your analysis *might* find and you want to manage,
    // even if they don't have dedicated columns YET.
    {
      name: 'jurisdiction', // This key should match what your AI/analysis saves
      label: 'Jurisdiction',
      isDedicated: false, // Lives inside case_details JSON
      isEditable: false, // Not editable via the main Edit modal (yet)
      showInList: false,
      showInitially: false,
    },
    {
      name: 'county', // This key should match what your AI/analysis saves
      label: 'County',
      isDedicated: false,
      isEditable: false,
      showInList: false,
      showInitially: false,
    },
     {
      name: 'filing_date', // This key should match what your AI/analysis saves
      label: 'Filing Date',
      isDedicated: false,
      isEditable: false,
      showInList: false,
      showInitially: false,
    },
    // Add other potential fields from your AI prompt's desired JSON structure
    // { name: 'case_type', label: 'Case Type', isDedicated: false, ... },
    // { name: 'incident_date', label: 'Incident Date', isDedicated: false, ... },
    // { name: 'trial_date', label: 'Trial Date', isDedicated: false, ... },
  
    // --- Read-only/System Fields ---
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