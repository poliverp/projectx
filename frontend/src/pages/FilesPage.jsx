import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import FileDropzone from '../components/FileDropzone'; // Import the dropzone

function FilesPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [caseDisplayName, setCaseDisplayName] = useState(''); // Store case name for display

  // Function to fetch documents and case name
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch case details first to get the name
      const caseResponse = await api.getCase(caseId);
      setCaseDisplayName(caseResponse.data?.display_name || `Case ${caseId}`);

      // Then fetch documents
      const docResponse = await api.getDocumentsForCase(caseId);
      setDocuments(docResponse.data || []);
      setError(null); // Clear previous errors on successful fetch
    } catch (err) {
      console.error(`Error fetching data for case ${caseId}:`, err);
      setError(`Failed to load data. ${err.response?.status === 404 ? 'Case or documents not found.' : 'Is the backend running?'}`);
      // Don't clear documents if only case fetch failed but docs might exist
      if (err.response?.status === 404 && !documents.length) setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, documents.length]); // Rerun if caseId changes

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Use the memoized fetchData function

  // Handle files accepted from Dropzone or Manual Upload
  const handleFilesAccepted = async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null); // Clear previous upload errors

    // Process files sequentially for clearer feedback (can be parallelized)
    let uploadSuccess = true;
    for (const file of acceptedFiles) {
      try {
        // For this example, we'll just upload directly.
        // In a real app, you'd use modals for options (storeOnly, analyze).
        console.log(`Uploading ${file.name}...`);
        // Assume default options: upload copy, don't analyze immediately
        const options = { storeOnly: false, analyze: false };

        // Backend API needs to handle the file and options
        await api.uploadDocument(caseId, file, options);
        console.log(`Successfully uploaded ${file.name}`);

      } catch (err) {
        console.error(`Error uploading file ${file.name}:`, err);
        setError(prevError => `${prevError ? prevError + '; ' : ''}Failed to upload ${file.name}`);
        uploadSuccess = false;
        // break; // Uncomment to stop on first error
      }
    }

    setUploading(false);
    if (uploadSuccess && acceptedFiles.length > 0) {
      // Refresh the document list only if uploads seemed successful
       await fetchData(); // Re-fetch documents after upload
    } else if (!uploadSuccess) {
        alert("Some files failed to upload. Please check the console for details.");
    }
  };

  // Handler for manual file input change
  const handleManualUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFilesAccepted(Array.from(files)); // Process the selected files
    }
    event.target.value = null; // Clear input value to allow re-selecting same file
  };

  const handleDeleteDocument = async (docId, docName) => {
    if (window.confirm(`Are you sure you want to delete document "${docName}"?`)) {
      try {
        setLoading(true); // Indicate loading during delete
        await api.deleteDocument(docId);
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId)); // Remove locally
        setError(null);
      } catch (err) {
        console.error("Error deleting document:", err);
        setError(`Failed to delete document: ${err.response?.data?.error || err.message}`);
      } finally {
          setLoading(false);
      }
    }
  };

  return (
    <div>
      <h2>Documents for: {caseDisplayName || `Case ${caseId}`}</h2>
      <Link to={`/case/${caseId}`} className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Case Page</Link>

      {/* --- File Upload Section --- */}
      <div style={{ marginTop: '20px', border: '1px solid #eee', padding: '20px', borderRadius: '5px', background: '#f8f9fa' }}>
        <h3>Upload New Documents</h3>
        <FileDropzone onFilesAccepted={handleFilesAccepted} multiple={true} />
        <label htmlFor="manual-upload" className="button-link" style={{ display: 'inline-block', cursor: 'pointer' }}>
          Or Select Files Manually...
        </label>
        <input
          id="manual-upload"
          type="file"
          multiple
          onChange={handleManualUpload}
          style={{ display: 'none' }} // Hide default input
          accept=".pdf,.docx,.txt" // Enforce accepted types
        />
        {uploading && <p className="loading-message" style={{marginTop: '10px'}}>Uploading...</p>}
      </div>

      {/* --- Document List --- */}
      <h3 style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>Existing Documents</h3>
      {loading && documents.length === 0 && <p className="loading-message">Loading documents...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && documents.length === 0 && (
        <p>No documents have been uploaded for this case yet.</p>
      )}

      {!error && documents.length > 0 && (
        <ul>
          {documents.map(doc => (
            <li key={doc.id}>
              <div>
                <strong>{doc.file_name}</strong>
                <br />
                <small style={{ color: 'grey' }}>
                  Uploaded: {new Date(doc.upload_date).toLocaleString()}
                  {/* Optionally show file size if available from backend */}
                  {/* {doc.size && ` | Size: ${(doc.size / 1024).toFixed(1)} KB`} */}
                </small>
              </div>
              {/* Add view/download link if backend provides one */}
              {/* <a href={doc.download_url} target="_blank" rel="noopener noreferrer"><button>Download</button></a> */}
              <button
                onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                className="button-danger"
                disabled={loading || uploading} // Disable while loading or uploading
                aria-label={`Delete document ${doc.file_name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FilesPage;