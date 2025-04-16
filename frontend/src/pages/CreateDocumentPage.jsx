import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function CreateDocumentPage() {
    const { caseId } = useParams();
    const [docType, setDocType] = useState('');
    const [customData, setCustomData] = useState(''); // Example: Simple text input
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedDocInfo, setGeneratedDocInfo] = useState(null);

    const handleCreate = async () => {
        if (!docType) {
            alert("Please select a document type.");
            return;
        }
        setLoading(true);
        setError(null);
        setGeneratedDocInfo(null);
        try {
            // Prepare data based on selected docType and inputs
            const creationData = { type: docType, details: customData };
            // This uses the placeholder function in api.js
            const result = await api.createNewDocument(caseId, creationData);
            setGeneratedDocInfo(result.data); // Assuming backend returns info about the created doc
        } catch (err) {
            setError(`Document creation failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Create Document for Case {caseId}</h1>
            <Link to={`/case/${caseId}`} className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Case Page</Link>

            <div style={{ margin: '20px 0' }}>
                <label htmlFor="doctype-select">Document Type: </label>
                <select id="doctype-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option value="">-- Select Type --</option>
                    <option value="motion">Motion</option>
                    <option value="summary">Case Summary</option>
                    <option value="letter">Client Letter</option>
                    {/* Add more document types */}
                </select>
            </div>

            <div style={{ margin: '20px 0' }}>
                <label htmlFor="custom-data">Additional Details/Instructions: </label><br />
                <textarea
                    id="custom-data"
                    rows="4"
                    cols="50"
                    value={customData}
                    onChange={(e) => setCustomData(e.target.value)}
                    placeholder="Enter any specific details needed for generation..."
                />
            </div>

            <button onClick={handleCreate} disabled={!docType || loading}>
                Generate Document
            </button>

            {loading && <p className="loading-message">Generating...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {generatedDocInfo && (
                 <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', background: '#d4edda' }}>
                    <h3>Document Generation Status</h3>
                    {/* Display info - structure depends on your backend response */}
                    <p>{generatedDocInfo.message || "Generation process initiated."}</p>
                    {/* Maybe provide a link to the generated document if available */}
                </div>
            )}
             {!generatedDocInfo && !loading && <p><i>Select type, add details, and click Generate. (Backend Feature Required)</i></p>}
        </div>
    );
}

export default CreateDocumentPage;