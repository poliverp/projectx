import axios from 'axios';

// !!! --- SECURITY WARNING --- !!!
// DO NOT embed real secret API keys in frontend code.
// This key should ideally be used ONLY by your backend server.
// This is included here ONLY because you specifically requested it as an example.
// Assume this key is for authenticating requests *to your own backend*,
// and your backend then uses its *own* secure keys for 3rd party services.
const YOUR_BACKEND_API_KEY = 'AIzaSyDeW2v8jkWWTdoooWEwmZJLTm-WTjAq8PQ'; // Example Key

// Configure this to point to where your backend server will run
const API_BASE_URL = 'http://localhost:5000/api'; // Example: Flask often runs on 5000 or 5001

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Example of sending the key as a header (adapt based on your backend needs)
    // Common headers are 'Authorization': `Bearer ${YOUR_BACKEND_API_KEY}`
    // or a custom header like 'X-API-Key': YOUR_BACKEND_API_KEY
    'X-API-Key': YOUR_BACKEND_API_KEY, // Adjust header name as needed by your backend
  },
});

// --- Case Management ---
export const getCases = () => apiClient.get('/cases');
export const getCase = (caseId) => apiClient.get(`/cases/${caseId}`);
export const createCase = (caseData) => apiClient.post('/cases', caseData);
export const updateCase = (caseId, caseData) => apiClient.put(`/cases/${caseId}`, caseData);
export const deleteCase = (caseId) => apiClient.delete(`/cases/${caseId}`);

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
        // Also include API key for this endpoint if required by backend
        'X-API-Key': YOUR_BACKEND_API_KEY, // Adjust as needed
      },
    });
    return response;
  } catch (error) {
    console.error("Upload error details:", error.response || error.message);
    throw error; // Re-throw to be caught by calling function
  }
};

export const deleteDocument = (documentId) => apiClient.delete(`/documents/${documentId}`);

// --- Analysis & Creation (Define based on your actual backend endpoints) ---
export const analyzeDocument = (documentId) => {
    console.warn("analyzeDocument function called - implement backend endpoint");
    // Example: return apiClient.post(`/documents/${documentId}/analyze`);
    return Promise.resolve({ data: { message: "Analysis feature not implemented yet." } }); // Placeholder
}

export const createNewDocument = (caseId, creationData) => {
    console.warn("createNewDocument function called - implement backend endpoint");
    // Example: return apiClient.post(`/cases/${caseId}/create-document`, creationData);
    return Promise.resolve({ data: { message: "Document creation feature not implemented yet." } }); // Placeholder
}

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
  createNewDocument,
};

export default api;