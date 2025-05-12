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
  const [result, setResult] = useState(null);

  // Handle discovery type change
  const handleTypeChange = (value) => {
    setDiscoveryType(value);
  };

  // Custom upload request handler
  const customUploadRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('discovery_type', discoveryType);
    
    try {
      console.log(`Processing ${discoveryType} document: ${file.name}`);
      
      const response = await api.respondToDiscovery(caseId, formData);
      setResult(response.data);
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

  // Reset function
  const handleReset = () => {
    setFileList([]);
    setError(null);
    setResult(null);
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
      setResult(null);
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
            
            {!result && (
              <Dragger {...uploadProps} disabled={loading}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag PDF file to this area to upload</p>
                <p className="ant-upload-hint">
                  Upload the discovery document to generate AI-assisted responses
                </p>
              </Dragger>
            )}
            
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
          
          {result && (
            <Card 
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>Document Parsed Successfully</span>
                </Space>
              } 
              bordered={false}
              extra={
                <Button onClick={handleReset}>Process Another Document</Button>
              }
            >
              <Collapse defaultActiveKey={['1']}>
                <Panel 
                  header={`Parsed Questions (${result.questions?.length || 0})`}
                  key="1"
                >
                  {result.questions && result.questions.length > 0 ? (
                    <div style={{ maxHeight: 300, overflow: 'auto' }}>
                      {result.questions.map((q, index) => (
                        <Card 
                          key={index} 
                          size="small" 
                          title={`${DISCOVERY_TYPES.find(t => t.value === discoveryType)?.label} ${q.number}`}
                          style={{ marginBottom: 8 }}
                        >
                          <Text>{q.text}</Text>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">No questions found in the document.</Text>
                  )}
                </Panel>
                
                {result.ai_response && (
                  <Panel 
                    header="AI-Generated Responses" 
                    key="2"
                  >
                    <div style={{ maxHeight: 300, overflow: 'auto' }}>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {result.ai_response}
                      </pre>
                    </div>
                  </Panel>
                )}
                
                {result.ai_error && (
                  <Panel 
                    header="AI Generation Error" 
                    key="3"
                  >
                    <Alert
                      message="Error Generating Responses"
                      description={result.ai_error}
                      type="error"
                      showIcon
                    />
                  </Panel>
                )}
              </Collapse>
            </Card>
          )}
        </Space>
      </Spin>
    </div>
  );
}

export default CreateDiscoveryPage;