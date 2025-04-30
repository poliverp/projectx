// src/pages/CasePage/hooks/useDocumentGeneration.js
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';

export function useDocumentGeneration(caseId) {
  const [docTypes, setDocTypes] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Fetch document types
  useEffect(() => {
    api.getDocumentTypes()
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          setDocTypes(response.data);
          if (response.data.length > 0 && !selectedDocType) {
            setSelectedDocType(response.data[0]);
          }
        } else { 
          setDocTypes([]);
        }
      })
      .catch(err => {
        console.error("Error fetching document types:", err);
        setError("Could not load document types list.");
      });
  }, [selectedDocType]);
  
  // Generate document
  const generateDocument = useCallback(async () => {
    if (!selectedDocType || isGenerating) return;
    
    setIsGenerating(true);
    setGenerationResult('');
    setError(null);
    
    const generationData = {
      document_type: selectedDocType,
      custom_instructions: customInstructions
    };
    
    try {
      const response = await api.generateDocument(caseId, generationData);
      if (response.data && response.data.generated_content) {
        setGenerationResult(response.data.generated_content);
        message.success("Document generated successfully");
      } else {
        setError("Received unexpected response from server.");
        message.warning("Unexpected response from server");
      }
    } catch (err) {
      console.error("Failed to generate document:", err);
      setError(`Generation failed: ${err.response?.data?.error || err.message}`);
      message.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  }, [caseId, selectedDocType, customInstructions, isGenerating]);
  
  // Copy text
  const copyGeneratedText = useCallback(() => {
    if (!generationResult) return;
    
    navigator.clipboard.writeText(generationResult)
      .then(() => {
        setCopied(true);
        message.info("Text copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setError("Failed to copy text to clipboard.");
        message.error("Failed to copy text");
      });
  }, [generationResult]);
  
  // Dismiss text
  const dismissGeneratedText = useCallback(() => {
    setGenerationResult('');
    setError(null);
    setCopied(false);
  }, []);
  
  return {
    docTypes,
    selectedDocType,
    setSelectedDocType,
    customInstructions,
    setCustomInstructions,
    isGenerating,
    generationResult,
    error,
    copied,
    generateDocument,
    copyGeneratedText,
    dismissGeneratedText
  };
}