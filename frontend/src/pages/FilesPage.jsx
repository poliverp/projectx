// frontend/src/pages/FilesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Typography,
    Card,
    Button,
    Upload, // Import Upload component
    List,   // Import List component
    Popconfirm,
    Alert,
    Spin,
    Space,
    message, // Use Ant Design message for feedback
    Tag      // Optional: For file types or status
} from 'antd';
import { InboxOutlined, FilePdfOutlined, FileWordOutlined, FileTextOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'; // Import relevant icons

const { Title, Text } = Typography;
const { Dragger } = Upload; // Destructure Dragger for drag-and-drop

function FilesPage() {
    const { caseId } = useParams();
    const navigate = useNavigate();

    // State
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true); // Loading for initial fetch and delete
    const [error, setError] = useState(null);
    // Note: 'uploading' state is handled internally by AntD Upload per file now
    const [caseDisplayName, setCaseDisplayName] = useState('');

    // Function to fetch documents and case name
    const fetchData = useCallback(async () => {
        // Avoid setting loading if it's just a refresh after upload/delete
        // setLoading(true); // Only set loading on initial mount maybe?
        try {
            // Fetch case details first (can run in parallel)
            const casePromise = api.getCase(caseId);
            // Then fetch documents
            const docPromise = api.getDocumentsForCase(caseId);

            const [caseResponse, docResponse] = await Promise.all([casePromise, docPromise]);

            setCaseDisplayName(caseResponse.data?.display_name || `Case ${caseId}`);
            setDocuments(docResponse.data || []);
            setError(null); // Clear previous errors on successful fetch
        } catch (err) {
            console.error(`Error fetching data for case ${caseId}:`, err);
            setError(`Failed to load data. ${err.response?.status === 404 ? 'Case or documents not found.' : 'Is the backend running?'}`);
            // Decide if you want to clear documents if case fetch fails, etc.
            // setDocuments([]);
        } finally {
            setLoading(false); // Ensure loading is false after fetch attempt
        }
    }, [caseId]);

    // Fetch data on component mount
    useEffect(() => {
        setLoading(true); // Set loading true only on mount
        fetchData();
    }, [fetchData]); // Depend on the memoized fetchData

    // Custom request function for Ant Design Upload
    const handleUpload = async (options) => {
        const { file, onSuccess, onError /*, onProgress */ } = options;
        console.log(`Attempting upload for ${file.name}`);
        setError(null); // Clear general errors on new upload attempt

        // Assume default options for now, get from UI later if needed
        const uploadOptions = { storeOnly: false, analyze: false };

        try {
            const response = await api.uploadDocument(caseId, file, uploadOptions);
            onSuccess(response.data, file); // Pass backend response to onSuccess
            console.log(`Successfully uploaded ${file.name}`);
            message.success(`${file.name} uploaded successfully!`);
            // Trigger list refresh after successful upload
            fetchData(); // Consider debouncing or refreshing only once after a batch
        } catch (err) {
            console.error(`Error uploading file ${file.name}:`, err);
            const errorMsg = `Failed to upload ${file.name}: ${err.response?.data?.error || err.message}`;
            // Update the general error state to show in the Alert
            setError(prevError => `${prevError ? prevError + '; ' : ''}${errorMsg}`);
            // Call AntD onError to mark the file as failed in the UI
            onError(err); // Pass the error object
             message.error(`Upload failed for ${file.name}.`);
        }
    };

    // Props for the Upload Dragger component
    const draggerProps = {
        name: 'file', // Field name expected by the backend (often 'file')
        multiple: true, // Allow multiple file uploads
        accept: ".pdf,.docx,.txt,.doc", // Specify accepted file types
        customRequest: handleUpload, // Use our custom handler
        // Optional: Add onChange for more fine-grained feedback or actions
        onChange(info) {
            const { status } = info.file;
            if (status === 'done') {
                // message.success(`${info.file.name} file uploaded successfully.`); // Can be redundant if handleUpload shows message
            } else if (status === 'error') {
                // message.error(`${info.file.name} file upload failed.`); // Can be redundant if handleUpload shows message
            }
            // You could potentially trigger fetchData here less often, e.g.,
            // when info.fileList.every(f => f.status === 'done' || f.status === 'error')
        },
         // Optional: Show download links for already uploaded files in the list?
         showUploadList: {
             showDownloadIcon: false, // Assume no direct download from upload list for now
             showRemoveIcon: true, // Allow removing from queue before upload finishes
         }
    };

    // Handle Delete Document
    const handleDeleteDocument = async (docId, docName) => {
        const key = `deleting-${docId}`;
        message.loading({ content: `Deleting ${docName}...`, key });
        setLoading(true); // Show general loading indicator during delete
        setError(null);
        try {
            await api.deleteDocument(docId); // Ensure api.deleteDocument(id) exists
            message.success({ content: `${docName} deleted successfully!`, key, duration: 2 });
            // Refresh data after delete
            fetchData();
            // Or optimistic update:
            // setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
        } catch (err) {
            console.error("Error deleting document:", err);
            const errorMsg = `Failed to delete ${docName}: ${err.response?.data?.error || err.message}`;
            setError(errorMsg);
            message.error({ content: errorMsg, key, duration: 4 });
        } finally {
             setLoading(false);
        }
    };

    // Helper function to get file type icon (optional)
    const getFileIcon = (fileName) => {
        if (!fileName) return <FileTextOutlined />;
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') return <FilePdfOutlined />;
        if (extension === 'docx' || extension === 'doc') return <FileWordOutlined />;
        return <FileTextOutlined />;
    };

    return (
        <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
             {/* Page Title and Back Button */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Title level={2} style={{ margin: 0 }}>Manage Documents for: <Text strong>{caseDisplayName || `Case ${caseId}`}</Text></Title>
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

            {/* --- File Upload Section --- */}
            <Card title="Upload New Documents">
                {/* Use Upload.Dragger for drag & drop and click */}
                <Dragger {...draggerProps}>
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag file(s) to this area to upload</p>
                    <p className="ant-upload-hint">
                        Supports single or bulk upload. Accepted types: PDF, DOCX, DOC, TXT.
                    </p>
                </Dragger>
                {/* Manual upload button is removed as Dragger handles both */}
            </Card>

            {/* --- Document List Section --- */}
            <Card title="Existing Documents">
                 {/* Show Spin covering the List while loading initially */}
                 <Spin spinning={loading && documents.length === 0} tip="Loading documents...">
                    <List
                        itemLayout="horizontal"
                        dataSource={documents}
                        locale={{ emptyText: loading ? ' ' : 'No documents found for this case.' }} // Handle empty state message
                        renderItem={(doc) => (
                            <List.Item
                                actions={[ // Actions appear on the right
                                     // Add Download button if API provides URL
                                     // <Button size="small" href={doc.download_url} target="_blank">Download</Button>,
                                    <Popconfirm
                                        title="Delete Document?"
                                        description={`Permanently delete ${doc.file_name}?`}
                                        onConfirm={() => handleDeleteDocument(doc.id, doc.file_name)}
                                        okText="Delete"
                                        cancelText="Cancel"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Button danger size="small" icon={<DeleteOutlined />} disabled={loading}> {/* Disable delete while another action loads */}
                                            {/* Delete */}
                                        </Button>
                                    </Popconfirm>
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={getFileIcon(doc.file_name)} // Show file type icon
                                    title={<Text>{doc.file_name || 'Unnamed Document'}</Text>}
                                    description={
                                        <Text type="secondary">
                                            Uploaded: {doc.upload_date ? new Date(doc.upload_date).toLocaleString() : 'N/A'}
                                            {/* Add size if available: | Size: ... KB */}
                                        </Text>
                                    }
                                />
                                {/* You could add other info here like doc status if available */}
                            </List.Item>
                        )}
                    />
                </Spin>
            </Card>
        </Space>
    );
}

export default FilesPage;