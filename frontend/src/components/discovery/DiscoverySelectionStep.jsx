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

// Response options for different discovery types
const RESPONSE_OPTIONS = {
  'requests_for_production': [
    { value: 'will_provide', label: 'Plaintiff will produce responsive documents.' },
    { value: 'none_found', label: 'Plaintiff has no responsive documents to produce.' },
    { value: 'no_text', label: 'No additional text' }
  ],
  'special_interrogatories': [
    { value: 'will_answer', label: 'Plaintiff will answer this interrogatory.' },
    { value: 'cannot_answer', label: 'Plaintiff cannot answer this interrogatory at this time.' },
    { value: 'no_text', label: 'No additional text' }
  ]
};

// Display names for different discovery types
const DISCOVERY_DISPLAY_NAMES = {
  'requests_for_production': 'Requests for Production',
  'special_interrogatories': 'Special Interrogatories'
};

const DiscoverySelectionStep = ({ questions = [], sessionKey, discoveryType, onBack, onSubmit, caseId }) => {
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get response options for current discovery type
  const responseOptions = RESPONSE_OPTIONS[discoveryType] || RESPONSE_OPTIONS['requests_for_production'];
  const displayName = DISCOVERY_DISPLAY_NAMES[discoveryType] || 'Discovery Requests';

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
            <span>Review {displayName}</span>
          </Space>
        }
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
        }
      >
        <Paragraph>
          Select an additional response for each {displayName.toLowerCase()} before generating the document.
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
                title={`${displayName.split(' ')[0]} ${question.number}`}
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
                    {responseOptions.map(option => (
                      <Radio key={option.value} value={option.value}>
                        {option.label}
                      </Radio>
                    ))}
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