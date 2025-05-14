import axios from 'axios';

// !!! --- SECURITY WARNING --- !!!
// DO NOT embed real secret API keys in frontend code.
// This key should ideally be used ONLY by your backend server.
// This is here ONLY because you specifically requested it as an example.
// Assume this key is for authenticating requests *to your own backend*,
// and your backend then uses its *own* secure keys for 3rd party services.
// Configure this to point to where your backend server will run
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || '/api';

console.log("API_BASE_URL:", API_BASE_URL);

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
  timeout: 30000, // 30 second timeout
});
export const getPendingUsers = () => {
  return apiClient.get('/auth/admin/pending-users');
};

export const approveUser = (userId) => {
  return apiClient.post(`/auth/admin/approve/${userId}`);
};

export const getUserByUsername = (username) => {
  return apiClient.get(`/auth/users/${username}`);
};
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
    const response = await axios.post(`/api/cases/${caseId}/documents`, formData, {
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
// Step 1: Parse discovery document and get questions
export const parseDiscoveryDocument = async (caseId, formData) => {
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
        try {
            console.log(`API: Parsing discovery document for case ${caseId}`);
            const response = await axios.post(
                `${API_BASE_URL}/discovery/cases/${caseId}/parse`, 
                formData, 
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    withCredentials: true,
                    timeout: 120000, // 2 minute timeout
                }
            );
            return response.data;
        } catch (error) {
            console.error("Discovery parse error:", error.response || error.message);
            
            // Handle timeout
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timed out after 2 minutes. The document might be too large or complex. Please try again or contact support.');
            }

            // Handle database connection errors
            if (error.response?.data?.error?.includes('SSL connection has been closed') ||
                error.response?.data?.error?.includes('database connection')) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retrying request (${retryCount}/${maxRetries}) due to database connection error...`);
                    // Wait for 1 second before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                throw new Error('Database connection error. Please try again in a few moments.');
            }

            // Handle other errors
            if (error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            
            throw error;
        }
    }
};

// Step 2: Generate document with selections
export const generateDiscoveryDocument = async (caseId, data) => {
    try {
        console.log(`API: Generating discovery document for case ${caseId}`);
        const response = await axios.post(
            `${API_BASE_URL}/discovery/cases/${caseId}/generate-document`,
            data,
            {
                responseType: 'blob', // Tell axios to expect binary file data
                withCredentials: true,
                timeout: 60000, // 1 minute timeout
            }
        );
        
        // Handle the file download using Blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        let filename = `RFP_Responses_Case_${caseId}.docx`; // Default
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

        console.log("API: Discovery document download successfully initiated.");
        return { success: true };
        
    } catch (error) {
        console.error("Document generation error:", error.response || error.message);
        
        // Special handling for error responses that might be JSON
        if (error.response?.data instanceof Blob && error.response.data.type === "application/json") {
            try {
                const errorJson = JSON.parse(await error.response.data.text());
                throw new Error(errorJson.error || 'Failed to generate discovery document');
            } catch (parseError) {
                console.error("Failed to parse error blob:", parseError);
                throw new Error('Failed to generate discovery document and could not parse error details.');
            }
        }

        // Handle other errors
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        
        throw error;
    }
};

// Keep the original respondToDiscovery for compatibility, modified to use new two-step process
export const respondToDiscovery = async (caseId, formData) => {
  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
      try {
          console.log(`API: Requesting discovery response for case ${caseId}`);
          const response = await axios.post(`${API_BASE_URL}/discovery/cases/${caseId}/respond`, formData, {
              headers: {
                  'Content-Type': 'multipart/form-data',
              },
              withCredentials: true,
              timeout: 120000, // 2 minute timeout
              responseType: 'blob', // Tell axios to expect binary file data
          });
          
          // --- Handle the file download using Blob ---
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;

          let filename = `RFP_Responses_Case_${caseId}.docx`; // Default
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

          console.log("API: Discovery document download successfully initiated.");
          return { success: true };
          
      } catch (error) {
          console.error("Discovery response error:", error.response || error.message);
          
          // Handle timeout
          if (error.code === 'ECONNABORTED') {
              throw new Error('Request timed out after 2 minutes. The document might be too large or complex. Please try again or contact support.');
          }

          // Handle database connection errors
          if (error.response?.data?.error?.includes('SSL connection has been closed') ||
              error.response?.data?.error?.includes('database connection')) {
              if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`Retrying request (${retryCount}/${maxRetries}) due to database connection error...`);
                  // Wait for 1 second before retrying
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  continue;
              }
              throw new Error('Database connection error. Please try again in a few moments.');
          }

          // Special handling for error responses that might be JSON
          if (error.response?.data instanceof Blob && error.response.data.type === "application/json") {
              try {
                  const errorJson = JSON.parse(await error.response.data.text());
                  throw new Error(errorJson.error || 'Failed to process discovery document');
              } catch (parseError) {
                  console.error("Failed to parse error blob:", parseError);
                  throw new Error('Failed to process discovery document and could not parse error details.');
              }
          }

          // Handle other errors
          if (error.response?.data?.error) {
              throw new Error(error.response.data.error);
          }
          
          throw error;
      }
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

// Get interrogatory questions
export const getInterrogatoryQuestions = (language = 'english') => {
  return apiClient.get(`/discovery/interrogatory-questions?language=${language}`);
};

// Generate interrogatory document
export const generateInterrogatoryDocument = (caseId, selectedIds, language) => {
  return apiClient.post(`/discovery/generate-interrogatory-document`, {
    case_id: caseId,
    selected_ids: selectedIds,
    language
  }, {
    responseType: 'blob'
  });
};
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
  respondToDiscovery,
  parseDiscoveryDocument,
  generateDiscoveryDocument,
  register,
  login,
  logout,
  getAuthStatus,
  getPendingUsers,
  approveUser,
  getUserByUsername,
  getInterrogatoryQuestions,
  generateInterrogatoryDocument,
};

export default api;