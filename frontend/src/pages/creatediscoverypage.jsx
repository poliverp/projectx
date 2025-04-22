// Inside CreateDocumentPage.jsx or a new component

// --- Add New State Variables ---
const [interrogatoriesFile, setInterrogatoriesFile] = useState(null);
const [isGeneratingResponses, setIsGeneratingResponses] = useState(false);
const [generatedResponses, setGeneratedResponses] = useState('');
const [responseError, setResponseError] = useState(null);

// --- Add New Handlers ---
const handleFileChange = (event) => {
    setInterrogatoriesFile(event.target.files[0]);
    setGeneratedResponses(''); // Clear previous results
    setResponseError(null);
};

const handleGenerateResponses = async () => {
    if (!interrogatoriesFile || isGeneratingResponses) return;

    setIsGeneratingResponses(true);
    setGeneratedResponses('');
    setResponseError(null);

    try {
        // This function needs to be added to services/api.js
        const result = await api.generateInterrogatoryResponses(caseId, interrogatoriesFile);
        setGeneratedResponses(result.data.generated_content);
    } catch (err) {
        console.error("Failed to generate interrogatory responses:", err);
        setResponseError(`Failed to generate: ${err.response?.data?.error || err.message}`);
    } finally {
        setIsGeneratingResponses(false);
    }
};

// --- Add JSX ---
// (Place this within your return statement, perhaps in a new section)
<div style={{ border: '1px solid #6f42c1', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
    <h3>Generate Interrogatory Responses (Draft)</h3>
    <div style={{ marginBottom: '10px' }}>
        <label htmlFor="interrogatoriesFile" style={{ marginRight: '10px' }}>Upload Interrogatories PDF:</label>
        <input
            type="file"
            id="interrogatoriesFile"
            accept=".pdf"
            onChange={handleFileChange}
        />
    </div>
    <button
        onClick={handleGenerateResponses}
        disabled={!interrogatoriesFile || isGeneratingResponses}
        style={{ /* Add styles */ }}
    >
        {isGeneratingResponses ? 'Generating...' : 'Generate Draft Responses'}
    </button>

    {responseError && <div style={{ color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap' }}>Error: {responseError}</div>}

    {generatedResponses && (
        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <h4>Generated Draft:</h4>
            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', background: '#f8f9fa', padding: '10px', border: '1px solid #ddd', maxHeight: '500px', overflowY: 'auto' }}>
                {generatedResponses}
            </pre>
             {/* Add Copy/Edit buttons later? */}
        </div>
    )}
</div>