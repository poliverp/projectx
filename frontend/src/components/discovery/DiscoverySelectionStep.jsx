// frontend/src/components/DiscoverySelectionStep.jsx
import React, { useState, useEffect } from 'react';
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
  Divider,
  Select
} from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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
  ],
  'requests_for_admission': [
    { value: 'admit', label: 'Admitted.' },
    { value: 'deny', label: 'Denied.' },
    { value: 'cannot_admit_or_deny', label: 'Defendant cannot truthfully admit or deny this request because [reason].' },
    { value: 'no_text', label: 'No additional text' }
  ]
};

// Display names for different discovery types
const DISCOVERY_DISPLAY_NAMES = {
  'requests_for_production': 'Requests for Production',
  'special_interrogatories': 'Special Interrogatories',
  'requests_for_admission': 'Requests for Admission'
};

const DiscoverySelectionStep = ({ questions = [], sessionKey, discoveryType, onBack, onSubmit, caseId }) => {
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [defendants, setDefendants] = useState([]);
  const [selectedDefendant, setSelectedDefendant] = useState('');

  // Fetch defendants when component mounts
  useEffect(() => {
    const fetchDefendants = async () => {
      try {
        const response = await api.getCase(caseId);
        const caseData = response.data;
        if (caseData.defendants) {
          const defendantsList = Object.entries(caseData.defendants).map(([id, info]) => ({
            id,
            name: info.name
          }));
          setDefendants(defendantsList);
          if (defendantsList.length > 0) {
            setSelectedDefendant(defendantsList[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching defendants:', err);
        setError('Failed to load defendants');
      }
    };
    fetchDefendants();
  }, [caseId]);

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
    if (!selectedDefendant) {
      message.error('Please select a defendant');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        session_key: sessionKey,
        selections: selections,
        defendant_id: selectedDefendant,
        discovery_type: discoveryType
      });
    } catch (err) {
      setError(err.message || 'Failed to generate document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
            >
              Back
            </Button>
            <Title level={4} style={{ margin: 0 }}>Review {displayName}</Title>
            <div style={{ width: 200 }}>
              <Select
                value={selectedDefendant}
                onChange={setSelectedDefendant}
                style={{ width: '100%' }}
                placeholder="Select defendant"
              >
                {defendants.map(def => (
                  <Option key={def.id} value={def.id}>{def.name}</Option>
                ))}
              </Select>
            </div>
          </div>

          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
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
        </Space>
      </Card>
    </Spin>
  );
};

export default DiscoverySelectionStep;