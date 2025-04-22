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
    // Use axios directly for multipart/form-data if apiClient has default json headers
    const response = await axios.post(`${API_BASE_URL}/cases/${caseId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
         // Add any auth headers needed if not handled globally by axios instance
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

export const downloadWordDocument = async (caseId, data) => {
  // data might include { template_name: '...' }
  try {
    console.log(`API: Requesting Word download for case ${caseId}`);
    const response = await apiClient.post(
      `/cases/${caseId}/download_word_document`, // The new backend route
      data, // Pass any data needed (like template_name)
      {
        responseType: 'blob', // Tell axios to expect binary file data
      }
    );

    // --- Handle the file download using Blob ---
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    let filename = `Generated_Document_Case_${caseId}.docx`; // Default
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('attachment')) {
      const filenameMatch = disposition.match(/filename="?(.+)"?/);
      if (filenameMatch && filenameMatch.length === 2)
        filename = filenameMatch[1];
    }
    link.setAttribute('download', filename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log("API: Word document download successfully initiated.");
    return { success: true };

  } catch (error) {
    console.error("API Error downloading Word document:", error);
     if (error.response && error.response.data instanceof Blob && error.response.data.type === "application/json") {
       try {
         const errorJson = JSON.parse(await error.response.data.text());
         throw new Error(errorJson.error || 'Failed to download Word document due to server error.');
       } catch (parseError) {
         console.error("Failed to parse error blob:", parseError);
         throw new Error('Failed to download Word document and could not parse error details.');
       }
     }
    throw error;
  }
};

// --- NEW: Discovery Response Generation ---
export const generateInterrogatoryResponses = async (caseId, file) => {
    const formData = new FormData();
    formData.append('file', file); // Key 'file' must match backend request.files['file']

    // Use axios directly if apiClient default headers interfere with FormData.
    // Otherwise, apiClient.post might work if configured correctly.
    // Using axios directly for clarity with multipart/form-data:
    try {
        // The path assumes '/api' is in API_BASE_URL and '/discovery' is the blueprint prefix
        const response = await axios.post(`${API_BASE_URL}/discovery/cases/${caseId}/interrogatory-responses`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                 // Add any necessary auth headers like apiClient might have
            }
        });
        return response; // Return the full response object
    } catch (error) {
        console.error("Generate Interrogatory Responses error details:", error.response || error.message);
        throw error; // Re-throw to be caught by calling function
    }
};
// --- END NEW FUNCTION ---


// Optional default export combining all functions
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
  generateInterrogatoryResponses // <-- Added new function here
};

export default api;