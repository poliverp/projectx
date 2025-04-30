// src/pages/CasePage/components/modals/DocumentAnalysisModal.jsx
import React, { useEffect } from 'react';
import { Select, Button, Space, Alert, Spin, Typography } from 'antd';
import { ExperimentOutlined, FileTextOutlined } from '@ant-design/icons';
import { useDocumentAnalysis } from "../../hooks/useDocumentAnalysis.js";
const { Text, Paragraph } = Typography;
const { Option } = Select;

function DocumentAnalysisModal({ caseId, onComplete }) {
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
      // Add a small delay before closing to show the success message
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1500); // 1.5 seconds to read the success message
    }
  };
  
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
            onClose={() => setError(null)}
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