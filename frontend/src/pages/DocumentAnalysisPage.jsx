import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api'; // Assuming you might fetch docs here too

function DocumentAnalysisPage() {
    const { caseId } = useParams();
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);

    // Fetch documents to allow selection
    useEffect(() => {
        setLoading(true);
        api.getDocumentsForCase(caseId)
            .then(response => setDocuments(response.data || []))
            .catch(err => setError("Failed to load documents for analysis."))
            .finally(() => setLoading(false));
    }, [caseId]);

    const handleAnalyze = async () => {
        if (!selectedDocId) {
            alert("Please select a document to analyze.");
            return;
        }
        setLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            // This uses the placeholder function in api.js
            // Replace with actual backend call when implemented
            const result = await api.analyzeDocument(selectedDocId);
            setAnalysisResult(result.data); // Assuming backend returns analysis data
        } catch (err) {
            setError(`Analysis failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Document Analysis for Case {caseId}</h1>
            <Link to={`/case/${caseId}`} className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Case Page</Link>

            <div style={{ margin: '20px 0' }}>
                <label htmlFor="doc-select">Select Document: </label>
                <select
                    id="doc-select"
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    disabled={loading || documents.length === 0}
                >
                    <option value="">-- Select a document --</option>
                    {documents.map(doc => (
                        <option key={doc.id} value={doc.id}>
                            {doc.file_name}
                        </option>
                    ))}
                </select>
                <button onClick={handleAnalyze} disabled={!selectedDocId || loading} style={{ marginLeft: '10px' }}>
                    Analyze Selected
                </button>
            </div>

            {loading && <p className="loading-message">Loading/Analyzing...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {analysisResult && (
                <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', background: '#e9ecef' }}>
                    <h3>Analysis Results</h3>
                    {/* Display results - structure depends on your backend response */}
                    <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
                </div>
            )}
             {!analysisResult && !loading && <p><i>Select a document and click Analyze. (Backend Feature Required)</i></p>}
        </div>
    );
}

export default DocumentAnalysisPage;
