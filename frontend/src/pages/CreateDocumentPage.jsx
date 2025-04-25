// src/pages/CreateDocumentPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import api from '../services/api';
import {
    Typography,
    Card,
    Button,
    Select,
    Input,
    Alert,
    Spin,
    Space,
    message // Use Ant Design message for feedback
} from 'antd';
import { RobotOutlined, FileWordOutlined, DownloadOutlined, ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons'; // Import icons

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function CreateDocumentPage() {
    const { caseId } = useParams();
    const navigate = useNavigate(); // Hook for navigation

    // State for AI document generation
    const [docType, setDocType] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [generatedContent, setGeneratedContent] = useState(null);
    const [availableDocTypes, setAvailableDocTypes] = useState([]);
    const [loadingDocTypes, setLoadingDocTypes] = useState(false); // Specific loading for types

    // State for Word Template Download
    // Consider fetching this list from the backend in the future if it changes often
    const [availableTemplates] = useState([
        'jury_fees_template.docx',
        'demand_letter_template.docx',
        'case_summary_template.docx',
    ]);
    const [selectedTemplate, setSelectedTemplate] = useState('');

    // Combined State
    const [error, setError] = useState(null);
    // Separate loading states for clarity
    const [loadingAI, setLoadingAI] = useState(false);
    const [loadingDownload, setLoadingDownload] = useState(false);

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
    }, [caseId]); // Removed caseId dependency if types are global

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
        const templateInfo = { template_name: selectedTemplate };

        setLoadingDownload(true);
        setError(null);
        setGeneratedContent(null); // Clear AI content when downloading

        console.log(`Requesting download for template: ${selectedTemplate}`);
        try {
            // Assumes api.downloadWordDocument triggers the download via response headers/blob
            await api.downloadWordDocument(caseId, templateInfo);
            console.log("Word document download initiated successfully.");
            // Feedback might be tricky as success means download starts, not finishes
            message.info(`Preparing download for ${formatTemplateName(selectedTemplate)}...`);
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
            setError(`Failed to download Word document: ${errorMessage}`);
            console.error("Word Download API error:", err.response || err.message);
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

    return (
        <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
            {/* Page Title and Back Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Title level={2} style={{ margin: 0 }}>Create/Generate Document for Case {caseId}</Title>
                 <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/case/${caseId}`)}>
                    Back to Case
                 </Button>
            </div>

            {/* Display General Errors */}
             {error && (
                <Alert
                    message="Operation Error"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setError(null)} // Allow dismissing error
                />
            )}

            {/* --- Section for AI Generation --- */}
            <Card title={<span><RobotOutlined /> Generate Content using AI</span>}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Space wrap> {/* Wrap allows select and text to fit better */}
                         <Text>AI Document Type:</Text>
                         <Select
                            value={docType}
                            onChange={(value) => setDocType(value)}
                            disabled={loadingAI || loadingDownload || loadingDocTypes}
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
                        disabled={loadingAI || loadingDownload}
                    />
                    <Button
                        onClick={handleCreate}
                        disabled={!docType || loadingAI || loadingDownload}
                        loading={loadingAI}
                        icon={<RobotOutlined />}
                    >
                        Generate AI Content Preview
                    </Button>

                    {/* Display AI Generated Content */}
                    {generatedContent && (
                        <Card size="small" type="inner" title="Generated AI Content Preview" style={{ marginTop: '16px' }}>
                            <Paragraph copyable={{ icon: <CopyOutlined />, tooltips: ['Copy content', 'Copied!'] }} style={{ whiteSpace: 'pre-wrap' }}>
                                {generatedContent}
                            </Paragraph>
                        </Card>
                    )}
                </Space>
            </Card>

            {/* --- Section for Word Template Download --- */}
            <Card title={<span><FileWordOutlined /> Download Formatted Document (.docx)</span>}>
                 <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Space wrap>
                         <Text>Select Template:</Text>
                         <Select
                            value={selectedTemplate}
                            onChange={(value) => setSelectedTemplate(value)}
                            disabled={loadingAI || loadingDownload || availableTemplates.length === 0}
                            style={{ width: 300 }}
                            placeholder="Select a template file"
                         >
                             {/* Populate dropdown from availableTemplates state */}
                             {availableTemplates.map(templateFile => (
                                <Option key={templateFile} value={templateFile}>
                                    {formatTemplateName(templateFile)} {/* Display formatted name */}
                                </Option>
                            ))}
                        </Select>
                    </Space>
                    <Button
                        type="primary" // Make download primary action for this card
                        onClick={handleDownloadWord}
                        disabled={!selectedTemplate || loadingAI || loadingDownload}
                        loading={loadingDownload}
                        icon={<DownloadOutlined />}
                    >
                        Download Selected Template (.docx)
                    </Button>
                 </Space>
            </Card>
        </Space>
    );
}

export default CreateDocumentPage;