// src/pages/DocumentAnalysisPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import api from '../services/api';
import {
    Typography,
    Card,
    Button,
    Select,
    Alert,
    Spin,
    Space,
    message // Use Ant Design message for feedback
} from 'antd';
import { ExperimentOutlined, FileTextOutlined, ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons'; // Import icons

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

function DocumentAnalysisPage() {
    const { caseId } = useParams();
    const navigate = useNavigate(); // Hook for navigation

    // State
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(''); // Store the ID of the selected document
    const [loadingDocs, setLoadingDocs] = useState(false); // Loading state for fetching documents
    const [loadingAnalysis, setLoadingAnalysis] = useState(false); // Loading state for analysis action
    const [error, setError] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null); // Stores the JSON/text result

    // Fetch documents for selection
    useEffect(() => {
        const fetchDocuments = async () => {
            setLoadingDocs(true);
            setError(null); // Clear previous errors
            setAnalysisResult(null); // Clear previous results
            setSelectedDocId(''); // Reset selection
            try {
                const response = await api.getDocumentsForCase(caseId); // Ensure this API function exists
                setDocuments(response.data || []);
                if (!response.data || response.data.length === 0) {
                     message.info("No documents found for this case to analyze.");
                }
            } catch (err) {
                console.error("Error fetching documents:", err);
                setError(`Failed to load documents: ${err.response?.data?.error || err.message}`);
                setDocuments([]); // Ensure empty array on error
            } finally {
                setLoadingDocs(false);
            }
        };
        fetchDocuments();
    }, [caseId]);

    // Handle Analysis Trigger
    const handleAnalyze = async () => {
        if (!selectedDocId) {
            message.warning("Please select a document to analyze.");
            return;
        }
        setLoadingAnalysis(true);
        setError(null);
        setAnalysisResult(null);
        try {
            // Assume api.analyzeDocument(docId) exists and returns analysis data
            const result = await api.analyzeDocument(selectedDocId);
            setAnalysisResult(result.data);
             message.success("Analysis complete!");
        } catch (err) {
            console.error("Error analyzing document:", err);
            setError(`Analysis failed: ${err.response?.data?.error || err.message}`);
            message.error("Analysis failed.");
        } finally {
            setLoadingAnalysis(false);
        }
    };

    // Handle document selection change
    const handleSelectChange = (value) => {
        setSelectedDocId(value);
        setAnalysisResult(null); // Clear previous results when selection changes
        setError(null); // Clear errors when selection changes
    };

    return (
        <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
             {/* Page Title and Back Button */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Title level={2} style={{ margin: 0 }}>Document Analysis for Case {caseId}</Title>
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
                    onClose={() => setError(null)}
                />
            )}

             {/* Selection and Action Card */}
            <Card title={<span><FileTextOutlined /> Select Document and Analyze</span>}>
                <Spin spinning={loadingDocs} tip="Loading documents...">
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Paragraph>Select a document associated with this case to perform analysis.</Paragraph>
                        <Space wrap> {/* Allow elements to wrap */}
                            <Select
                                style={{ width: 350 }}
                                placeholder="Select a document..."
                                value={selectedDocId || undefined} // Use undefined for placeholder to show correctly
                                onChange={handleSelectChange}
                                loading={loadingDocs}
                                disabled={loadingDocs || loadingAnalysis || documents.length === 0}
                                notFoundContent={loadingDocs ? <Spin size="small" /> : "No documents found"}
                            >
                                {documents.map(doc => (
                                    <Option key={doc.id} value={doc.id}>
                                        {doc.file_name || `Document ID: ${doc.id}`} {/* Display filename or fallback */}
                                    </Option>
                                ))}
                            </Select>
                            <Button
                                type="primary"
                                icon={<ExperimentOutlined />}
                                onClick={handleAnalyze}
                                disabled={!selectedDocId || loadingDocs || loadingAnalysis}
                                loading={loadingAnalysis}
                            >
                                Analyze Selected
                            </Button>
                        </Space>
                    </Space>
                 </Spin>
            </Card>

            {/* Analysis Results Card */}
            {loadingAnalysis && ( // Show spinner while analysis is in progress
                <div style={{ textAlign: 'center', padding: '30px' }}>
                    <Spin size="large" tip="Analyzing document..." />
                </div>
            )}
            {analysisResult && !loadingAnalysis && ( // Show results only when analysis is done and results exist
                <Card type="inner" title="Analysis Results">
                    {/* Display results - using pre for JSON, adjust if structure is different */}
                    {/* Add copyable prop directly to Text component */}
                    <Typography.Text
                        copyable={{ tooltips: ['Copy JSON', 'Copied!'] }}
                        style={{ display: 'block' }} // Make text block for pre formatting
                    >
                         {/* Use code prop for monospaced font */}
                        <pre style={{ margin: 0, background: '#f9f9f9', padding: '15px', border: '1px solid #eee', borderRadius: '4px', maxHeight: '60vh', overflowY: 'auto' }}>
                            {JSON.stringify(analysisResult, null, 2)}
                        </pre>
                    </Typography.Text>
                </Card>
            )}
             {!analysisResult && !loadingDocs && !loadingAnalysis && documents.length > 0 && ( // Initial instruction message
                 <Text type="secondary"><i>Select a document and click "Analyze Selected". (Requires backend analysis feature)</i></Text>
             )}
        </Space>
    );
}

export default DocumentAnalysisPage;