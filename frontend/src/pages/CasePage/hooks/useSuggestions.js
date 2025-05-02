// src/pages/CasePage/hooks/useSuggestions.js
import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';
import { caseFieldConfig } from '../../../config/caseFieldConfig';

export function useSuggestions(caseDetails, refreshCase) {
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState({});
  const [isApplying, setIsApplying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  
  const handleCheckboxChange = useCallback((docKey, field, suggestedValue, isChecked) => {
    setAcceptedSuggestions(prev => {
      const newAccepted = JSON.parse(JSON.stringify(prev));
      if (isChecked) {
        if (!newAccepted[docKey]) newAccepted[docKey] = {};
        newAccepted[docKey][field] = suggestedValue;
      } else {
        if (newAccepted[docKey]?.[field] !== undefined) {
          delete newAccepted[docKey][field];
          if (Object.keys(newAccepted[docKey]).length === 0) delete newAccepted[docKey];
        }
      }
      return newAccepted;
    });
  }, []);
  
  const handleDismissLocally = useCallback((docKey, fieldKey) => {
    setDismissedSuggestions(prev => {
      const newDismissed = JSON.parse(JSON.stringify(prev));
      if (!newDismissed[docKey]) {
        newDismissed[docKey] = {};
      }
      newDismissed[docKey][fieldKey] = true;
      return newDismissed;
    });
    
    // Remove from accepted if it was checked
    setAcceptedSuggestions(prev => {
      const newAccepted = JSON.parse(JSON.stringify(prev));
      if (newAccepted[docKey]?.[fieldKey] !== undefined) {
        delete newAccepted[docKey][fieldKey];
        if (Object.keys(newAccepted[docKey]).length === 0) delete newAccepted[docKey];
        return newAccepted;
      }
      return prev;
    });
  }, []);
  
  const handleApplyChanges = useCallback(async () => {
    
    
    if (!caseDetails || Object.keys(acceptedSuggestions).length === 0 || isApplying) {
      return;
    }
    
    
    setIsApplying(true);
    setApplySuccess(false);
    
    // Build the update payload - this was missing before
    const updatePayload = {};
    const currentCaseDetailsData = caseDetails?.case_details ?? {};
    const updatedDetails = JSON.parse(JSON.stringify(currentCaseDetailsData));
    const processedDocKeys = new Set();
    let caseDetailsChanged = false;

    for (const docKey in acceptedSuggestions) {
      if (!acceptedSuggestions[docKey] || Object.keys(acceptedSuggestions[docKey]).length === 0) {
        continue;
      }
      processedDocKeys.add(docKey);
      
      for (const field in acceptedSuggestions[docKey]) {
        const acceptedValue = acceptedSuggestions[docKey][field];
        
        const dedicatedFields = caseFieldConfig
          .filter(field => field.isDedicated === true)
          .map(field => field.name);
          
        if (dedicatedFields.includes(field)) {
          updatePayload[field] = acceptedValue;
          console.log(`Applying to dedicated column: ${field} = ${JSON.stringify(acceptedValue)}`);
        } else {
          if (updatedDetails[field] !== acceptedValue) {
            updatedDetails[field] = acceptedValue;
            console.log(`Applying to case_details JSON (non-dedicated field): ${field} = ${JSON.stringify(acceptedValue)}`);
            caseDetailsChanged = true;
          }
        }
      }
    }

    if (updatedDetails.pending_suggestions) {
      for (const docKey of processedDocKeys) {
        if (updatedDetails.pending_suggestions[docKey]) {
          delete updatedDetails.pending_suggestions[docKey];
          console.log(`Removed processed suggestions for ${docKey} from case_details`);
          caseDetailsChanged = true;
        }
      }
      if (Object.keys(updatedDetails.pending_suggestions).length === 0) {
        delete updatedDetails.pending_suggestions;
      }
    }

    if (caseDetailsChanged) {
      updatePayload.case_details = updatedDetails;
    }
    
    // If no changes to apply, just exit
    if (Object.keys(updatePayload).length === 0) {
      console.log("No effective changes detected to apply.");
      setIsApplying(false);
      setAcceptedSuggestions({});
      return;
    }
    
    try {
      console.log("Sending update payload:", updatePayload);
      
      // Use caseDetails.id to ensure we have the right ID
      await api.updateCase(caseDetails.id, updatePayload);
      setApplySuccess(true);
      message.success("Changes applied successfully!");
      
      // Clear the accepted suggestions
      setAcceptedSuggestions({});
      
      // Ensure we're refreshing the case data
      if (refreshCase) {
        console.log("Refreshing case data after update");
        refreshCase();
      }
    } catch (err) {
      console.error("Failed to apply changes:", err);
      message.error(`Failed to apply changes: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  }, [caseDetails, acceptedSuggestions, isApplying, refreshCase]);
  
  const handleClearSuggestions = useCallback(async () => {
    if (!caseDetails || isClearing || isApplying) return;
    
    setIsClearing(true);
    
    const currentDetails = caseDetails.case_details || {};
    const payload = {
      case_details: {
        ...currentDetails,
        pending_suggestions: {}
      }
    };
    
    try {
      await api.updateCase(caseDetails.id, payload);
      message.success("Pending suggestions cleared successfully!");
      if (refreshCase) {
        refreshCase();
      }
    } catch (err) {
      console.error("Failed to clear suggestions:", err);
      message.error("Failed to clear suggestions.");
    } finally {
      setIsClearing(false);
    }
  }, [caseDetails, isClearing, isApplying, refreshCase]);
  
  return {
    acceptedSuggestions,
    dismissedSuggestions,
    isApplying,
    isClearing,
    applySuccess,
    handleCheckboxChange,
    handleDismissLocally,
    handleApplyChanges,
    handleClearSuggestions
  };
}