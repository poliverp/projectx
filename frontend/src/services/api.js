import axios from 'axios';

// !!! --- SECURITY WARNING --- !!!
// DO NOT embed real secret API keys in frontend code.
// This key should ideally be used ONLY by your backend server.
// This is included here ONLY because you specifically requested it as an example.
// Assume this key is for authenticating requests *to your own backend*,
// and your backend then uses its *own* secure keys for 3rd party services.
// Configure this to point to where your backend server will run
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Example of sending the key as a header (adapt based on your backend needs)
    // Common headers are 'Authorization': `Bearer ${YOUR_BACKEND_API_KEY}`
    // or a custom header like 'X-API-Key': YOUR_BACKEND_API_KEY
  },
});

// --- Case Management ---
export const getCases = () => apiClient.get('/cases');
export const getCase = (caseId) => apiClient.get(`/cases/${caseId}`);
export const createCase = (caseData) => apiClient.post('/cases', caseData);
export const updateCase = (caseId, caseData) => apiClient.put(`/cases/${caseId}`, caseData);
export const deleteCase = (caseId) => apiClient.delete(`/cases/${caseId}`);
export const getDocumentTypes = () => apiClient.get('/generation/document-types');

// --- Document Management ---
export const getDocumentsForCase = (caseId) => apiClient.get(`/cases/${caseId}/documents`);

// Upload requires multipart/form-data, handled separately
export const uploadDocument = async (caseId, file, options = {}) => {
  const formData = new FormData();
  formData.append('document', file); // Backend expects a file field named 'document'
  formData.append('options', JSON.stringify(options)); // Send options like { analyze: true }

  try {
    const response = await axios.post(`${API_BASE_URL}/cases/${caseId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error("Upload error details:", error.response || error.message);
    throw error; // Re-throw to be caught by calling function
  }
};

export const deleteDocument = (documentId) => apiClient.delete(`/documents/${documentId}`);

// --- Analysis & Creation ---
export const analyzeDocument = (documentId) => {
  // Make the actual POST request to the backend endpoint
  // The apiClient already has the base URL and necessary headers (like X-API-Key) configured
  return apiClient.post(`/documents/${documentId}/analyze`);
  // No request body is needed for this specific endpoint currently
};

// Keep the createNewDocument placeholder for now
export const generateDocument = (caseId, generationData) => {
  // generationData should be like { document_type: "...", custom_instructions: "..." }
  return apiClient.post(`/cases/${caseId}/generate_document`, generationData);
};

// --- *** ADD THIS NEW FUNCTION *** ---
export const downloadWordDocument = async (caseId, data) => {
  // data might include { template_name: '...' } if you want to pass it,
  // though your backend route currently hardcodes 'jury_fees_template.docx'
  try {
    console.log(`API: Requesting Word download for case ${caseId}`);
    // Make POST request to the new endpoint.
    // CRUCIAL: Set responseType to 'blob' to handle the file download.
    const response = await apiClient.post(
      `/cases/${caseId}/download_word_document`, // The new backend route
      data, // Pass any data needed (like template_name)
      {
        responseType: 'blob', // Tell axios to expect binary file data
      }
    );

    // --- Handle the file download using Blob ---

    // 1. Create a Blob URL from the response data (the .docx file content)
    const url = window.URL.createObjectURL(new Blob([response.data]));

    // 2. Create a temporary invisible link element
    const link = document.createElement('a');
    link.href = url;

    // 3. Set the download filename
    // Try to get filename from backend's 'Content-Disposition' header
    let filename = `Generated_Document_Case_${caseId}.docx`; // Default
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('attachment')) {
      const filenameMatch = disposition.match(/filename="?(.+)"?/);
      if (filenameMatch && filenameMatch.length === 2)
        filename = filenameMatch[1];
    }
    link.setAttribute('download', filename);

    // 4. Append link to body, click it programmatically, remove link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 5. Clean up the Blob URL
    window.URL.revokeObjectURL(url);

    console.log("API: Word document download successfully initiated.");
    return { success: true }; // Return simple success or potentially blob info if needed

  } catch (error) {
    console.error("API Error downloading Word document:", error);
    // Attempt to parse backend error if response exists and is JSON blob
     if (error.response && error.response.data instanceof Blob && error.response.data.type === "application/json") {
       try {
         // Read the blob as text, then parse as JSON
         const errorJson = JSON.parse(await error.response.data.text());
         // Throw a new error with the backend's message
         throw new Error(errorJson.error || 'Failed to download Word document due to server error.');
       } catch (parseError) {
          console.error("Failed to parse error blob:", parseError);
          // Fallback if parsing fails
          throw new Error('Failed to download Word document and could not parse error details.');
       }
     }
    // Re-throw the error (original or parsed) for the component to catch
    throw error;
  }
};
// --- *** END ADD NEW FUNCTION *** ---

// Optional default export
const api = {
  getCases,
  getCase,
  createCase,
  updateCase,
  deleteCase,
  getDocumentsForCase,
  uploadDocument,
  deleteDocument,
  analyzeDocument,
  getDocumentTypes,
  generateDocument,
  downloadWordDocument,
};

export default api;