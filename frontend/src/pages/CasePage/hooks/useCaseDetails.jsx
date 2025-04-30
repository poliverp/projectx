// src/pages/CasePage/hooks/useCaseDetails.js
import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';

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
      
      // Count pending suggestions
      const pendingSuggestions = response.data.case_details?.pending_suggestions || {};
      let count = 0;
      Object.values(pendingSuggestions).forEach(docSuggestions => {
        count += Object.keys(docSuggestions).length;
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
      await api.updateCase(caseId, updateData);
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