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
  // IMPORTANT: For session-based auth (Flask-Login), we need the browser
  // to handle cookies correctly. Axios needs 'withCredentials' set.
  withCredentials: true, // <-- Add this for cookie handling
  headers: {
    'Content-Type': 'application/json',
    // We will likely remove specific API key headers here later
    // if using session cookies for auth.
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
    // Use axios directly for multipart/form-data to ensure correct headers
    const response = await axios.post(`${API_BASE_URL}/cases/${caseId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true, // <-- Also add here if uploads need authentication later
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
  // The apiClient already has the base URL configured
  return apiClient.post(`/documents/${documentId}/analyze`);
};

// Function for AI text generation (if different from docx generation)
export const generateDocument = (caseId, generationData) => {
  // generationData should be like { document_type: "...", custom_instructions: "..." }
  return apiClient.post(`/cases/${caseId}/generate_document`, generationData);
};

// Function for downloading generated Word documents
export const downloadWordDocument = async (caseId, data) => {
  // data might include { template_name: '...' }
  try {
    console.log(`API: Requesting Word download for case ${caseId}`);
    const response = await apiClient.post(
      `/cases/${caseId}/download_word_document`,
      data,
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

// --- Discovery Response Generation ---
export const generateInterrogatoryResponses = async (caseId, file) => {
    const formData = new FormData();
    formData.append('file', file); // Key 'file' must match backend request.files['file']

    // Using axios directly for clarity with multipart/form-data:
    try {
        // The path assumes '/api' is in API_BASE_URL and '/discovery' is the blueprint prefix
        const response = await axios.post(`${API_BASE_URL}/discovery/cases/${caseId}/interrogatory-responses`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
             withCredentials: true, // <-- Also add here if this needs authentication later
        });
        return response; // Return the full response object
    } catch (error) {
        console.error("Generate Interrogatory Responses error details:", error.response || error.message);
        throw error; // Re-throw to be caught by calling function
    }
};

// --- NEW: Authentication Functions ---
export const register = (userData) => {
  // userData expects { username: '...', password: '...', email: '...' (optional) }
  // Path matches blueprint registration: /api/auth/register
  return apiClient.post('/auth/register', userData);
};

// Add login, logout, status functions here later...
export const login = (credentials) => {
    // credentials expects { username: '...', password: '...', remember: boolean }
    return apiClient.post('/auth/login', credentials);
};

export const logout = () => {
    // Doesn't need payload, relies on session cookie
    return apiClient.post('/auth/logout');
};

export const getAuthStatus = () => {
    // Checks session cookie to see if user is logged in
    return apiClient.get('/auth/status');
};
// --- END Authentication Functions ---


// Default export combining all functions
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
  generateInterrogatoryResponses,
  // --- Add Auth functions to default export ---
  register,
  login,
  logout,
  getAuthStatus
  // --- End Auth functions ---
};

export default api;