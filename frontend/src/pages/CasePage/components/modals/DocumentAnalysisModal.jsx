// Updated DocumentAnalysisModal.jsx
import React, { useEffect, useState } from 'react';
import { Select, Button, Space, Alert, Spin, Typography, Result } from 'antd';
import { ExperimentOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDocumentAnalysis } from "../../hooks/useDocumentAnalysis";
const { Text, Paragraph } = Typography;
const { Option } = Select;

function DocumentAnalysisModal({ caseId, onComplete, switchToSuggestionsTab }) {
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  
  const {
    documents,
    loadingDocs,
    analyzing,
    error,
    selectedDocId,
    setSelectedDocId,
    fetchDocuments,
    analyzeDocument
  } = useDocumentAnalysis(caseId);
  
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  
  const handleAnalyze = async () => {
    const success = await analyzeDocument();
    if (success) {
      setAnalysisCompleted(true);
    }
  };
  
  const handleGoToSuggestions = () => {
    if (switchToSuggestionsTab) {
      switchToSuggestionsTab();
    }
    if (onComplete) {
      onComplete();
    }
  };
  
  // Show success state if analysis is completed
  if (analysisCompleted) {
    return (
      <Result
        status="success"
        title="Analysis Complete!"
        subTitle="The document has been successfully analyzed and suggestions are ready to review."
        extra={[
          <Button 
            type="primary" 
            key="suggestions" 
            onClick={handleGoToSuggestions}
            icon={<CheckCircleOutlined />}
          >
            Go to Pending Suggestions
          </Button>
        ]}
      />
    );
  }
  
  return (
    <Spin spinning={loadingDocs} tip="Loading documents...">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
        />
      )}
        
        <Paragraph>Select a document associated with this case to perform analysis. The AI will extract key case details.</Paragraph>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Select a document..."
            value={selectedDocId || undefined}
            onChange={setSelectedDocId}
            loading={loadingDocs}
            disabled={loadingDocs || analyzing || documents.length === 0}
            notFoundContent={loadingDocs ? <Spin size="small" /> : "No documents found"}
          >
            {documents.map(doc => (
              <Option key={doc.id} value={doc.id}>
                <Space>
                  <FileTextOutlined />
                  {doc.file_name || `Document ID: ${doc.id}`}
                </Space>
              </Option>
            ))}
          </Select>
          
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={handleAnalyze}
            disabled={!selectedDocId || loadingDocs || analyzing}
            loading={analyzing}
            block
          >
            {analyzing ? 'Analyzing...' : 'Analyze Selected Document'}
          </Button>
        </Space>
        
        {analyzing && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="large" tip="Analyzing document..." />
            <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
              This may take a moment as the AI extracts case information.
            </Text>
          </div>
        )}
        
        {!analyzing && !loadingDocs && documents.length > 0 && (
          <Text type="secondary">
            <i>Select a document and click "Analyze Selected Document". Results will appear in the Suggestions tab.</i>
          </Text>
        )}
      </Space>
    </Spin>
  );
}

export default DocumentAnalysisModal;