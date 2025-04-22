// --- src/pages/CasePage.jsx ---
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Adjust path if needed

// --- Basic Styles (Move to CSS file ideally) ---
// Placed outside the component for clarity
const modalOverlayStyle = {
  position: 'fixed', // Stick to viewport
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent black background
  display: 'flex',
  alignItems: 'center', // Center vertically
  justifyContent: 'center', // Center horizontally
  zIndex: 1050, // Ensure it's on top
};
const modalContentStyle = {
  background: 'white',
  padding: '25px 35px',
  borderRadius: '8px',
  minWidth: '450px',
  maxWidth: '600px',
  maxHeight: '90vh', // Limit height
  overflowY: 'auto', // Add scroll if content overflows
  boxShadow: '0 5px 15px rgba(0,0,0,.2)',
  position: 'relative' // Needed for potential close button positioning later
};
const formGroupStyle = {
  marginBottom: '1rem', // Standard spacing between form groups
  textAlign: 'left', // Align labels left
};
const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '1rem',
  lineHeight: 1.5,
  color: '#495057', backgroundColor: '#fff',
  backgroundClip: 'padding-box',
  border: '1px solid #ced4da',
  borderRadius: '0.25rem', // Corrected from '1 '0.25rem'
  transition: 'border-color .15s ease-in-out, box-shadow .15s ease-in-out', // Corrected from stray ', 2'
  boxSizing: 'border-box', // Include padding and border in element's total width/height
};
// --- End Basic Styles ---

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

  // --- State for Edit Case Modal --- (Already present in your code)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({}); // Holds data being edited in modal
  const [editLoading, setEditLoading] = useState(false); // Loading state for modal save
  const [editError, setEditError] = useState(null);      // Error state for modal save

  // State for Document Generation
  const [docTypes, setDocTypes] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const [copied, setCopied] = useState(false); // State for copy feedback

  // --- Callback Functions & Handlers (Defined at Top Level) ---

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

  // --- NEW: Handler to Open Edit Modal --- (Already present in your code)
  const handleOpenEditModal = () => {
      if (!caseDetails) return; // Safety check

      // Initialize the edit form state with current case details
      setEditFormData({
          // Use empty string '' as fallback for null/undefined values from backend
          display_name: caseDetails.display_name || '',
          official_case_name: caseDetails.official_case_name || '',
          case_number: caseDetails.case_number || '',
          judge: caseDetails.judge || '',
          plaintiff: caseDetails.plaintiff || '',
          defendant: caseDetails.defendant || '',
          // We are NOT editing the case_details JSON blob in this form
      });
      setEditError(null); // Clear any previous errors in the modal
      setIsEditModalOpen(true); // Open the modal
  };

  // --- NEW: Handler for Edit Form Input Changes --- (Already present in your code)
  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prevData => ({
        ...prevData,
        [name]: value // Update the specific field based on input's name attribute
    }));
  };

  // Handler for Applying Suggestions (Seems fine, no changes needed here for the modal)
  async function handleApplyChanges() {
    if (Object.keys(acceptedSuggestions).length === 0 || isApplying) {
      return;
    }
    console.log("Attempting to apply accepted suggestions to DEDICATED COLUMNS + case_details:", acceptedSuggestions);
    setIsApplying(true);
    setApplySuccess(false);
    setError(null);

    const updatePayload = {};
    const currentCaseDetailsData = caseDetails?.case_details ?? {};
    const updatedDetails = JSON.parse(JSON.stringify(currentCaseDetailsData));
    const processedDocKeys = new Set();
    let caseDetailsChanged = false;

    for (const docKey in acceptedSuggestions) {
      processedDocKeys.add(docKey);
      if (typeof acceptedSuggestions[docKey] === 'object' && acceptedSuggestions[docKey] !== null) {
        for (const field in acceptedSuggestions[docKey]) {
          const acceptedValue = acceptedSuggestions[docKey][field];
          const dedicatedFields = [
            'official_case_name', 'case_number', 'judge',
            'plaintiff', 'defendant', 'filing_date', 'judge_doc', 'case_number_doc', 'department',
            'jurisdiction', 'county', 'trial_date'
          ];

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

    if (Object.keys(updatePayload).length === 0) {
        console.log("No effective changes detected to apply.");
        setIsApplying(false);
        setAcceptedSuggestions({});
        return;
    }

    console.log("Sending combined update payload (targetting columns & case_details):", updatePayload);

    try {
      await api.updateCase(caseId, updatePayload);
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 3000);
      setAcceptedSuggestions({});
      fetchCaseDetails();
    } catch (err) {
      console.error("Failed to apply changes:", err);
      setError(`Failed to apply changes: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsApplying(false);
    }
  }

  // Handler for Generating Document (No changes needed here for the modal)
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

  // Handler for Copy Button (No changes needed here for the modal)
  const handleCopyGeneratedText = useCallback(() => {
    if (!generationResult) return;
    navigator.clipboard.writeText(generationResult)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setGenerationError("Failed to copy text to clipboard.");
      });
  }, [generationResult]);

  // Handler for Dismiss Button (No changes needed here for the modal)
  const handleDismissGeneratedText = useCallback(() => {
      setGenerationResult('');
      setGenerationError(null);
      setCopied(false);
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
        setGenerationError("Could not load document types list.");
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
    <div> {/* Main container div */}
      <h1>Case: {display_name}</h1>

      {/* Official Details Section */}
      <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h4>Official Details</h4>
          <p style={{ margin: '5px 0' }}><strong>Official Name:</strong> {official_case_name || caseDetailsData.official_case_name || 'N/A'}</p>
          <p style={{ margin: '5px 0' }}><strong>Case Number:</strong> {case_number || caseDetailsData.case_number_doc || 'N/A'}</p>
          <p style={{ margin: '5px 0' }}><strong>Judge:</strong> {judge || caseDetailsData.judge_doc || 'N/A'}</p>
          <p style={{ margin: '5px 0' }}><strong>Plaintiff:</strong> {plaintiff || caseDetailsData.plaintiff || 'N/A'}</p>
          <p style={{ margin: '5px 0' }}><strong>Defendant:</strong> {defendant || caseDetailsData.defendant || 'N/A'}</p>
          {/* --- MODIFIED: Button now calls handleOpenEditModal --- */}
          <button
            onClick={handleOpenEditModal} // *** Changed from handleUpdateInfo ***
            style={{ marginTop: '10px', backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Update Case Info
          </button>
      </div>

      {/* Pending Suggestions Display Section (Unchanged) */}
      <div style={{ border: `1px solid ${error ? '#dc3545' : '#17a2b8'}`, padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h2>Pending Analysis Suggestions</h2>
            {pendingSuggestions && Object.keys(pendingSuggestions).length > 0 ? (
              <div>
                {Object.entries(pendingSuggestions).map(([docKey, suggestions]) => (
                  <div key={docKey} style={{ border: '1px dashed #ccc', padding: '15px', marginBottom: '15px', marginTop: '10px', borderRadius: '4px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Suggestions from Document: {docKey}{docKey === `doc_${lastAnalyzedDocId}` ? ' (Latest Analysis)' : ''}</h4>
                    {typeof suggestions === 'object' && suggestions !== null ? (
                      <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                        {Object.entries(suggestions).map(([field, suggestedValue]) => {
                          const currentValue = caseDetailsData?.[field] ?? caseDetails?.[field] ?? 'Not Set';
                          const isChecked = !!(acceptedSuggestions[docKey]?.[field] !== undefined);
                          return (suggestedValue !== null && (
                            <li key={field} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                              <strong style={{ textTransform: 'capitalize', display: 'block', marginBottom: '5px' }}>{field.replace(/_/g, ' ')}</strong>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', paddingTop: '5px' }}>
                                  <input type="checkbox" checked={isChecked} onChange={(e) => handleCheckboxChange(docKey, field, suggestedValue, e.target.checked)} style={{ transform: 'scale(1.3)'}} aria-label={`Accept suggestion for ${field.replace(/_/g, ' ')}`} />
                                  <button title={`Reject suggestion for ${field}`} onClick={() => handleCheckboxChange(docKey, field, suggestedValue, false)} disabled={!isChecked} style={{ padding: '1px 4px', borderRadius: '50%', backgroundColor: '#f8f9fa', border: '1px solid #ccc', cursor: isChecked ? 'pointer' : 'not-allowed', opacity: isChecked ? 1 : 0.5, fontSize: '10px', lineHeight: '1' }}>❌</button>
                                </div>
                                <div style={{ flexGrow: 1 }}>
                                  <div style={{ marginBottom: '5px' }}>
                                    <span style={{ fontSize: '0.8em', color: '#6c757d', fontWeight: 'bold' }}>Suggested:</span>
                                    <pre style={{ margin: '2px 0 0 5px', padding: '5px 8px', background: isChecked ? '#d4edda' : '#e9ecef', borderRadius: '3px', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9em' }}>{JSON.stringify(suggestedValue, null, 2)}</pre>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.8em', color: '#6c757d' }}>Current:</span>
                                    <pre style={{ margin: '2px 0 0 5px', padding: '5px 8px', background: '#f8f9fa', borderRadius: '3px', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9em', border: '1px solid #dee2e6' }}>{JSON.stringify(currentValue, null, 2)}</pre>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ));
                        })}
                      </ul>
                    ) : ( <p>Suggestions data for {docKey} is not in the expected format.</p> )}
                  </div>
                ))}
                {/* Apply Changes Button (Unchanged) */}
                <button onClick={handleApplyChanges} disabled={isApplying || Object.keys(acceptedSuggestions).length === 0} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: applySuccess ? '#218838' : (isApplying ? '#ffc107' : '#28a745'), color: isApplying ? '#333' : 'white', border: 'none', borderRadius: '4px', cursor: (isApplying || Object.keys(acceptedSuggestions).length === 0) ? 'not-allowed' : 'pointer', opacity: (isApplying || Object.keys(acceptedSuggestions).length === 0) ? 0.6 : 1, transition: 'background-color 0.3s ease' }} >
                  {isApplying ? 'Applying Changes...' : (applySuccess ? 'Changes Applied!' : 'Apply Accepted Changes')}
                </button>
              </div>
            ) : ( <p>No pending analysis suggestions found for this case.</p> )}
      </div>

      {/* --- START: DOCUMENT GENERATION SECTION --- (Unchanged) */}
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

            {/* Display Area */}
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
          </div>
        ) : ( <p>Loading document types...</p> )}
      </div>
      {/* --- END: DOCUMENT GENERATION SECTION --- */}

      {/* Action Buttons (Unchanged) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
       <Link to={`/case/${caseId}/files`} className="button-link">View/Upload Files</Link>
       <Link to={`/case/${caseId}/analyze`} className="button-link" style={{backgroundColor: '#17a2b8'}}>Doc Analysis Page [PH]</Link>
       <Link to={`/case/${caseId}/create-doc`} className="button-link" style={{backgroundColor: '#28a745'}}>Create Document</Link>
      </div>

      {/* Navigation back (Unchanged) */}
      <div style={{ marginTop: '30px' }}>
        <Link to="/manage-cases" className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Manage Cases</Link>
        <Link to="/" className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Home</Link>
      </div>

      {/* --- ADDED: Edit Case Modal --- */}
      {isEditModalOpen && (
        <div style={modalOverlayStyle}> {/* Basic overlay style */}
          <div style={modalContentStyle}> {/* Basic modal content style */}
            <h2>Edit Case Information</h2>
            {/* We will add onSubmit={handleSaveChanges} in the next step */}
            <form onSubmit={(e) => { e.preventDefault(); alert('Save logic not implemented yet.'); }}>
              {editError && <p style={{ color: 'red', marginBottom: '15px' }}>{editError}</p>}

              {/* Display Name */}
              <div style={formGroupStyle}>
                <label htmlFor="edit_display_name">Display Name:*</label>
                <input
                  type="text"
                  id="edit_display_name"
                  name="display_name" // name MUST match backend/state key
                  value={editFormData.display_name || ''}
                  onChange={handleEditFormChange}
                  required
                  style={inputStyle}
                />
              </div>

              {/* Official Case Name */}
              <div style={formGroupStyle}>
                <label htmlFor="edit_official_case_name">Official Case Name:</label>
                <input
                  type="text"
                  id="edit_official_case_name"
                  name="official_case_name" // name MUST match backend/state key
                  value={editFormData.official_case_name || ''}
                  onChange={handleEditFormChange}
                  style={inputStyle}
                />
              </div>

              {/* Case Number */}
              <div style={formGroupStyle}>
                <label htmlFor="edit_case_number">Case Number:</label>
                <input
                  type="text"
                  id="edit_case_number"
                  name="case_number" // name MUST match backend/state key
                  value={editFormData.case_number || ''}
                  onChange={handleEditFormChange}
                  style={inputStyle}
                />
              </div>

              {/* Judge */}
              <div style={formGroupStyle}>
                <label htmlFor="edit_judge">Judge:</label>
                <input
                  type="text"
                  id="edit_judge"
                  name="judge" // name MUST match backend/state key
                  value={editFormData.judge || ''}
                  onChange={handleEditFormChange}
                  style={inputStyle}
                />
              </div>

              {/* Plaintiff */}
              <div style={formGroupStyle}>
                <label htmlFor="edit_plaintiff">Plaintiff:</label>
                <input
                  type="text"
                  id="edit_plaintiff"
                  name="plaintiff" // name MUST match backend/state key
                  value={editFormData.plaintiff || ''}
                  onChange={handleEditFormChange}
                  style={inputStyle}
                />
              </div>

              {/* Defendant */}
              <div style={formGroupStyle}>
                <label htmlFor="edit_defendant">Defendant:</label>
                <input
                  type="text"
                  id="edit_defendant"
                  name="defendant" // name MUST match backend/state key
                  value={editFormData.defendant || ''}
                  onChange={handleEditFormChange}
                  style={inputStyle}
                />
              </div>

              {/* --- Buttons --- */}
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editLoading}
                  style={{ marginRight: '10px', padding: '8px 15px' }}
                >
                  Cancel
                </button>
                {/* Save Button */}
                <button
                   type="submit" // Will trigger onSubmit handler (added next)
                   disabled={editLoading}
                   style={{ padding: '8px 15px' }}
                 >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- End Edit Case Modal --- */}

    </div> // End of main container div
  );
} // End of CasePage component function

export default CasePage;