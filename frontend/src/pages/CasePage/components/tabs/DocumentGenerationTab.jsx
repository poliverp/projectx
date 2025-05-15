// Revised DocumentGenerationTab.jsx to match your existing implementation
import React, { useState, useEffect } from 'react';
import { 
  Card, Tabs, Form, Select, Input, Button, Space, Alert, Spin, 
  Typography, 
} from 'antd';
import { 
  RobotOutlined, FileWordOutlined, DownloadOutlined, 
  CopyOutlined, CloseOutlined 
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../../services/api';
import { message } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function DocumentGenerationTab({ caseId }) {
  // State for AI document generation
  const [docType, setDocType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [availableDocTypes, setAvailableDocTypes] = useState([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);

  // State for Word Template Download
  const [availableTemplates, setAvailableTemplates] = useState([
    'jury_fees_template.docx',
    'demand_letter_template.docx',
    'case_summary_template.docx',
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Combined State
  const [error, setError] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [activeTab, setActiveTab] = useState("simple");
  const [copied, setCopied] = useState(false);

  // Fetch available AI document types
  useEffect(() => {
    const fetchDocTypes = async () => {
      setLoadingDocTypes(true);
      try {
        const types = await api.getDocumentTypes();
        setAvailableDocTypes(types.data || []);
      } catch (err) {
        console.error("Failed to fetch document types:", err);
        setError("Failed to load AI document types.");
      } finally {
        setLoadingDocTypes(false);
      }
    };
    fetchDocTypes();
  }, []);

  // Handler for AI Generation
  const handleCreate = async () => {
    if (!docType) {
      message.warning("Please select an AI document type to generate.");
      return;
    }
    setLoadingAI(true);
    setError(null);
    setGeneratedContent(null);
    try {
      const creationData = {
        document_type: docType,
        custom_instructions: customInstructions
      };
      const response = await api.generateDocument(caseId, creationData);
      if (response.data && response.data.generated_content !== undefined) {
        setGeneratedContent(response.data.generated_content);
        message.success("AI content generated!");
      } else {
        setError("Unexpected response format from AI generation.");
        console.error("Unexpected backend response:", response.data);
        message.error("AI generation failed (unexpected response).");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message;
      setError(`AI Document generation failed: ${errorMessage}`);
      console.error("Generation API error:", err.response || err.message);
      message.error(`AI generation failed: ${errorMessage}`);
    } finally {
      setLoadingAI(false);
    }
  };

  // Handler for Word Doc Download
  const handleDownloadWord = async () => {
    if (!selectedTemplate) {
      message.warning("Please select a Word template to download.");
      return;
    }
    
    setLoadingDownload(true);
    setError(null);
    
    try {
      // Make sure to pass the correct parameters as expected by your API
      const templateInfo = { template_name: selectedTemplate };
      
      // This approach creates a direct download through the browser
      const response = await api.downloadWordDocument(caseId, templateInfo);
      
      // Check if the response contains a blob or URL
      if (response.data) {
        // If it's a blob response
        if (response.data instanceof Blob) {
          const url = window.URL.createObjectURL(response.data);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', selectedTemplate);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          message.success("Document downloaded successfully!");
        } 
        // If it's a URL response
        else if (response.data.fileUrl || response.data.url) {
          const downloadUrl = response.data.fileUrl || response.data.url;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', selectedTemplate);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("Document downloaded successfully!");
        } else {
          console.error("Unexpected response format:", response.data);
          message.warning("Received response but couldn't initiate download");
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      setError(`Failed to download Word document: ${errorMessage}`);
      console.error("Word Download API error:", err);
      message.error(`Download failed: ${errorMessage}`);
    } finally {
      setLoadingDownload(false);
    }
  };

  // Helper function to format template names for display
  const formatTemplateName = (filename) => {
    if (!filename) return '';
    return filename
      .replace(/\.docx$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  // Copy text handler
  const copyGeneratedText = () => {
    if (!generatedContent) return;
    
    navigator.clipboard.writeText(generatedContent)
      .then(() => {
        setCopied(true);
        message.info("Text copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        message.error("Failed to copy text");
      });
  };

  // Dismiss text handler
  const dismissGeneratedText = () => {
    setGeneratedContent(null);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="Generate Legal Document" type="inner">
        {/* Display Error */}
        {error && (
          <Alert
            message="Operation Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane 
            tab={<span><RobotOutlined /> Simple Prompt Generation</span>} 
            key="simple"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Space wrap>
                <Text>AI Document Type:</Text>
                <Select
                  value={docType}
                  onChange={(value) => setDocType(value)}
                  disabled={loadingAI || loadingDocTypes}
                  loading={loadingDocTypes}
                  style={{ width: 250 }}
                  placeholder="Select AI Type"
                >
                  {availableDocTypes.map(type => (
                    <Option key={type} value={type}>{type.replace(/_/g, ' ').toUpperCase()}</Option>
                  ))}
                </Select>
              </Space>

              <TextArea
                rows={4}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Enter any specific details or instructions needed for AI generation..."
                disabled={loadingAI}
              />
              
              <Button
                onClick={handleCreate}
                disabled={!docType || loadingAI}
                loading={loadingAI}
                icon={<RobotOutlined />}
                type="primary"
              >
                Generate AI Content Preview
              </Button>

              {/* Display loading state */}
              {loadingAI && (
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Spin size="large" />
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    Generating document, please wait...
                  </Text>
                </div>
              )}

              {/* Display AI Generated Content */}
              {generatedContent && (
                <Card 
                  size="small" 
                  type="inner" 
                  title="Generated AI Content Preview" 
                  style={{ marginTop: '16px' }}
                  extra={
                    <Space>
                      <Button 
                        icon={<CopyOutlined />} 
                        onClick={copyGeneratedText} 
                        disabled={copied}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button 
                        danger 
                        icon={<CloseOutlined />} 
                        onClick={dismissGeneratedText}
                      >
                        Dismiss
                      </Button>
                    </Space>
                  }
                >
                  <div style={{ 
                    padding: '12px', 
                    whiteSpace: 'pre-wrap',
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    maxHeight: '400px',
                    overflow: 'auto'
                  }}>
                    {generatedContent}
                  </div>
                </Card>
              )}
            </Space>
          </Tabs.TabPane>
          
          <Tabs.TabPane 
            tab={<span><FileWordOutlined /> Formatted Documents</span>} 
            key="formatted"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Space wrap>
                <Text>Select Template:</Text>
                <Select
                  value={selectedTemplate}
                  onChange={(value) => setSelectedTemplate(value)}
                  disabled={loadingDownload || availableTemplates.length === 0}
                  style={{ width: 300 }}
                  placeholder="Select a template file"
                >
                  {availableTemplates.map(templateFile => (
                    <Option key={templateFile} value={templateFile}>
                      {formatTemplateName(templateFile)}
                    </Option>
                  ))}
                </Select>
              </Space>
              
              <Button
                type="primary"
                onClick={handleDownloadWord}
                disabled={!selectedTemplate || loadingDownload}
                loading={loadingDownload}
                icon={<DownloadOutlined />}
              >
                Download Selected Template (.docx)
              </Button>
              
              {/* Display loading state */}
              {loadingDownload && (
                <div style={{ textAlign: 'center', margin: '16px 0' }}>
                  <Spin size="large" />
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    Preparing document for download...
                  </Text>
                </div>
              )}
            </Space>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </Space>
  );
}

export default DocumentGenerationTab;