// frontend/src/pages/DiscoveryLandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Typography,
    Card,
    Button,
    Space,
    Row,
    Col,
    Spin,
    Alert
} from 'antd';
import {
    ArrowLeftOutlined,
    FileSearchOutlined,
    FileTextOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

function DiscoveryLandingPage() {
    const { caseId } = useParams();
    const navigate = useNavigate();
    const [caseDisplayName, setCaseDisplayName] = useState('');
    const [loadingCase, setLoadingCase] = useState(true);
    const [error, setError] = useState(null);

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
                        Discovery Tools for: <span style={{ fontSize: '1.05em', fontWeight: 500, color: '#7A4D3B', background: 'rgba(122,77,59,0.07)', borderRadius: '6px', padding: '2px 10px', marginLeft: 6, fontStyle: 'italic', letterSpacing: '0.5px', verticalAlign: 'middle', display: 'inline-block' }}>{loadingCase ? <Spin size="small" /> : caseDisplayName}</span>
                    </Title>
                </Col>
            </Row>

            {error && (
                <Alert message={error} type="warning" showIcon closable />
            )}

            <Paragraph>
                Select whether you want to create discovery to send to the opposing party (propounding) 
                or respond to discovery you've received (responding).
            </Paragraph>

            <Row gutter={[24, 24]}>
                {/* Propounding Discovery Card */}
                <Col xs={24} md={12}>
                    <Card 
                        hoverable
                        style={{ height: '100%', cursor: 'pointer' }}
                        onClick={() => navigate(`/case/${caseId}/propound-discovery`)}
                        cover={
                            <div style={{ 
                                background: '#f5f5f5', 
                                textAlign: 'center', 
                                padding: '40px 0' 
                            }}>
                                <FileTextOutlined style={{ fontSize: 64, color: '#7A4D3B' }} />
                            </div>
                        }
                    >
                        <Card.Meta
                            title="Propounding Discovery" 
                            description="Create discovery requests to send to opposing counsel" 
                        />
                        <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 16 }}>
                            <Paragraph>
                                Generate standardized form interrogatories and other discovery documents
                                to propound on the opposing party.
                            </Paragraph>
                            <Button 
                                type="primary" 
                                block
                                onClick={e => { e.stopPropagation(); navigate(`/case/${caseId}/propound-discovery`); }}
                            >
                                Create Discovery Documents
                            </Button>
                        </Space>
                    </Card>
                </Col>

                {/* Responding to Discovery Card */}
                <Col xs={24} md={12}>
                    <Card 
                        hoverable
                        style={{ height: '100%', cursor: 'pointer' }}
                        onClick={() => navigate(`/case/${caseId}/respond-discovery`)}
                        cover={
                            <div style={{ 
                                background: '#f5f5f5', 
                                textAlign: 'center', 
                                padding: '40px 0' 
                            }}>
                                <FileSearchOutlined style={{ fontSize: 64, color: '#52c41a' }} />
                            </div>
                        }
                    >
                        <Card.Meta 
                            title="Responding to Discovery" 
                            description="Generate responses to discovery you've received" 
                        />
                        <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 16 }}>
                            <Paragraph>
                                Upload discovery documents you've received and generate AI-assisted
                                draft responses based on your case details.
                            </Paragraph>
                            <Button 
                                type="primary" 
                                block
                                onClick={e => { e.stopPropagation(); navigate(`/case/${caseId}/respond-discovery`); }}
                            >
                                Create Discovery Responses
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </Space>
    );
}

export default DiscoveryLandingPage;