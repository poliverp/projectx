// src/pages/CreateDocumentPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function CreateDocumentPage() {
    const { caseId } = useParams();
    // State for AI document generation (if keeping this feature on this page)
    const [docType, setDocType] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [generatedContent, setGeneratedContent] = useState(null);
    const [availableDocTypes, setAvailableDocTypes] = useState([]);

    // --- NEW State for Word Template Download ---
    // Hardcode a list of available template filenames for now
    // IMPORTANT: These names MUST exactly match the .docx files in your backend/templates/ folder
    const [availableTemplates] = useState([
        'jury_fees_template.docx',
        'demand_letter_template.docx', // Example: Add other template names here
        'case_summary_template.docx',  // Example: Add other template names here
        // Add more template filenames as needed
    ]);
    const [selectedTemplate, setSelectedTemplate] = useState(''); // State for the chosen template

    // --- Existing state ---
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false); // Use this for both generation and download

    // Fetch available AI document types (remains the same)
    useEffect(() => {
        const fetchDocTypes = async () => {
            try {
                const types = await api.getDocumentTypes();
                setAvailableDocTypes(types.data || []);
            } catch (err) {
                console.error("Failed to fetch document types:", err);
                setError("Failed to load AI document types."); // Set specific error
            }
        };
        fetchDocTypes();
    }, [caseId]); // Dependency array remains

    // Handler for AI Generation (remains the same)
    const handleCreate = async () => {
        if (!docType) {
            alert("Please select an AI document type to generate.");
            return;
        }
        setLoading(true);
        setError(null);
        setGeneratedContent(null);
        try {
            const creationData = {
                document_type: docType,
                custom_instructions: customInstructions
            };
            const response = await api.generateDocument(caseId, creationData);
            if (response.data && response.data.generated_content !== undefined) {
                setGeneratedContent(response.data.generated_content);
            } else {
                setError("Unexpected response format from AI generation.");
                console.error("Unexpected backend response:", response.data);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message;
            setError(`AI Document generation failed: ${errorMessage}`);
            console.error("Generation API error:", err.response || err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- *** THIS IS THE UPDATED Handler for Word Doc Download *** ---
    const handleDownloadWord = async () => {
        // --- 1. Check if a template is selected ---
        if (!selectedTemplate) {
            alert("Please select a Word template to download.");
            return;
        }

        // --- 2. Prepare data payload with selected template name ---
        const templateInfo = {
            template_name: selectedTemplate // Use the state variable
        };

        setLoading(true); // Use the same loading state
        setError(null);
        setGeneratedContent(null); // Clear generated text area if downloading doc

        console.log(`Requesting download for template: ${selectedTemplate}`);

        try {
            // --- 3. Call API with the template info ---
            // Assumes api.js has the downloadWordDocument function making the POST request
            // with responseType: 'blob' and handling the browser download trigger.
            await api.downloadWordDocument(caseId, templateInfo); // Pass selected template name
            console.log("Word document download initiated successfully.");

        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
            setError(`Failed to download Word document: ${errorMessage}`);
            console.error("Word Download API error:", err.response || err.message);
        } finally {
            setLoading(false);
        }
    };
    // --- *** END UPDATED Handler *** ---

    // --- Helper function to format template names for display ---
    const formatTemplateName = (filename) => {
        if (!filename) return '';
        // Remove .docx, replace underscores with spaces, capitalize words
        return filename
            .replace(/\.docx$/i, '') // Case-insensitive .docx removal
            .replace(/[_-]/g, ' ') // Replace underscore or hyphen with space
            .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word
    };

    return (
        <div>
            <h1>Create/Generate Document for Case {caseId}</h1>
            <Link to={`/case/${caseId}`} className="button-link" style={{ backgroundColor: '#6c757d' }}>Back to Case Page</Link>

            {/* --- Section for AI Generation (Optional - Kept from previous version) --- */}
            <div style={{ border: '1px solid #ccc', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
                <h2>Generate Content using AI</h2>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="doctype-select" style={{ marginRight: '5px'}}>AI Document Type: </label>
                    <select
                        id="doctype-select"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        disabled={loading || availableDocTypes.length === 0}
                    >
                        <option value="">-- Select AI Type --</option>
                        {availableDocTypes.map(type => (
                            <option key={type} value={type}>{type.replace(/_/g, ' ').toUpperCase()}</option>
                        ))}
                    </select>
                    {availableDocTypes.length === 0 && !error && !loading && <p>Loading AI document types...</p>}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="custom-data" style={{ display: 'block', marginBottom: '5px' }}>Additional Instructions for AI: </label>
                    <textarea
                        id="custom-data"
                        rows="3" cols="50"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Enter any specific details needed for AI generation..."
                        disabled={loading}
                        style={{ width: '95%', padding: '8px' }}
                    />
                </div>
                <button onClick={handleCreate} disabled={!docType || loading}>
                    Generate AI Content Preview
                </button>
            </div>
            {/* --- End AI Generation Section --- */}


            {/* --- Section for Word Template Download --- */}
            <div style={{ border: '1px solid #007bff', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
                <h2>Download Formatted Document (.docx)</h2>
                 {/* --- NEW Template Selection Dropdown --- */}
                 <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="template-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Template:</label>
                    <select
                        id="template-select"
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        disabled={loading || availableTemplates.length === 0}
                        style={{ padding: '8px', minWidth: '250px' }}
                    >
                        <option value="">-- Select a template file --</option>
                        {/* Populate dropdown from availableTemplates state */}
                        {availableTemplates.map(templateFile => (
                            <option key={templateFile} value={templateFile}>
                                {formatTemplateName(templateFile)} {/* Display formatted name */}
                            </option>
                        ))}
                    </select>
                 </div>
                 {/* --- END NEW Dropdown --- */}

                {/* --- UPDATED Download Button --- */}
                <button onClick={handleDownloadWord} disabled={loading || !selectedTemplate}>
                    Download Selected Template (.docx)
                </button>
                 {/* --- END UPDATED Button --- */}
            </div>
            {/* --- End Word Template Download Section --- */}


            {/* --- Common Loading/Error Display --- */}
            {loading && <p className="loading-message">Processing...</p>}
            {error && <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}

            {/* Display AI Generated Content (remains the same) */}
            {generatedContent && (
                <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', background: '#f8f9fa', whiteSpace: 'pre-wrap' }}>
                    <h3>Generated AI Content Preview:</h3>
                    {/* Consider adding copy/dismiss buttons for generated content */}
                    <p>{generatedContent}</p>
                </div>
            )}

            {/* Initial instruction message */}
            {!generatedContent && !loading && !error && availableDocTypes.length > 0 && (
                <p><i>Select an AI type and generate content, or select a Word template and download.</i></p>
            )}
        </div>
    );
}

export default CreateDocumentPage;