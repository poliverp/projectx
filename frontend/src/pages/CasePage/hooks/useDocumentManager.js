// --- START SCRIPT: src/pages/CasePage/hooks/useDocumentManager.js ---
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api'; // Adjust path relative to src/pages/CasePage/hooks/

export function useDocumentManager(caseId) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false); // For initial load & delete actions
    const [error, setError] = useState(null);

    // Function to fetch documents
    const fetchDocuments = useCallback(async (showLoading = true) => {
        if (!caseId) return;
        if (showLoading) setLoading(true);
        setError(null);
        console.log(`useDocumentManager: Fetching documents for case ${caseId}`);
        try {
            const response = await api.getDocumentsForCase(caseId);
            setDocuments(response.data || []);
        } catch (err) {
            console.error(`useDocumentManager: Error fetching documents for case ${caseId}:`, err);
            const errorMsg = `Failed to load documents: ${err.response?.data?.error || err.message}`;
            setError(errorMsg);
            setDocuments([]);
            message.error(errorMsg, 5);
        } finally {
             if (showLoading) setLoading(false);
        }
    }, [caseId]);

    // Load documents on mount or when caseId changes
    useEffect(() => {
        if (caseId) { // Ensure caseId is present before fetching
             fetchDocuments(true);
        }
        // Clear documents if caseId becomes null/undefined (e.g., navigating away indirectly)
        else {
             setDocuments([]);
        }
    }, [caseId, fetchDocuments]); // Re-run if caseId or fetchDocuments changes

    // Function to handle upload (for AntD customRequest)
    const uploadDocument = useCallback(async (options) => {
        const { file, onSuccess, onError } = options;
        if (!caseId) {
            const err = new Error("Case ID is missing for upload.");
            onError(err);
            message.error("Cannot upload file: Case ID missing.", 5);
            return;
        }
        console.log(`useDocumentManager: Attempting upload for ${file.name} to case ${caseId}`);
        setError(null);
        const uploadOptions = { analyze: false }; // Future: Maybe make this configurable via prop?

        try {
            const response = await api.uploadDocument(caseId, file, uploadOptions);
            onSuccess(response.data, file);
            console.log(`useDocumentManager: Successfully uploaded ${file.name}`);
            message.success(`${file.name} uploaded successfully!`);
            fetchDocuments(false); // Refresh list silently after upload
        } catch (err) {
            console.error(`useDocumentManager: Error uploading file ${file.name}:`, err);
            const errorMsg = `Upload failed for ${file.name}: ${err.response?.data?.error || err.message}`;
            setError(prev => `${prev ? prev + '; ' : ''}${errorMsg}`); // Append to error state
            onError(err);
            message.error(errorMsg, 5);
        }
    }, [caseId, fetchDocuments]);

    // Function to handle deletion
    const deleteDocument = useCallback(async (docId, docName) => {
        if (!caseId) {
             message.error("Cannot delete file: Case ID missing.", 5);
            return;
        }
        const key = `deleting-${docId}`;
        message.loading({ content: `Deleting ${docName}...`, key });
        setLoading(true); // Show main loading indicator
        setError(null);
        console.log(`useDocumentManager: Attempting delete for doc ${docId} in case ${caseId}`);
        try {
            await api.deleteDocument(docId);
            message.success({ content: `${docName} deleted successfully!`, key, duration: 2 });
            fetchDocuments(false); // Refresh list silently after delete
        } catch (err) {
            console.error(`useDocumentManager: Error deleting document ${docId}:`, err);
            const errorMsg = `Failed to delete ${docName}: ${err.response?.data?.error || err.message}`;
            setError(errorMsg);
            message.error({ content: errorMsg, key, duration: 4 });
        } finally {
            setLoading(false);
        }
    }, [caseId, fetchDocuments]);

    // Return state and actions
    return {
        documents,
        loading,
        error,
        uploadDocument, // Pass this directly to Upload's customRequest
        deleteDocument,
        refreshDocuments: () => fetchDocuments(false) // Expose a manual refresh function
    };
}
// --- END SCRIPT: src/pages/CasePage/hooks/useDocumentManager.js ---