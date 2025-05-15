// src/pages/CasePage/hooks/useSuggestions.js
import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import api from '../../../services/api';

export function useSuggestions(caseDetails, refreshCase) {
  // State for tracking locked fields - this is the source of truth for UI
  const [lockedFields, setLockedFields] = useState([]);
  
  // State for tracking pending lock/unlock operations
  const [pendingFieldLocks, setPendingFieldLocks] = useState({});
  
  // State for tracking suggestions acceptance
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState({});
  
  // Loading states
  const [isApplying, setIsApplying] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Success/error states
  const [applySuccess, setApplySuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize locked fields when case details change
  useEffect(() => {
    if (caseDetails?.case_details?.locked_fields) {
      console.log('Setting locked fields from case details:', 
        caseDetails.case_details.locked_fields);
      setLockedFields(caseDetails.case_details.locked_fields || []);
    } else {
      console.log('No locked fields found in case details, resetting to empty array');
      setLockedFields([]);
    }
    // Reset pending operations when case details change
    setPendingFieldLocks({});
  }, [caseDetails]);
  
  // Function to toggle field lock status with optimistic UI update
  const toggleFieldLock = useCallback(async (fieldName) => {
    if (!caseDetails) {
      message.error('Cannot lock field: No case details available');
      return;
    }
    
    console.log(`Toggling lock for field: ${fieldName}`);
    setIsLocking(true);
    
    // Check if field is currently locked
    const isCurrentlyLocked = lockedFields.includes(fieldName);
    console.log(`Field ${fieldName} is currently ${isCurrentlyLocked ? 'locked' : 'unlocked'}`);
    
    // Create new locked fields array for optimistic update
    const newLockedFields = isCurrentlyLocked 
      ? lockedFields.filter(f => f !== fieldName) 
      : [...lockedFields, fieldName];
    
    // Update UI immediately (optimistic update)
    setLockedFields(newLockedFields);
    
    // Track this field as having a pending operation
    setPendingFieldLocks(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    try {
      // Get the current case details data
      const currentDetails = caseDetails.case_details || {};
      
      // Create a deep copy for the update payload
      const updatedDetails = JSON.parse(JSON.stringify(currentDetails));
      
      // Update the locked_fields array in the copy
      updatedDetails.locked_fields = newLockedFields;
      
      console.log('Sending lock update payload:', { case_details: updatedDetails });
      
      // Make the API call to update the case
      const response = await api.updateCase(caseDetails.id, {
        case_details: updatedDetails
      });
      
      console.log('Lock update response:', response);
      
      // FIXED: Check response structure more carefully
      if (response?.data?.case_details?.locked_fields) {
        // Response has the expected structure
        setLockedFields(response.data.case_details.locked_fields);
        message.success(`Field ${fieldName} ${isCurrentlyLocked ? 'unlocked' : 'locked'}`);
      } else if (response?.data) {
        // Response has data but not the expected structure, so trust our optimistic update
        console.log('Response did not contain locked_fields data, using optimistic update');
        message.success(`Field ${fieldName} ${isCurrentlyLocked ? 'unlocked' : 'locked'}`);
        // DON'T revert the optimistic update since the API call succeeded
      } else {
        // Response has no data at all, something went wrong
        throw new Error('Invalid response format');
      }
      
      // Remove from pending operations
      setPendingFieldLocks(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
      
      // Optionally refresh the case data to ensure everything is in sync
      if (refreshCase) {
        await refreshCase();
      }
    } catch (err) {
      console.error(`Error ${isCurrentlyLocked ? 'unlocking' : 'locking'} field ${fieldName}:`, err);
      
      // Revert the optimistic update on error
      setLockedFields(isCurrentlyLocked 
        ? [...lockedFields] // Keep it locked if it was locked
        : lockedFields.filter(f => f !== fieldName) // Remove if it wasn't locked
      );
      
      // Remove from pending operations
      setPendingFieldLocks(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
      
      message.error(`Failed to ${isCurrentlyLocked ? 'unlock' : 'lock'} field: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLocking(false);
    }
  }, [caseDetails, lockedFields, refreshCase]);
  
  // Function to check if a field is locked or has a pending lock operation
  const isFieldLocked = useCallback((fieldName) => {
    return lockedFields.includes(fieldName);
  }, [lockedFields]);
  
  // Function to check if a field has a pending lock/unlock operation
  const isFieldLockPending = useCallback((fieldName) => {
    return pendingFieldLocks[fieldName] === true;
  }, [pendingFieldLocks]);
  
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
    setError(null);
    
    try {
      // Build the update payload
      const updatePayload = {};
      const currentCaseDetailsData = caseDetails?.case_details ?? {};
      const updatedDetails = JSON.parse(JSON.stringify(currentCaseDetailsData));
      const processedDocKeys = new Set();
      let caseDetailsChanged = false;
      
      // Helper function to truncate string values
      const truncateValue = (value, maxLength = 200) => {
        if (typeof value === 'string' && value.length > maxLength) {
          console.warn(`Truncating value from ${value.length} to ${maxLength} characters`);
          return value.substring(0, maxLength);
        }
        return value;
      };

      // Process each accepted suggestion
      for (const [docKey, suggestions] of Object.entries(acceptedSuggestions)) {
        processedDocKeys.add(docKey);
        
        for (const [field, acceptedValue] of Object.entries(suggestions)) {
          // Skip if field is locked
          if (isFieldLocked(field)) {
            console.log(`Field ${field} is locked, skipping...`);
            continue;
          }
          
          // Determine if this is a dedicated field or case_details field
          const fieldConfig = window.caseFieldConfig?.find(f => f.name === field);
          if (!fieldConfig) {
            console.warn(`No field configuration found for ${field}, skipping...`);
            continue;
          }
          
          const processedValue = truncateValue(acceptedValue);
          
          if (fieldConfig.isDedicated) {
            updatePayload[field] = processedValue;
          } else {
            if (updatedDetails[field] !== processedValue) {
              updatedDetails[field] = processedValue;
              caseDetailsChanged = true;
            }
          }
        }
      }
      
      // Clear processed suggestions from case_details
      if (updatedDetails.pending_suggestions) {
        for (const docKey of processedDocKeys) {
          if (updatedDetails.pending_suggestions[docKey]) {
            delete updatedDetails.pending_suggestions[docKey];
            caseDetailsChanged = true;
          }
        }
        if (Object.keys(updatedDetails.pending_suggestions).length === 0) {
          delete updatedDetails.pending_suggestions;
        }
      }
      
      // Include locked_fields in the update
      updatedDetails.locked_fields = lockedFields;
      caseDetailsChanged = true;
      
      if (caseDetailsChanged) {
        updatePayload.case_details = updatedDetails;
      }
      
      // If no changes to apply, just exit
      if (Object.keys(updatePayload).length === 0) {
        setAcceptedSuggestions({});
        setIsApplying(false);
        return;
      }
      
      console.log("Sending update payload:", updatePayload);
      
      // Make the API call
      const response = await api.updateCase(caseDetails.id, updatePayload);
      
      setApplySuccess(true);
      message.success("Changes applied successfully!");
      
      // Clear the accepted suggestions
      setAcceptedSuggestions({});
      
      // Refresh the case data
      if (refreshCase) {
        await refreshCase();
      }
    } catch (err) {
      console.error("Error applying changes:", err);
      
      if (err.code === 'ECONNABORTED') {
        setError("Request timed out. Please try again.");
        message.error("Request timed out. Please try again.");
      } else {
        setError(err.response?.data?.error || err.message || "Failed to apply changes");
        message.error(err.response?.data?.error || err.message || "Failed to apply changes");
      }
    } finally {
      setIsApplying(false);
    }
  }, [caseDetails, acceptedSuggestions, isApplying, refreshCase, lockedFields, isFieldLocked]);
  
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
    // Core lock functionality
    lockedFields,
    toggleFieldLock,
    isFieldLocked,
    isFieldLockPending,
    isLocking,
    
    // Suggestion handling
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