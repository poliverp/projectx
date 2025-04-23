// frontend/src/pages/CreateDiscoveryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // Import useParams and Link
import api from '../services/api'; // Adjust path if needed

function CreateDiscoveryPage() {
  // --- Get caseId from URL ---
  const { caseId } = useParams();

  // --- State Variables ---
  const [interrogatoriesFile, setInterrogatoriesFile] = useState(null);
  const [isGeneratingResponses, setIsGeneratingResponses] = useState(false);
  const [generatedResponses, setGeneratedResponses] = useState('');
  const [responseError, setResponseError] = useState(null);
  const [caseDisplayName, setCaseDisplayName] = useState(''); // Optional: For display
  const [loadingCase, setLoadingCase] = useState(true); // Optional: Loading state for case name

   // Optional: Fetch case display name for context
   useEffect(() => {
    setLoadingCase(true);
    api.getCase(caseId)
      .then(response => {
        setCaseDisplayName(response.data.display_name || `Case ${caseId}`);
      })
      .catch(err => {
        console.error("Error fetching case display name:", err);
        setCaseDisplayName(`Case ${caseId}`); // Fallback
      })
      .finally(() => {
        setLoadingCase(false);
      });
  }, [caseId]);


  // --- Handlers ---
  const handleFileChange = (event) => {
    setInterrogatoriesFile(event.target.files[0]);
    setGeneratedResponses(''); // Clear previous results
    setResponseError(null);
  };

  const handleGenerateResponses = async () => {
    if (!interrogatoriesFile || isGeneratingResponses || !caseId) return;

    setIsGeneratingResponses(true);
    setGeneratedResponses('');
    setResponseError(null);

    try {
      // Call the API function we added earlier
      const result = await api.generateInterrogatoryResponses(caseId, interrogatoriesFile);
      setGeneratedResponses(result.data.generated_content);
    } catch (err) {
      console.error("Failed to generate interrogatory responses:", err);
      setResponseError(`Failed to generate: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGeneratingResponses(false);
    }
  };

  // --- JSX ---
  return (
    <div>
      <h1>
        Generate Discovery Responses {loadingCase ? '...' : `for ${caseDisplayName}`}
      </h1>

      <div style={{ border: '1px solid #6f42c1', padding: '15px 25px', borderRadius: '5px', marginTop: '20px', backgroundColor: '#f8f9fa' }}>
        <h3>Generate Interrogatory Responses (Draft)</h3>
        <p>Upload the interrogatories document (PDF) you received for this case.</p>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="interrogatoriesFile" style={{ marginRight: '10px', fontWeight: 'bold' }}>Upload Interrogatories PDF:</label>
          <input
            type="file"
            id="interrogatoriesFile"
            accept=".pdf"
            onChange={handleFileChange}
            style={{padding: '5px'}}
          />
        </div>
        <button
          onClick={handleGenerateResponses}
          disabled={!interrogatoriesFile || isGeneratingResponses}
          style={{ padding: '10px 15px', cursor: (!interrogatoriesFile || isGeneratingResponses) ? 'not-allowed' : 'pointer', opacity: (!interrogatoriesFile || isGeneratingResponses) ? 0.6 : 1, backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isGeneratingResponses ? 'Generating...' : 'Generate Draft Responses'}
        </button>

        {responseError && <div style={{ color: 'red', marginTop: '15px', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#f8d7da', whiteSpace: 'pre-wrap' }}><strong>Error:</strong> {responseError}</div>}

        {generatedResponses && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #dee2e6', paddingTop: '20px' }}>
            <h4>Generated Draft:</h4>
            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', background: 'white', padding: '15px', border: '1px solid #ced4da', borderRadius: '4px', maxHeight: '60vh', overflowY: 'auto', fontFamily: 'monospace' }}>
              {generatedResponses}
            </pre>
            {/* Add Copy/Edit buttons later? */}
             <button onClick={() => navigator.clipboard.writeText(generatedResponses)} style={{marginTop: '10px'}}>
                Copy Draft
             </button>
          </div>
        )}
      </div>

       {/* Navigation Back */}
       <div style={{ marginTop: '30px' }}>
         <Link to={`/case/${caseId}`} className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Case Details</Link>
         <Link to="/manage-cases" className="button-link" style={{backgroundColor: '#6c757d', marginLeft: '10px'}}>Back to Manage Cases</Link>
       </div>

    </div>
  );
}

export default CreateDiscoveryPage;