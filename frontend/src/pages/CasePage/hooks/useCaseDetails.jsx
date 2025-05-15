// src/pages/CasePage/hooks/useCaseDetails.js
import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';
import { datesAreEqual } from '../../../utils/dateUtils';

export function useCaseDetails(caseId) {
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  const [caseProgress, setCaseProgress] = useState(0);
  
  const fetchCaseDetails = useCallback(async () => {
    if (!caseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getCase(caseId);
      setCaseDetails(response.data);
      
      // Calculate data completeness
      const dataCompleteness = calculateDataCompleteness(response.data);
      setCaseProgress(dataCompleteness);
      
      // Count pending suggestions with filtering
      const pendingSuggestions = response.data.case_details?.pending_suggestions || {};
      let count = 0;

      // Helper function to check if a value should be filtered out
      const shouldFilterValue = (value) => {
        // Check for null/undefined
        if (value === null || value === undefined) return true;
        // Check for empty strings, zeros
        if (value === 0 || value === "0" || value === "") return true;
        // Check for empty arrays
        if (Array.isArray(value) && value.length === 0) return true;
        // Check for empty objects
        if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
        // Check for strings that only contain whitespace
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
      };

      // Helper function to determine if a field is a date field
      const isDateField = (fieldName) => {
        return fieldName.includes('date');
      };

      // Filter and count only valid suggestions
      Object.entries(pendingSuggestions).forEach(([docKey, suggestions]) => {
        Object.entries(suggestions).forEach(([field, value]) => {
          // Skip if value should be filtered
          if (shouldFilterValue(value)) return;
          
          // Check for redundancy with current case values
          let currentValue = response.data[field] !== undefined ? 
            response.data[field] : response.data.case_details?.[field];
          
          if (currentValue !== undefined) {
            // For date fields
            if (isDateField(field)) {
              // Use the imported datesAreEqual function for proper date comparison
              if (datesAreEqual(currentValue, value)) {
                console.log(`Skipping redundant date suggestion for ${field}:`, { currentValue, value });
                return; // Skip if dates match
              }
            } 
            // For string values
            else if (typeof value === 'string' && typeof currentValue === 'string') {
              // Normalize strings for comparison
              const normalizedCurrent = currentValue.toLowerCase().trim();
              const normalizedSuggested = value.toLowerCase().trim();
              if (normalizedCurrent === normalizedSuggested) {
                console.log(`Skipping redundant string suggestion for ${field}:`, { currentValue, value });
                return; // Skip if strings match
              }
            }
            // For other types
            else {
              try {
                // Try JSON comparison with normalized values
                const normalizedCurrent = JSON.stringify(currentValue).toLowerCase();
                const normalizedSuggested = JSON.stringify(value).toLowerCase();
                if (normalizedCurrent === normalizedSuggested) {
                  console.log(`Skipping redundant object suggestion for ${field}:`, { currentValue, value });
                  return;
                }
              } catch (e) {
                // Fallback to direct comparison
                if (value === currentValue) {
                  console.log(`Skipping redundant value suggestion for ${field}:`, { currentValue, value });
                  return;
                }
              }
            }
          }
          
          // If we get here, this is a valid suggestion to count
          count++;
        });
      });

      setSuggestionsCount(count);
    } catch (err) {
      console.error(`Error fetching case ${caseId}:`, err);
      setError(`Failed to load case details. ${err.response?.status === 404 ? 'Case not found.' : 'Is the backend running?'}`);
      setCaseDetails(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const updateCase = useCallback(async (updateData) => {
    if (!caseId) return;
    
    try {
      const response = await api.updateCase(caseId, updateData);
      console.log("Update response in useCaseDetails:", response);
      
      // Update local state with the response data
      if (response?.data) {
        setCaseDetails(response.data);
      }
      
      message.success("Case updated successfully");
      return fetchCaseDetails(); // Refresh data
    } catch (err) {
      console.error(`Error updating case ${caseId}:`, err);
      message.error(`Failed to update case: ${err.response?.data?.error || err.message}`);
      throw err; // Let caller handle specific error behavior
    }
  }, [caseId, fetchCaseDetails]);

  const deleteCase = useCallback(async () => {
    if (!caseId) return;
    
    try {
      await api.deleteCase(caseId);
      message.success("Case deleted successfully");
      return true; // Indicate success to caller for navigation
    } catch (err) {
      console.error(`Error deleting case ${caseId}:`, err);
      message.error(`Failed to delete case: ${err.response?.data?.error || err.message}`);
      return false; // Indicate failure
    }
  }, [caseId]);

  // Helper function to calculate case data completeness
  const calculateDataCompleteness = (data) => {
    if (!data) return 0;
    
    const requiredFields = [
      'display_name', 'official_case_name', 'case_number', 
      'judge', 'plaintiff', 'defendant'
    ];
    
    let filledFields = 0;
    requiredFields.forEach(field => {
      if (data[field] && data[field].toString().trim() !== '') {
        filledFields++;
      }
    });
    
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  return {
    caseDetails,
    loading,
    error,
    suggestionsCount,
    caseProgress,
    fetchCaseDetails,
    updateCase,
    deleteCase
  };
}