// src/pages/CasePage/hooks/useDocumentAnalysis.js
import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';

export function useDocumentAnalysis(caseId) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchDocuments = useCallback(async () => {
    if (!caseId) return;
    
    setLoadingDocs(true);
    setError(null);
    try {
      const response = await api.getDocumentsForCase(caseId);
      setDocuments(response.data || []);
      if (!response.data || response.data.length === 0) {
        message.info("No documents found for this case to analyze.");
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError(`Failed to load documents: ${err.response?.data?.error || err.message}`);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [caseId]);
  
  const analyzeDocument = useCallback(async () => {
    if (!selectedDocId) {
      message.warning("Please select a document to analyze.");
      return;
    }
    
    setAnalyzing(true);
    setError(null);
    try {
      await api.analyzeDocument(selectedDocId);
      message.success("Analysis complete! Check the Suggestions tab.");
      return true; // Success indicator
    } catch (err) {
      console.error("Error analyzing document:", err);
      setError(`Analysis failed: ${err.response?.data?.error || err.message}`);
      message.error("Analysis failed.");
      return false; // Failure indicator
    } finally {
      setAnalyzing(false);
    }
  }, [selectedDocId]);
  
  return {
    documents,
    loadingDocs,
    analyzing,
    error,
    selectedDocId,
    setSelectedDocId,
    fetchDocuments,
    analyzeDocument
  };
}