// --- START SCRIPT: src/pages/CasePage/components/CaseFilesManager.jsx ---
import React from 'react';
import {
    Typography,
    Button,
    Upload,
    List,
    Popconfirm,
    Alert,
    Spin,
    Space,
    Tag
} from 'antd';
import { InboxOutlined, FilePdfOutlined, FileWordOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
// Adjust path relative to src/pages/CasePage/components/
import { useDocumentManager } from '../hooks/useDocumentManager';

const { Text } = Typography;
const { Dragger } = Upload;

// This component renders the *content* for the file management modal.
function CaseFilesManager({ caseId }) {
    // Use the custom hook for state and logic
    const {
        documents,
        loading, // Loading state from hook (for fetch/delete)
        error,   // Error state from hook
        uploadDocument, // Handler for Upload component's customRequest
        deleteDocument  // Handler for delete button
    } = useDocumentManager(caseId);

    // Dragger configuration
    const draggerProps = {
        name: 'file',
        multiple: true,
        accept: ".pdf,.docx,.txt,.doc",
        customRequest: uploadDocument,
        disabled: !caseId || loading, // Disable while loading/deleting
        showUploadList: {
            showDownloadIcon: false,
            showRemoveIcon: true,
        },
        // Optional: Add onChange if needed for detailed status feedback
        // onChange(info) { console.log('Upload status:', info.file.status); },
    };

    // Icon helper
    const getFileIcon = (fileName) => {
        if (!fileName) return <FileTextOutlined />;
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') return <FilePdfOutlined />;
        if (extension === 'docx' || extension === 'doc') return <FileWordOutlined />;
        return <FileTextOutlined />;
    };

    return (
        <Spin spinning={loading} tip="Processing...">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Display Errors */}
                {error && (
                    <Alert message="Error" description={error} type="error" showIcon closable />
                )}

                {/* File Upload Section */}
                <Dragger {...draggerProps}>
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">Click or drag file(s) to upload</p>
                    <p className="ant-upload-hint">Supports PDF, DOCX, DOC, TXT.</p>
                </Dragger>

                {/* Document List Section */}
                <List
                    header={<Text strong>Uploaded Documents</Text>}
                    bordered
                    itemLayout="horizontal"
                    dataSource={documents}
                    locale={{ emptyText: 'No documents uploaded yet.' }}
                    // Constrain height for scroll within modal
                    style={{ maxHeight: '45vh', overflowY: 'auto', marginTop: '16px' }}
                    renderItem={(doc) => (
                        <List.Item
                            key={doc.id}
                            actions={[
                                <Popconfirm
                                    title="Delete Document?"
                                    description={`Permanently delete ${doc.file_name}?`}
                                    onConfirm={() => deleteDocument(doc.id, doc.file_name)}
                                    okText="Delete"
                                    cancelText="Cancel"
                                    okButtonProps={{ danger: true }}
                                    disabled={loading}
                                >
                                    <Button danger size="small" icon={<DeleteOutlined />} disabled={loading} />
                                </Popconfirm>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={getFileIcon(doc.file_name)}
                                title={<Text>{doc.file_name || 'Unnamed Document'}</Text>}
                                description={
                                    <Text type="secondary">
                                        Uploaded: {doc.upload_date ? new Date(doc.upload_date).toLocaleString() : 'N/A'}
                                    </Text>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Space>
        </Spin>
    );
}

export default CaseFilesManager;
// --- END SCRIPT: src/pages/CasePage/components/CaseFilesManager.jsx ---