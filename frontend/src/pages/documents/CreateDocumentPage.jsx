// src/pages/CreateDocumentPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import api from '../../services/api';
import {
    Typography,
    Card,
    Button,
    Select,
    Input,
    Alert,
    Spin,
    Space,
    message, // Use Ant Design message for feedback
    Row,
    Col
} from 'antd';
import { RobotOutlined, FileWordOutlined, DownloadOutlined, ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons'; // Import icons
import DocumentGenerationTab from '../../pages/CasePage/components/tabs/DocumentGenerationTab';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function CreateDocumentPage() {
    const { caseId } = useParams();
    const [caseDisplayName, setCaseDisplayName] = useState('');
    const [loadingCase, setLoadingCase] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoadingCase(true);
        api.getCase(caseId)
            .then(response => {
                setCaseDisplayName(response.data?.display_name || `Case ${caseId}`);
            })
            .catch(err => {
                setCaseDisplayName(`Case ${caseId}`);
                setError("Could not load case details. Using default case name.");
            })
            .finally(() => {
                setLoadingCase(false);
            });
    }, [caseId]);

    return (
        <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
            {/* Page Header */}
            <Row justify="start" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>
                        Document Generation for: <span style={{ fontSize: '1.05em', fontWeight: 500, color: '#7A4D3B', background: 'rgba(122,77,59,0.07)', borderRadius: '6px', padding: '2px 10px', marginLeft: 6, fontStyle: 'italic', letterSpacing: '0.5px', verticalAlign: 'middle', display: 'inline-block' }}>{loadingCase ? <Spin size="small" /> : caseDisplayName}</span>
                    </Title>
                </Col>
            </Row>
            {error && (
                <Alert message={error} type="warning" showIcon closable />
            )}
            <Paragraph>
                Generate legal documents for your case using AI-powered templates and tools. Select a document type and provide the necessary details to get started.
            </Paragraph>
            <Card style={{ minHeight: 300 }}>
                <DocumentGenerationTab caseId={caseId} />
            </Card>
        </Space>
    );
}

export default CreateDocumentPage;