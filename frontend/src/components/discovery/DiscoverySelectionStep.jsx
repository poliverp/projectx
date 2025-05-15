// frontend/src/components/DiscoverySelectionStep.jsx
import React, { useState } from 'react';
import {
  Card,
  Typography,
  Radio,
  Button,
  Spin,
  Alert,
  Space,
  List,
  message,
  Divider
} from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const DiscoverySelectionStep = ({ questions = [], sessionKey, discoveryType, onBack, onSubmit, caseId }) => {
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize selections with default value for each question
  React.useEffect(() => {
    const initialSelections = {};
    questions.forEach(q => {
      initialSelections[q.id] = 'no_text';
    });
    setSelections(initialSelections);
  }, [questions]);

  const handleSelectionChange = (questionId, value) => {
    setSelections(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await onSubmit({
        session_key: sessionKey,
        selections: selections,
        discovery_type: discoveryType
      });
      message.success('Document generated successfully');
    } catch (err) {
      console.error('Error generating document:', err);
      setError(err.message || 'Failed to generate document');
      message.error('Failed to generate document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading} tip="Generating document...">
      <Card 
        title={
          <Space>
            <FileTextOutlined />
            <span>Review Requests for Production</span>
          </Space>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
        }
      >
        <Paragraph>
          Select an additional response for each request before generating the document.
        </Paragraph>

        {error && (
          <Alert
            message="Error Generating Document"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <List
          dataSource={questions}
          renderItem={question => (
            <List.Item>
              <Card 
                size="small" 
                title={`Request ${question.number}`}
                style={{ width: '100%' }}
              >
                <Paragraph>{question.text}</Paragraph>
                <Divider style={{ margin: '12px 0' }} />
                <Radio.Group 
                  value={selections[question.id]} 
                  onChange={e => handleSelectionChange(question.id, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="will_provide">Plaintiff will produce responsive documents.</Radio>
                    <Radio value="none_found">Plaintiff has no responsive documents to produce.</Radio>
                    <Radio value="no_text">No additional text</Radio>
                  </Space>
                </Radio.Group>
              </Card>
            </List.Item>
          )}
        />

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Generate Document
          </Button>
        </div>
      </Card>
    </Spin>
  );
};

export default DiscoverySelectionStep;