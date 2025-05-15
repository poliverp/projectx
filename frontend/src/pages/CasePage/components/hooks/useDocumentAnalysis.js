// src/pages/CasePage/hooks/useDocumentAnalysis.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import api from '../../../services/api';

export function useDocumentAnalysis(caseId) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [lastAnalyzedDoc, setLastAnalyzedDoc] = useState(null);
  
  // Use ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Cache timer for document refreshing
  const cacheTimerRef = useRef(null);
  
  // Reset mounted state on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current);
      }
    };
  }, []);
  
  // Clear error helper function that can be passed to components
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const fetchDocuments = useCallback(async (forceRefresh = false) => {
    if (!caseId) return;
    
    // If we already have documents and aren't forcing refresh, use cache
    if (!forceRefresh && documents.length > 0) {
      // Set up cache expiration
      if (!cacheTimerRef.current) {
        cacheTimerRef.current = setTimeout(() => {
          cacheTimerRef.current = null;
          // Only refetch if component is still mounted
          if (isMounted.current) {
            fetchDocuments(true);
          }
        }, 60000); // 1 minute cache
      }
      return;
    }
    
    setLoadingDocs(true);
    setError(null);
    
    try {
      const response = await api.getDocumentsForCase(caseId);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setDocuments(response.data || []);
        if (!response.data || response.data.length === 0) {
          message.info("No documents found for this case to analyze.");
        }
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setError(`Failed to load documents: ${err.response?.data?.error || err.message}`);
        setDocuments([]);
      }
    } finally {
      // Only update state if component is still mounted
      if (isMounted.current) {
        setLoadingDocs(false);
      }
    }
  }, [caseId, documents.length]);
  
  // Memoize the selected document to avoid unnecessary re-renders
  const selectedDocument = useCallback(() => {
    return documents.find(doc => doc.id === selectedDocId);
  }, [documents, selectedDocId]);
  
  // Analyze document with improved error handling and selection safety
  const analyzeDocument = useCallback(async () => {
    if (!selectedDocId) {
      message.warning("Please select a document to analyze.");
      return false;
    }
    
    // Store the document ID in a closure to ensure we're using the right one
    // even if selectedDocId changes during the async operation
    const docIdToAnalyze = selectedDocId;
    const docToAnalyze = documents.find(d => d.id === docIdToAnalyze);
    
    if (!docToAnalyze) {
      message.error("Selected document no longer exists. Please refresh and try again.");
      return false;
    }
    
    setAnalyzing(true);
    setError(null);
    
    try {
      await api.analyzeDocument(docIdToAnalyze);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        message.success(`Analysis complete for "${docToAnalyze.file_name}"! Check the Suggestions tab.`);
        setLastAnalyzedDoc(docToAnalyze);
        return true; // Success indicator
      }
      return false;
    } catch (err) {
      console.error("Error analyzing document:", err);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setError(`Analysis failed: ${err.response?.data?.error || err.message}`);
        message.error("Analysis failed. Please try again or contact support.");
        return false; // Failure indicator
      }
      return false;
    } finally {
      // Only update state if component is still mounted
      if (isMounted.current) {
        setAnalyzing(false);
      }
    }
  }, [selectedDocId, documents]);
  
  return {
    documents,
    loadingDocs,
    analyzing,
    error,
    clearError,
    selectedDocId,
    setSelectedDocId,
    selectedDocument: selectedDocument(),
    lastAnalyzedDoc,
    fetchDocuments,
    analyzeDocument
  };
}