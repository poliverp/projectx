// frontend/src/pages/CreateDiscoveryPage2.jsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, 
  Typography, 
  Select, 
  Button, 
  Upload, 
  Spin, 
  Alert, 
  Collapse, 
  Space, 
  Divider,
  message
} from 'antd';
import { 
  InboxOutlined, 
  CheckCircleOutlined,
  FileTextOutlined 
} from '@ant-design/icons';
import api from '../services/api';
import DiscoverySelectionStep from '../components/DiscoverySelectionStep';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { Panel } = Collapse;

// Discovery types configuration
const DISCOVERY_TYPES = [
  { value: 'form_interrogatories', label: 'Form Interrogatories', description: 'Standard questions about basic case information, witnesses, and evidence.' },
  { value: 'special_interrogatories', label: 'Special Interrogatories', description: 'Custom questions specific to your case and legal issues.' },
  { value: 'requests_for_production', label: 'Requests for Production', description: 'Requests for documents and physical evidence.' },
  { value: 'requests_for_admission', label: 'Requests for Admission', description: 'Statements that the opposing party must admit or deny.' },
];

function CreateDiscoveryPage() {
  const { caseId } = useParams();
  const [discoveryType, setDiscoveryType] = useState(DISCOVERY_TYPES[0].value);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [currentFormData, setCurrentFormData] = useState(null);
  const [showSelectionStep, setShowSelectionStep] = useState(false);

  // Handle discovery type change
  const handleTypeChange = (value) => {
    setDiscoveryType(value);
  };

  // Custom upload request handler - MODIFIED for 2-step process
  const customUploadRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    setError(null);
    setParseResult(null);
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('discovery_type', discoveryType);
    
    try {
      console.log(`Processing ${discoveryType} document: ${file.name}`);
      
      // Step 1: Parse the document to get questions
      const response = await api.parseDiscoveryDocument(caseId, formData);
      setParseResult(response);
      setCurrentFormData(formData);
      setShowSelectionStep(true);
      message.success('Document parsed successfully');
      onSuccess();
    } catch (err) {
      console.error('Error details:', err);
      let errorMessage = 'An unexpected error occurred';
      
      if (err.message.includes('timed out')) {
        errorMessage = 'The request took too long to process. This might be because:\n' +
          '1. The document is very large\n' +
          '2. The AI service is currently busy\n' +
          'Please try again in a few minutes or contact support if the issue persists.';
      } else if (err.message.includes('Database connection error')) {
        errorMessage = 'We encountered a temporary database connection issue. The system will automatically retry the request.';
        // Don't show error message for database connection errors as they will be retried
        return;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      message.error('Failed to process document');
      onError();
    } finally {
      setLoading(false);
    }
  };

  // Handle selection submission
  const handleSelectionSubmit = async (data) => {
    try {
      await api.generateDiscoveryDocument(caseId, data);
      // Return to upload step after successful download
      handleReset();
    } catch (err) {
      // Error handling is done in the DiscoverySelectionStep component
      throw err;
    }
  };

  // Reset function
  const handleReset = () => {
    setFileList([]);
    setError(null);
    setParseResult(null);
    setShowSelectionStep(false);
    setCurrentFormData(null);
  };

  // Go back from selection step to upload step
  const handleBack = () => {
    setShowSelectionStep(false);
  };

  // Configure upload component
  const uploadProps = {
    name: 'document',
    multiple: false,
    fileList,
    customRequest: customUploadRequest,
    onChange(info) {
      let newFileList = [...info.fileList];
      newFileList = newFileList.slice(-1); // Keep only the latest file
      setFileList(newFileList);
    },
    onRemove: () => {
      setFileList([]);
      setParseResult(null);
    },
    accept: ".pdf",
    showUploadList: {
      showDownloadIcon: false,
      showRemoveIcon: true,
    },
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error('You can only upload PDF files!');
      }
      return isPDF;
    }
  };

  // Render the selection step if active
  if (showSelectionStep && parseResult) {
    return (
      <DiscoverySelectionStep
        questions={parseResult.questions || []}
        sessionKey={parseResult.session_key}
        discoveryType={parseResult.discovery_type}
        onBack={handleBack}
        onSubmit={handleSelectionSubmit}
        caseId={caseId}
      />
    );
  }

  // Otherwise render the upload step
  return (
    <div className="discovery-container" style={{ padding: '24px' }}>
      <Spin spinning={loading} tip="Analyzing document with AI...">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title="Discovery Response Generator" bordered={false}>
            <Paragraph>
              Upload a discovery document (PDF) to automatically generate response drafts using AI.
            </Paragraph>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Document Type:</Text>
              <Select
                value={discoveryType}
                onChange={handleTypeChange}
                style={{ width: '100%', marginTop: 8 }}
                disabled={loading || fileList.length > 0}
              >
                {DISCOVERY_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                {DISCOVERY_TYPES.find(t => t.value === discoveryType)?.description}
              </Paragraph>
            </div>
            
            <Dragger {...uploadProps} disabled={loading}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag PDF file to this area to upload</p>
              <p className="ant-upload-hint">
                Upload the discovery document to generate AI-assisted responses
              </p>
            </Dragger>
            
            {error && (
              <Alert
                message="Error Processing Document"
                description={error}
                type="error"
                showIcon
                closable
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </Space>
      </Spin>
    </div>
  );
}

export default CreateDiscoveryPage;