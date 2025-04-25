// frontend/src/pages/CreateDiscoveryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import api from '../services/api'; // Adjust path if needed
import {
    Typography, // For Titles, Text, Paragraphs
    Card,       // To structure content sections
    Button,     // For actions
    Upload,     // For file input
    Alert,      // For errors
    Spin,       // For loading indicators
    Space,      // For layout spacing
    message     // For feedback messages (like copy success)
    // Breadcrumb (Optional, if you want path navigation)
} from 'antd';
import { UploadOutlined, CopyOutlined, ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons'; // Import icons

const { Title, Paragraph, Text } = Typography;

function CreateDiscoveryPage() {
    // --- Hooks ---
    const { caseId } = useParams();
    const navigate = useNavigate(); // For navigation actions

    // --- State Variables ---
    // State for file handling with Ant Design Upload
    const [fileList, setFileList] = useState([]); // Use fileList for Upload component

    const [isGeneratingResponses, setIsGeneratingResponses] = useState(false);
    const [generatedResponses, setGeneratedResponses] = useState('');
    const [responseError, setResponseError] = useState(null);
    const [caseDisplayName, setCaseDisplayName] = useState('');
    const [loadingCase, setLoadingCase] = useState(true);

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

    // --- Handlers ---
    // Handle file changes via Upload component's onChange prop
    const handleFileChange = (info) => {
        // Keep only the most recent file in the list (due to maxCount: 1)
        let newFileList = [...info.fileList];
        newFileList = newFileList.slice(-1);

        // Optional: You could read file content here if needed, but for upload
        // we usually just need the file object itself.

        setFileList(newFileList); // Update the file list state

        // Clear previous results/errors when file changes
        if (info.file.status === 'removed' || (info.file.status !== 'uploading' && newFileList.length > 0)) {
            setGeneratedResponses('');
            setResponseError(null);
        }
    };

    const handleGenerateResponses = async () => {
        // Get the file object from the fileList state
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
            // Pass the actual file object to the API service function
            const result = await api.generateInterrogatoryResponses(caseId, fileToUpload);
            setGeneratedResponses(result.data.generated_content);
             message.success('Draft responses generated!');
        } catch (err) {
            console.error("Failed to generate interrogatory responses:", err);
            const errorMsg = `Failed to generate: ${err.response?.data?.error || err.message}`;
            setResponseError(errorMsg);
             message.error('Generation failed.'); // Show feedback
        } finally {
            setIsGeneratingResponses(false);
        }
    };

     // --- Props for Ant Design Upload component ---
     const uploadProps = {
        fileList: fileList, // Control the displayed file list
        accept: ".pdf", // Accept only PDF files
        maxCount: 1, // Allow only one file to be selected
        beforeUpload: (file) => {
            // Prevent default upload behavior, we handle upload manually on button click
            // You can add validation here (e.g., file size)
            const isPdf = file.type === 'application/pdf';
            if (!isPdf) {
                message.error(`${file.name} is not a PDF file`);
            }
            const isLt50M = file.size / 1024 / 1024 < 50; // Example: Limit size to 50MB
             if (!isLt50M) {
               message.error('File must be smaller than 50MB!');
             }
            // Return false prevents Ant Design's default upload action ONLY if validation fails
            // If we always return false, onChange might not capture file correctly in some versions.
            // Best practice for manual handling is usually just capturing in onChange.
            // Let's rely on onChange and remove the file manually if needed.
            // We will stop the default upload action by not providing an 'action' prop.
            return false; // Explicitly prevent upload here
        },
        onChange: handleFileChange, // Use our handler to update state
        onRemove: () => { // Ensure state is cleared if file is removed via UI
            setFileList([]);
            setGeneratedResponses('');
            setResponseError(null);
            return true;
        }
        // Removed 'action' prop - this prevents the component from trying to POST the file anywhere automatically
    };


    // --- JSX ---
    return (
        <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
            {/* Page Title */}
            <Title level={2}>
                Generate Discovery Responses for {loadingCase ? <Spin size="small" /> : <Text strong>{caseDisplayName}</Text>}
            </Title>

            {/* Main Card for the feature */}
            <Card title={<span><FilePdfOutlined /> Generate Interrogatory Responses (Draft)</span>}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Paragraph>
                        Upload the interrogatories document (PDF) you received for this case. The AI will generate draft responses based on the case information.
                    </Paragraph>

                    {/* Ant Design Upload Component */}
                    <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />} disabled={isGeneratingResponses}>
                            Select Interrogatories PDF
                        </Button>
                    </Upload>

                    {/* Generate Button */}
                    <Button
                        type="primary"
                        onClick={handleGenerateResponses}
                        loading={isGeneratingResponses} // Show loading state on button
                        disabled={fileList.length === 0 || isGeneratingResponses} // Disable if no file or already generating
                        style={{ marginTop: '10px' }}
                    >
                        Generate Draft Responses
                    </Button>

                    {/* Error Display */}
                    {responseError && (
                        <Alert
                            message="Generation Failed"
                            description={responseError}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setResponseError(null)} // Allow dismissing
                        />
                    )}
                </Space>
            </Card>

            {/* Results Display Card */}
            {generatedResponses && (
                <Card type="inner" title="Generated Draft">
                    {/* Use Paragraph with copyable for built-in copy functionality */}
                    <Typography.Paragraph
                        copyable={{ tooltips: ['Copy draft', 'Copied!'] }}
                        style={{ whiteSpace: 'pre-wrap', maxHeight: '60vh', overflowY: 'auto', background: '#f9f9f9', padding: '15px', border: '1px solid #eee', borderRadius: '4px' }}
                    >
                        {generatedResponses}
                    </Typography.Paragraph>
                    {/* Manual copy button removed, using built-in copyable */}
                </Card>
            )}

            {/* Loading indicator for generation (optional - Button has its own) */}
            {/* {isGeneratingResponses && <Spin tip="Generating..." style={{ display: 'block', marginTop: '20px' }} />} */}

            {/* Navigation Back */}
            <Space style={{ marginTop: '20px' }}>
                 <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/case/${caseId}`)}>
                    Back to Case Details
                 </Button>
                 {/* Optional: Link back to main cases list */}
                 {/* <Button onClick={() => navigate('/manage-cases')}>
                    Back to Manage Cases
                 </Button> */}
            </Space>
        </Space>
    );
}

export default CreateDiscoveryPage;