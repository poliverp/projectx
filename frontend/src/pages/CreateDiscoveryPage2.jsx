// frontend/src/pages/CreateDiscoveryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Typography,
    Card,
    Button,
    Upload,
    Alert,
    Spin,
    Space,
    message,
    Steps,
    Select,
    Checkbox,
    Divider,
    Tabs,
    Radio,
    Tooltip,
    Input,
    Row,
    Col,
    Tag,
} from 'antd';
import {
    UploadOutlined,
    ArrowLeftOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    DownloadOutlined,
    EditOutlined,
    QuestionCircleOutlined,
    CheckCircleOutlined,
    HighlightOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

function CreateDiscoveryPage() {
    // --- Hooks ---
    const { caseId } = useParams();
    const navigate = useNavigate();

    // --- State Variables ---
    const [fileList, setFileList] = useState([]);
    const [isGeneratingResponses, setIsGeneratingResponses] = useState(false);
    const [generatedResponses, setGeneratedResponses] = useState('');
    const [responseError, setResponseError] = useState(null);
    const [caseDisplayName, setCaseDisplayName] = useState('');
    const [loadingCase, setLoadingCase] = useState(true);
    
    // New state for enhanced features
    const [currentStep, setCurrentStep] = useState(0);
    const [discoveryType, setDiscoveryType] = useState('interrogatories');
    const [standardObjections, setStandardObjections] = useState([]);
    const [customInstructions, setCustomInstructions] = useState('');
    const [editedResponses, setEditedResponses] = useState('');
    const [exportFormat, setExportFormat] = useState('docx');
    const [isExporting, setIsExporting] = useState(false);

    // Define standard objections
    const AVAILABLE_OBJECTIONS = [
        { key: 'vague', text: 'Objection: This request is vague and ambiguous.' },
        { key: 'overbroad', text: 'Objection: This request is overly broad in scope and time.' },
        { key: 'burdensome', text: 'Objection: This request is unduly burdensome and harassing.' },
        { key: 'attorney_client', text: 'Objection: This request seeks information protected by the attorney-client privilege.' },
        { key: 'work_product', text: 'Objection: This request seeks information protected by the attorney work product doctrine.' },
        { key: 'relevance', text: 'Objection: This request seeks information that is not relevant to the subject matter of this action.' },
        { key: 'legal_conclusion', text: 'Objection: This request improperly calls for a legal conclusion.' },
        { key: 'premature', text: 'Objection: This request is premature as discovery is ongoing.' }
    ];

    // --- Effects ---
    // Fetch case display name
    useEffect(() => {
        setLoadingCase(true);
        api.getCase(caseId)
            .then(response => {
                setCaseDisplayName(response.data?.display_name || `Case ${caseId}`);
            })
            .catch(err => {
                console.error("Error fetching case display name:", err);
                setCaseDisplayName(`Case ${caseId}`); // Fallback
            })
            .finally(() => {
                setLoadingCase(false);
            });
    }, [caseId]);

    // Update edited responses when generated responses change
    useEffect(() => {
        if (generatedResponses) {
            setEditedResponses(generatedResponses);
        }
    }, [generatedResponses]);

    // --- Handlers ---
    const handleFileChange = (info) => {
        let newFileList = [...info.fileList];
        newFileList = newFileList.slice(-1);
        setFileList(newFileList);

        if (info.file.status === 'removed' || (info.file.status !== 'uploading' && newFileList.length > 0)) {
            setGeneratedResponses('');
            setEditedResponses('');
            setResponseError(null);
        }
    };

    const handleGenerateResponses = async () => {
        const fileToUpload = fileList.length > 0 ? fileList[0]?.originFileObj : null;

        if (!fileToUpload || isGeneratingResponses || !caseId) {
            if (!fileToUpload) {
                message.error('Please select a PDF file first.');
            }
            return;
        }

        setIsGeneratingResponses(true);
        setGeneratedResponses('');
        setResponseError(null);

        try {
            // Prepare API request with all parameters
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('discovery_type', discoveryType);
            formData.append('objections', JSON.stringify(standardObjections));
            formData.append('custom_instructions', customInstructions);

            // Call API with enhanced parameters
            const apiMethod = discoveryType === 'interrogatories' 
                ? api.generateInterrogatoryResponses 
                : api.generateDiscoveryResponses;

            const result = await apiMethod(caseId, formData);
            
            setGeneratedResponses(result.data.generated_content);
            message.success('Draft responses generated!');
            setCurrentStep(2); // Move to edit step
        } catch (err) {
            console.error("Failed to generate discovery responses:", err);
            const errorMsg = `Failed to generate: ${err.response?.data?.error || err.message}`;
            setResponseError(errorMsg);
            message.error('Generation failed.');
        } finally {
            setIsGeneratingResponses(false);
        }
    };

    const handleObjectionChange = (checkedValues) => {
        setStandardObjections(checkedValues);
    };

    const handleExportDocument = async () => {
        if (!editedResponses) {
            message.warning('No content to export.');
            return;
        }

        setIsExporting(true);
        try {
            // Mock export functionality
            setTimeout(() => {
                message.success(`Responses exported as ${exportFormat.toUpperCase()} file!`);
                setIsExporting(false);
            }, 1500);

            // Actual implementation would call your export API:
            // const result = await api.exportDiscoveryResponses(caseId, {
            //     content: editedResponses,
            //     format: exportFormat,
            //     discovery_type: discoveryType
            // });
            // 
            // // Trigger download with the returned URL or blob
            // const link = document.createElement('a');
            // link.href = result.data.downloadUrl; // or window.URL.createObjectURL(result.data)
            // link.download = `${discoveryType}_responses_${caseId}.${exportFormat}`;
            // document.body.appendChild(link);
            // link.click();
            // document.body.removeChild(link);
        } catch (err) {
            console.error("Failed to export document:", err);
            message.error('Export failed.');
        } finally {
            setIsExporting(false);
        }
    };

    // --- Props for Ant Design Upload component ---
    const uploadProps = {
        fileList: fileList,
        accept: ".pdf",
        maxCount: 1,
        beforeUpload: (file) => {
            const isPdf = file.type === 'application/pdf';
            if (!isPdf) {
                message.error(`${file.name} is not a PDF file`);
            }
            const isLt50M = file.size / 1024 / 1024 < 50;
            if (!isLt50M) {
                message.error('File must be smaller than 50MB!');
            }
            return false;
        },
        onChange: handleFileChange,
        onRemove: () => {
            setFileList([]);
            setGeneratedResponses('');
            setEditedResponses('');
            setResponseError(null);
            return true;
        }
    };

    // Discovery type options
    const discoveryTypes = [
        { value: 'interrogatories', label: 'Interrogatories' },
        { value: 'requests_for_production', label: 'Requests for Production' },
        { value: 'requests_for_admission', label: 'Requests for Admission' },
    ];

    // --- JSX ---
    return (
        <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
            {/* Page Header */}
            <Row justify="space-between" align="middle">
                <Col>
                    <Title level={2}>
                        Discovery Responses for {loadingCase ? <Spin size="small" /> : <Text strong>{caseDisplayName}</Text>}
                    </Title>
                </Col>
                <Col>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/case/${caseId}`)}>
                        Back to Case
                    </Button>
                </Col>
            </Row>

            {/* Step Navigation */}
            <Steps current={currentStep} onChange={setCurrentStep}>
                <Step title="Setup" description="Configure" />
                <Step title="Generate" description="Create draft" />
                <Step title="Edit" description="Review & refine" />
                <Step title="Export" description="Save document" />
            </Steps>

            {/* Step Content */}
            <Card>
                {/* Step 1: Setup */}
                {currentStep === 0 && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Title level={4}>Configure Response Parameters</Title>
                        
                        <Card type="inner" title="Discovery Type">
                            <Radio.Group 
                                value={discoveryType} 
                                onChange={(e) => setDiscoveryType(e.target.value)}
                                optionType="button"
                                buttonStyle="solid"
                            >
                                {discoveryTypes.map(type => (
                                    <Radio.Button value={type.value} key={type.value}>
                                        {type.label}
                                    </Radio.Button>
                                ))}
                            </Radio.Group>
                        </Card>
                        
                        <Card type="inner" title={
                            <Space>
                                <span>Standard Objections</span>
                                <Tooltip title="These objections will be considered when generating responses">
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        }>
                            <Checkbox.Group onChange={handleObjectionChange} value={standardObjections}>
                                <Row gutter={[16, 8]}>
                                    {AVAILABLE_OBJECTIONS.map(objection => (
                                        <Col span={24} key={objection.key}>
                                            <Checkbox value={objection.key}>
                                                {objection.text}
                                            </Checkbox>
                                        </Col>
                                    ))}
                                </Row>
                            </Checkbox.Group>
                        </Card>
                        
                        <Card type="inner" title="Custom Instructions (Optional)">
                            <TextArea
                                rows={4}
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                placeholder="Enter any special instructions for response generation (e.g., emphasize specific case facts, mention particular legal precedents)"
                            />
                        </Card>
                        
                        <Button type="primary" onClick={() => setCurrentStep(1)}>
                            Continue to Document Upload
                        </Button>
                    </Space>
                )}

                {/* Step 2: Generate */}
                {currentStep === 1 && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Title level={4}>
                            Upload {discoveryType === 'interrogatories' ? 'Interrogatories' : 
                                   discoveryType === 'requests_for_production' ? 'Requests for Production' :
                                   'Requests for Admission'}
                        </Title>
                        
                        <Alert
                            type="info"
                            showIcon
                            message="Document Requirements"
                            description={
                                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                                    <li>Upload the discovery document you received (PDF format)</li>
                                    <li>Make sure the document is searchable/OCR-processed for best results</li>
                                    <li>Maximum file size: 50MB</li>
                                </ul>
                            }
                            style={{ marginBottom: 16 }}
                        />
                        
                        <Upload {...uploadProps} style={{ marginBottom: 16 }}>
                            <Button icon={<UploadOutlined />} disabled={isGeneratingResponses}>
                                Select Discovery PDF
                            </Button>
                        </Upload>

                        {fileList.length > 0 && (
                            <Card type="inner" title="Configuration Summary">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div><Text strong>Discovery Type:</Text> {discoveryTypes.find(type => type.value === discoveryType)?.label}</div>
                                    <div>
                                        <Text strong>Selected Objections:</Text>{' '}
                                        {standardObjections.length > 0 ? (
                                            <Space size={[0, 4]} wrap>
                                                {standardObjections.map(key => (
                                                    <Tag key={key} color="blue">
                                                        {AVAILABLE_OBJECTIONS.find(obj => obj.key === key)?.key.replace('_', ' ')}
                                                    </Tag>
                                                ))}
                                            </Space>
                                        ) : (
                                            <Text type="secondary">None selected</Text>
                                        )}
                                    </div>
                                    {customInstructions && (
                                        <div>
                                            <Text strong>Custom Instructions:</Text>
                                            <div style={{ marginTop: 4 }}>
                                                <Text type="secondary" ellipsis={{ rows: 2 }}>{customInstructions}</Text>
                                            </div>
                                        </div>
                                    )}
                                </Space>
                            </Card>
                        )}
                        
                        <Row gutter={16}>
                            <Col>
                                <Button onClick={() => setCurrentStep(0)}>
                                    Back to Setup
                                </Button>
                            </Col>
                            <Col>
                                <Button
                                    type="primary"
                                    onClick={handleGenerateResponses}
                                    loading={isGeneratingResponses}
                                    disabled={fileList.length === 0 || isGeneratingResponses}
                                    icon={<HighlightOutlined />}
                                >
                                    Generate Draft Responses
                                </Button>
                            </Col>
                        </Row>

                        {responseError && (
                            <Alert
                                message="Generation Failed"
                                description={responseError}
                                type="error"
                                showIcon
                                closable
                                onClose={() => setResponseError(null)}
                            />
                        )}
                    </Space>
                )}

                {/* Step 3: Edit */}
                {currentStep === 2 && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Title level={4}>
                            <Space>
                                <EditOutlined />
                                Review and Edit Responses
                            </Space>
                        </Title>
                        
                        <Alert
                            type="warning"
                            showIcon
                            message="Attorney Review Required"
                            description="These AI-generated responses are drafts only. Always review for accuracy, completeness, and legal compliance before finalizing."
                            style={{ marginBottom: 16 }}
                        />
                        
                        <TextArea
                            rows={16}
                            value={editedResponses}
                            onChange={(e) => setEditedResponses(e.target.value)}
                            style={{ 
                                fontFamily: 'Courier New, monospace',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6',
                                padding: '16px'
                            }}
                        />
                        
                        <Row gutter={16}>
                            <Col>
                                <Button onClick={() => setCurrentStep(1)}>
                                    Back to Generate
                                </Button>
                            </Col>
                            <Col>
                                <Button
                                    type="primary"
                                    onClick={() => setCurrentStep(3)}
                                    disabled={!editedResponses}
                                >
                                    Continue to Export
                                </Button>
                            </Col>
                        </Row>
                    </Space>
                )}

                {/* Step 4: Export */}
                {currentStep === 3 && (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Title level={4}>
                            <Space>
                                <DownloadOutlined />
                                Export Document
                            </Space>
                        </Title>
                        
                        <Card type="inner" title="Export Preview">
                            <div
                                style={{
                                    border: '1px solid #f0f0f0',
                                    padding: '16px',
                                    background: '#fff',
                                    marginBottom: '16px',
                                    minHeight: '200px',
                                    maxHeight: '400px',
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'Courier New, monospace',
                                    lineHeight: '1.6'
                                }}
                            >
                                {editedResponses}
                            </div>
                        </Card>
                        
                        <Card type="inner" title="Export Options">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div>
                                    <Text strong>File Format:</Text>
                                    <Radio.Group 
                                        value={exportFormat}
                                        onChange={(e) => setExportFormat(e.target.value)}
                                        style={{ marginLeft: '16px' }}
                                    >
                                        <Radio.Button value="docx">Word (.docx)</Radio.Button>
                                        <Radio.Button value="pdf">PDF</Radio.Button>
                                        <Radio.Button value="txt">Text (.txt)</Radio.Button>
                                    </Radio.Group>
                                </div>
                                
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    onClick={handleExportDocument}
                                    loading={isExporting}
                                    disabled={!editedResponses || isExporting}
                                    style={{ marginTop: '16px' }}
                                >
                                    Export as {exportFormat.toUpperCase()}
                                </Button>
                            </Space>
                        </Card>
                        
                        <Row gutter={16}>
                            <Col>
                                <Button onClick={() => setCurrentStep(2)}>
                                    Back to Edit
                                </Button>
                            </Col>
                            <Col>
                                <Button type="primary" onClick={() => navigate(`/case/${caseId}`)}>
                                    Finish and Return to Case
                                </Button>
                            </Col>
                        </Row>
                    </Space>
                )}
            </Card>
        </Space>
    );
}

export default CreateDiscoveryPage;