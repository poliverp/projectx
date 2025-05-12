import React, { useState } from 'react';
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

const DiscoveryTab = ({ caseId, userId }) => {
  const [discoveryType, setDiscoveryType] = useState(DISCOVERY_TYPES[0].value);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Handle discovery type change
  const handleTypeChange = (value) => {
    setDiscoveryType(value);
  };

  // Custom upload request handler to match working pattern
  const customUploadRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Create FormData - IMPORTANT: Use 'document' as the field name to match backend
    const formData = new FormData();
    formData.append('document', file);
    formData.append('discovery_type', discoveryType);
    
    try {
      console.log(`Processing ${discoveryType} document: ${file.name}`);
      
      // Use fetch API instead of axios
      const response = await fetch(`/api/discovery/cases/${caseId}/respond`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
      message.success('Document parsed successfully');
      onSuccess();
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message || 'An unexpected error occurred');
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
      // Update fileList
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
    <div className="discovery-container">
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
                          {q.subparts && q.subparts.length > 0 && (
                            <>
                              <Divider style={{ margin: '8px 0' }} />
                              <Text strong>Subparts:</Text>
                              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                                {q.subparts.map((subpart, i) => (
                                  <li key={i}>{subpart}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Text>No questions parsed from the document.</Text>
                  )}
                </Panel>
                
                <Panel header="AI Prompt" key="2">
                  <div style={{ 
                    maxHeight: 300, 
                    overflow: 'auto',
                    padding: 16,
                    background: '#f9f9f9',
                    borderRadius: 4
                  }}>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {result.prompt || 'No prompt generated'}
                    </pre>
                  </div>
                </Panel>
                {result.ai_response && (
                  <Panel header="AI Draft Responses" key="ai">
                    <div style={{
                      maxHeight: 300,
                      overflow: 'auto',
                      padding: 16,
                      background: '#f6ffed',
                      borderRadius: 4
                    }}>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                        {typeof result.ai_response === 'string'
                          ? result.ai_response
                          : JSON.stringify(result.ai_response, null, 2)}
                      </pre>
                    </div>
                  </Panel>
                )}
              </Collapse>
              
              <Divider />
              
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Next Steps:</Text>
                <Paragraph>
                  Review the extracted content and prepare responses. You can now:
                </Paragraph>
                <Button 
                  type="primary" 
                  icon={<FileTextOutlined />}
                  disabled={!result.questions || result.questions.length === 0}
                >
                  Generate Response Document
                </Button>
              </Space>
            </Card>
          )}
          {result && result.ai_error && (
            <Alert
              message="AI Generation Error"
              description={result.ai_error}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Space>
      </Spin>
    </div>
  );
};

export default DiscoveryTab;