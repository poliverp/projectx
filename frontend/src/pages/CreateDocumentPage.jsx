import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function CreateDocumentPage() {
    const { caseId } = useParams();
    const [docType, setDocType] = useState('');
    const [customInstructions, setCustomInstructions] = useState(''); 
    const [generatedContent, setGeneratedContent] = useState(null);
    const [availableDocTypes, setAvailableDocTypes] = useState([]); // New state for types
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // ---test ---hjlj
    // --- Step 1: Fetch available document types on component mount ---
    useEffect(() => {
        const fetchDocTypes = async () => {
            try {
                const types = await api.getDocumentTypes(); // Call the api.js function
                setAvailableDocTypes(types.data); // Assuming backend returns array in .data
            } catch (err) {
                console.error("Failed to fetch document types:", err);
                // Optionally set an error state for fetching types
            }
        };

        fetchDocTypes();
    }, [caseId]); // Refetch if caseId changes (though unlikely on this page)
    // -------------------------------------------------------------

    const handleCreate = async () => {
        if (!docType) {
            alert("Please select a document type.");
            return;
        }
        setLoading(true);
        setError(null);
        setGeneratedContent(null); // Clear previous generated content
        try {
            // --- Step 2 & 3: Call the correct API function with correct data format ---
            const creationData = {
                document_type: docType, // Match backend's expected key
                custom_instructions: customInstructions // Match backend's expected key
            };

            // Call the api.generateDocument function
            const response = await api.generateDocument(caseId, creationData);

            // --- Step 4: Handle the response - store generated content ---
            // Backend returns { ..., "generated_content": "..." }
            if (response.data && response.data.generated_content !== undefined) {
                 setGeneratedContent(response.data.generated_content); // Store the content string
            } else {
                 // Handle cases where backend response format is unexpected
                 setError("Unexpected response format from backend.");
                 console.error("Unexpected backend response:", response.data);
            }

        } catch (err) {
            // More specific error handling based on backend response if possible
            const errorMessage = err.response?.data?.error || err.message;
            setError(`Document generation failed: ${errorMessage}`);
            console.error("Generation API error:", err.response || err.message);
        } finally {
            setLoading(false);
        }
    };
    // --- *** NEW Handler for Word Doc Download *** ---
    const handleDownloadWord = async () => {
        // We'll hardcode the template for now, as the backend route expects it
        const templateInfo = {
            template_name: 'jury_fees_template.docx'
            // Add any other info needed by the API call, if any
        };

        setLoading(true); // Use the same loading state for simplicity
        setError(null);
        setGeneratedContent(null); // Clear generated text area if downloading doc

        try {
            // Assume api.js has this function making the POST request
            // to /api/cases/<caseId>/download_word_document
            // This function likely won't return usable data directly,
            // it relies on the browser handling the download via server headers.
            await api.downloadWordDocument(caseId, templateInfo);

            // If the call succeeds and doesn't throw an error, the browser
            // *should* have started the download automatically.
            // We don't need to set generatedContent here.
            console.log("Word document download initiated.");

        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
            setError(`Failed to download Word document: ${errorMessage}`);
            console.error("Word Download API error:", err.response || err.message);
        } finally {
            setLoading(false);
        }
    };
    // --- *** END NEW Handler *** ---
    return (
        <div>
            <h1>Create Document for Case {caseId}</h1>
            <Link to={`/case/${caseId}`} className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Case Page</Link>

            <div style={{ margin: '20px 0' }}>
                <label htmlFor="doctype-select">Document Type: </label>
                <select
                    id="doctype-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    disabled={loading || availableDocTypes.length === 0} // Disable if loading or no types fetched
                >
                    <option value="">-- Select Type --</option>
                     {/* Map over fetched types to create dropdown options */}
                    {availableDocTypes.map(type => (
                        <option key={type} value={type}>{type.replace(/_/g, ' ').toUpperCase()}</option> // Display types nicely
                    ))}
                </select>
                 {/* Optional: Display a loading/error message if fetching types failed */}
                 {availableDocTypes.length === 0 && !error && !loading && <p>Loading document types...</p>}
            </div>
            
            <div style={{ margin: '20px 0' }}>
                <label htmlFor="custom-data">Additional Details/Instructions: </label><br />
                <textarea
                    id="custom-data"
                    rows="4"
                    cols="50"
                    value={customInstructions} // Use the renamed state variable
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Enter any specific details needed for generation..."
                    disabled={loading} // Disable while loading
                />
            </div>

            <button onClick={handleCreate} disabled={!docType || loading}>
                Generate Document
            </button>

            {/* *** NEW Button for Word Download *** */}
            {/* We might only enable this if a specific type known to have a template is selected? */}
            {/* For now, enable if any type selected, assuming backend handles template mapping or errors */}
            <button onClick={handleDownloadWord} disabled={loading}> {/* Maybe disable if docType isn't 'jury_fees'? Or handle template selection better later */}
                Download Jury Fees Doc (.docx)
            </button>
                 {/* *** END NEW Button *** */}
            {loading && <p className="loading-message">Generating...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {/* --- Step 5: Display the generated content --- */}
            {generatedContent && (
                 <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', background: '#f8f9fa', whiteSpace: 'pre-wrap' }}>
                    <h3>Generated Document Content:</h3>
                    <p>{generatedContent}</p> {/* Display the actual generated text */}
                 </div>
            )}
            {/* ------------------------------------------- */}

             {!generatedContent && !loading && !error && availableDocTypes.length > 0 && (
                 <p><i>Select a document type, add optional details, and click Generate.</i></p>
             )}

        </div>
    );
}


export default CreateDocumentPage;