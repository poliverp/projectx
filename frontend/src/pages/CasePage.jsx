// --- src/pages/CasePage.jsx ---
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Adjust path if needed

function CasePage() {
  // --- Hooks MUST Be Called Unconditionally at the Top ---
  const { caseId } = useParams();
  const navigate = useNavigate(); // Keep if needed

  // State for Case Data Fetching
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true); // Main loading state
  const [error, setError] = useState(null); // General error state

  // State for Suggestions Review
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [isApplying, setIsApplying] = useState(false); // Apply button loading
  const [applySuccess, setApplySuccess] = useState(false); // Apply button success visual

  // State for Document Generation
  const [docTypes, setDocTypes] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const [copied, setCopied] = useState(false); // State for copy feedback

  // --- Callback Functions & Handlers (Defined at Top Level) ---

  // useCallback is appropriate here as fetchCaseDetails might be used in dependencies
  const fetchCaseDetails = useCallback(() => {
    if (!isApplying) setLoading(true);
    setError(null);
    setGenerationError(null);
    setGenerationResult('');
    api.getCase(caseId)
      .then(response => {
        setCaseDetails(response.data);
      })
      .catch(err => {
        console.error(`Error fetching case ${caseId}:`, err);
        setError(`Failed to load case details. ${err.response?.status === 404 ? 'Case not found.' : 'Is the backend running?'}`);
        setCaseDetails(null);
      })
      .finally(() => {
         if (!isApplying) setLoading(false);
      });
  }, [caseId, isApplying]);

  // useCallback fine here, not strictly needed if only used in this component's map
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
          console.log("Updated Accepted Suggestions State:", newAccepted);
          return newAccepted;
      });
  }, []);

  // Placeholder
  const handleUpdateInfo = () => {
      alert("Update Case Info: Feature not implemented yet.");
  };

  // Regular async function - defined at top level
  async function handleApplyChanges() {
    if (Object.keys(acceptedSuggestions).length === 0 || isApplying) {
      return;
    }
    console.log("Attempting to apply accepted suggestions:", acceptedSuggestions);
    setIsApplying(true);
    setApplySuccess(false);
    setError(null);

    // --- 1. Prepare Payload with Top-Level Keys for Dedicated Columns ---
    const updatePayload = {}; // Start with an empty payload

    // --- 2. Prepare Updated case_details JSON (Remove Applied Suggestions) ---
    // Get a deep copy of the current case_details to modify
    const currentCaseDetailsData = caseDetails?.case_details || {};
    const updatedDetails = JSON.parse(JSON.stringify(currentCaseDetailsData));
    const processedDocKeys = new Set(); // Keep track of processed suggestions

    // --- 3. Iterate Through Accepted Suggestions ---
    for (const docKey in acceptedSuggestions) {
      processedDocKeys.add(docKey); // Mark this suggestion group for removal later
      for (const field in acceptedSuggestions[docKey]) {
        const acceptedValue = acceptedSuggestions[docKey][field];

        // Check if the accepted field corresponds to a dedicated column
        // Add other dedicated column fields here if analysis provides them
        const dedicatedFields = [
          'official_case_name', 'case_number', 'judge',
          'plaintiff', 'defendant'
          // Add 'date_filed', etc. IF they are dedicated columns and in suggestions
        ];

        if (dedicatedFields.includes(field)) {
          // If it's a dedicated field, add it to the top level of the payload
          updatePayload[field] = acceptedValue; // Use snake_case key for backend
          console.log(`Applying to dedicated column: ${field} = ${JSON.stringify(acceptedValue)}`);
        } else {
          // If it's NOT a dedicated field, merge it into the main case_details JSON
          // (This assumes fields not in dedicatedColumns should live in case_details)
          updatedDetails[field] = acceptedValue;
          console.log(`Applying to case_details JSON: ${field} = ${JSON.stringify(acceptedValue)}`);
        }
      }
    }

    // --- 4. Clean up pending_suggestions in the copied details ---
    if (updatedDetails.pending_suggestions) {
      for (const docKey of processedDocKeys) {
        if (updatedDetails.pending_suggestions[docKey]) {
          delete updatedDetails.pending_suggestions[docKey];
          console.log(`Removed processed suggestions for ${docKey} from case_details`);
        }
      }
      // Optionally remove the whole pending_suggestions key if empty
      if (Object.keys(updatedDetails.pending_suggestions).length === 0) {
        delete updatedDetails.pending_suggestions;
      }
    }

    // --- 5. Add the updated case_details to the payload ---
    // Only add if it changed or if top-level fields were also added
    // (We always update it here to remove pending suggestions)
    updatePayload.case_details = updatedDetails;

    // Check if any actual changes are being sent
    if (Object.keys(updatePayload).length === 1 && Object.keys(updatePayload.case_details).length === Object.keys(currentCaseDetailsData).length && JSON.stringify(updatePayload.case_details) === JSON.stringify(currentCaseDetailsData) ) {
         // Avoid sending update if only case_details structure changed slightly but content is same
         // Or if only pending suggestions were removed but nothing else changed ( debatable )
         // For simplicity now, we'll allow sending even if only pending removed
         console.log("No changes detected besides potentially removing pending suggestions. Proceeding.");
         // You could potentially return here if you don't want to update just for removing pending items
         // setIsApplying(false); return;
    }


    console.log("Sending combined update payload:", updatePayload);

    // --- 6. Call API ---
    try {
      await api.updateCase(caseId, updatePayload); // Send combined payload
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 3000);
      setAcceptedSuggestions({}); // Clear selections
      fetchCaseDetails(); // Refetch case details to show updated data and clear suggestions
    } catch (err) {
      console.error("Failed to apply changes:", err);
      setError(`Failed to apply changes: ${err.response?.data?.error || err.message}`);
      // No need to setIsApplying(false) here, finally block handles it
    } finally {
        setIsApplying(false);
    }
  }

  // Regular async function - defined at top level
  async function handleGenerateDocument() {
      if (!selectedDocType || isGenerating) return;
      console.log(`Requesting generation for type: ${selectedDocType}`);
      setIsGenerating(true);
      setGenerationResult('');
      setGenerationError(null);
      setError(null);

      const generationData = {
          document_type: selectedDocType,
          custom_instructions: customInstructions
      };

      try {
          const response = await api.generateDocument(caseId, generationData);
          if (response.data && response.data.generated_content) {
              setGenerationResult(response.data.generated_content);
          } else {
              setGenerationError("Received unexpected response from server.");
          }
      } catch (err) {
          console.error("Failed to generate document:", err);
          setGenerationError(`Generation failed: ${err.response?.data?.error || err.message}`);
      } finally {
          setIsGenerating(false);
      }
  }

  // Handler for Copy Button
  const handleCopyGeneratedText = useCallback(() => {
    if (!generationResult) return;
    navigator.clipboard.writeText(generationResult)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setGenerationError("Failed to copy text to clipboard."); // Show feedback
      });
  }, [generationResult]); // Depends on generationResult

  // Handler for Dismiss Button
  const handleDismissGeneratedText = useCallback(() => {
      setGenerationResult('');
      setGenerationError(null);
      setCopied(false); // Reset copied state too
  }, []);

  // --- Effects (MUST come after all Hooks and function definitions) ---

  useEffect(() => {
    fetchCaseDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]); // Only run on caseId change

  useEffect(() => {
    api.getDocumentTypes()
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          setDocTypes(response.data);
          if (response.data.length > 0 && !selectedDocType) {
            setSelectedDocType(response.data[0]);
          }
        } else { setDocTypes([]); }
      })
      .catch(err => {
        console.error("Error fetching document types:", err);
        setGenerationError("Could not load document types list."); // Show error
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  // --- Conditional Returns for Loading/Error States ---
  if (loading && !isApplying) return <p className="loading-message">Loading case details...</p>;
  if (error) return <div className="error-message">Error: {error} <button onClick={fetchCaseDetails} disabled={loading}>Retry Load</button> <Link to="/">Go Home</Link></div>;
  if (!caseDetails && !loading) return <div><p>Case not found or failed to load.</p><Link to="/">Go Home</Link></div>;

  // --- Prepare Data for Rendering ---
  const { display_name, official_case_name, case_number, judge, plaintiff, defendant } = caseDetails;
  const caseDetailsData = caseDetails.case_details || {};
  const pendingSuggestions = caseDetailsData.pending_suggestions;
  const lastAnalyzedDocId = caseDetailsData.last_analyzed_doc_id;

  // --- JSX Rendering ---
  return (
    <div>
      <h1>Case: {display_name}</h1>

      {/* Official Details Section */}
      <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h4>Official Details</h4>
         <p style={{ margin: '5px 0' }}><strong>Official Name:</strong> {official_case_name || caseDetailsData.official_case_name || 'N/A'}</p>
         <p style={{ margin: '5px 0' }}><strong>Case Number:</strong> {case_number || caseDetailsData.case_number_doc || 'N/A'}</p>
         <p style={{ margin: '5px 0' }}><strong>Judge:</strong> {judge || caseDetailsData.judge_doc || 'N/A'}</p>
         <p style={{ margin: '5px 0' }}><strong>Plaintiff:</strong> {plaintiff || caseDetailsData.plaintiff || 'N/A'}</p>
         <p style={{ margin: '5px 0' }}><strong>Defendant:</strong> {defendant || caseDetailsData.defendant || 'N/A'}</p>
         <button onClick={handleUpdateInfo} style={{marginTop: '10px', backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer'}}>Update Case Info</button>
      </div>

      {/* Pending Suggestions Display Section */}
      <div style={{ border: `1px solid ${error ? '#dc3545' : '#17a2b8'}`, padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h2>Pending Analysis Suggestions</h2>
           {pendingSuggestions && Object.keys(pendingSuggestions).length > 0 ? (
             <div>
               {Object.entries(pendingSuggestions).map(([docKey, suggestions]) => (
                 <div key={docKey} style={{ border: '1px dashed #ccc', padding: '15px', marginBottom: '15px', marginTop: '10px', borderRadius: '4px' }}>
                   {/* ... JSX for suggestions H4 and UL ... */}
                   {/* (This inner part remains the same as response #55) */}
                   <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Suggestions from Document: {docKey}{docKey === `doc_${lastAnalyzedDocId}` ? ' (Latest Analysis)' : ''}</h4>
                   {typeof suggestions === 'object' && suggestions !== null ? (<ul style={{ listStyleType: 'none', paddingLeft: 0 }}>{Object.entries(suggestions).map(([field, suggestedValue]) => {const currentValue = caseDetailsData?.[field] ?? caseDetails?.[field] ?? 'Not Set'; const isChecked = !!(acceptedSuggestions[docKey]?.[field] !== undefined); return (suggestedValue !== null && (<li key={field} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}><strong style={{ textTransform: 'capitalize', display: 'block', marginBottom: '5px' }}>{field.replace(/_/g, ' ')}</strong><div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', paddingTop: '5px' }}><input type="checkbox" checked={isChecked} onChange={(e) => handleCheckboxChange(docKey, field, suggestedValue, e.target.checked)} style={{ transform: 'scale(1.3)'}} aria-label={`Accept suggestion for ${field.replace(/_/g, ' ')}`} /><button title={`Reject suggestion for ${field}`} onClick={() => handleCheckboxChange(docKey, field, suggestedValue, false)} disabled={!isChecked} style={{ padding: '1px 4px', borderRadius: '50%', backgroundColor: '#f8f9fa', border: '1px solid #ccc', cursor: isChecked ? 'pointer' : 'not-allowed', opacity: isChecked ? 1 : 0.5, fontSize: '10px', lineHeight: '1' }}>❌</button></div><div style={{ flexGrow: 1 }}><div style={{ marginBottom: '5px' }}><span style={{ fontSize: '0.8em', color: '#6c757d', fontWeight: 'bold' }}>Suggested:</span><pre style={{ margin: '2px 0 0 5px', padding: '5px 8px', background: isChecked ? '#d4edda' : '#e9ecef', borderRadius: '3px', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9em' }}>{JSON.stringify(suggestedValue, null, 2)}</pre></div><div><span style={{ fontSize: '0.8em', color: '#6c757d' }}>Current:</span><pre style={{ margin: '2px 0 0 5px', padding: '5px 8px', background: '#f8f9fa', borderRadius: '3px', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9em', border: '1px solid #dee2e6' }}>{JSON.stringify(currentValue, null, 2)}</pre></div></div></div></li>));})}</ul>) : ( <p>Suggestions data for {docKey} is not in the expected format.</p> )}
                 </div>
               ))}
               {/* Apply Changes Button */}
               <button onClick={handleApplyChanges} disabled={isApplying || Object.keys(acceptedSuggestions).length === 0} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: applySuccess ? '#218838' : (isApplying ? '#ffc107' : '#28a745'), color: isApplying ? '#333' : 'white', border: 'none', borderRadius: '4px', cursor: (isApplying || Object.keys(acceptedSuggestions).length === 0) ? 'not-allowed' : 'pointer', opacity: (isApplying || Object.keys(acceptedSuggestions).length === 0) ? 0.6 : 1, transition: 'background-color 0.3s ease' }} >
                 {isApplying ? 'Applying Changes...' : (applySuccess ? 'Changes Applied!' : 'Apply Accepted Changes')}
               </button>
             </div>
           ) : ( <p>No pending analysis suggestions found for this case.</p> )}
      </div>
      {/* --- END: PENDING SUGGESTIONS DISPLAY SECTION --- */}


      {/* --- START: DOCUMENT GENERATION SECTION --- */}
      <div style={{ border: '1px solid #007bff', padding: '15px', borderRadius: '5px', marginBottom: '20px', marginTop: '20px' }}>
          <h2>Generate Document</h2>
          {docTypes.length > 0 ? (
            <div>
              {/* Dropdown */}
              <div style={{ marginBottom: '10px' }}>
                <label htmlFor="docTypeSelect" style={{ marginRight: '10px', fontWeight: 'bold' }}>Document Type:</label>
                <select id="docTypeSelect" value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} style={{ padding: '8px', minWidth: '200px' }} >
                  {docTypes.map(type => ( <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option> ))}
                </select>
              </div>
              {/* Textarea */}
              <div style={{ marginBottom: '10px' }}>
                  <label htmlFor="customInstructions" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Optional Custom Instructions:</label>
                  <textarea id="customInstructions" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} rows="3" placeholder="e.g., Emphasize the tight deadline." style={{ width: '95%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              {/* Generate Button */}
              <button onClick={handleGenerateDocument} disabled={!selectedDocType || isGenerating} style={{ padding: '10px 15px', backgroundColor: isGenerating ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: (!selectedDocType || isGenerating) ? 'not-allowed' : 'pointer', opacity: (!selectedDocType || isGenerating) ? 0.6 : 1 }} >
                {isGenerating ? 'Generating...' : `Generate ${selectedDocType ? selectedDocType.replace(/_/g, ' ') : 'Document'}`}
              </button>

              {/* --- Display Area (With Fragment Wrapper) --- */}
              <>
                {generationError && <div style={{color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap'}}>Error: {generationError}</div>}
                {generationResult && (
                    <div style={{marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px', position: 'relative' }}>
                        <button onClick={handleDismissGeneratedText} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.2em', cursor: 'pointer', color: '#6c757d' }} title="Dismiss Generated Text">
                            &times;
                        </button>
                        <h4>Generated Content Preview:</h4>
                        <pre style={{whiteSpace: 'pre-wrap', wordWrap: 'break-word', background: '#f8f9fa', padding: '10px', border: '1px solid #ddd', maxHeight: '400px', overflowY: 'auto'}}>
                            {generationResult}
                        </pre>
                        <button onClick={handleCopyGeneratedText} style={{ marginTop: '10px', marginRight: '10px', padding: '5px 10px', cursor: 'pointer' }}>
                            {copied ? 'Copied!' : 'Copy Text'}
                        </button>
                    </div>
                )}
              </>
              {/* --- End Display Area --- */}

            </div>
          ) : ( <p>Loading document types...</p> )}
      </div>
      {/* --- END: DOCUMENT GENERATION SECTION --- */}

      {/* Action Buttons */}
       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <Link to={`/case/${caseId}/files`} className="button-link">View/Upload Files</Link>
        <Link to={`/case/${caseId}/analyze`} className="button-link" style={{backgroundColor: '#17a2b8'}}>Doc Analysis Page [PH]</Link>
        <Link to={`/case/${caseId}/create-doc`} className="button-link" style={{backgroundColor: '#28a745'}}>Create Document</Link>
      </div>

      {/* Navigation back */}
      <div style={{ marginTop: '30px' }}>
        <Link to="/manage-cases" className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Manage Cases</Link>
        <Link to="/" className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Home</Link>
      </div>
    </div>
  );
}

export default CasePage;