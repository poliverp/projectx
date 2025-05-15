import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Spin,
  Alert,
  Space,
  List,
  message,
  Divider,
  Input
} from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, SaveOutlined } from '@ant-design/icons';
import { formatFormInterrogatoryResponses } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const FormInterrogatoryResponse = ({ caseId, questions, onBack, onSubmit }) => {
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // Initialize responses with empty strings
    const initialResponses = {};
    questions.forEach(q => {
      initialResponses[q.id] = '';
    });
    setResponses(initialResponses);
  }, [questions]);

  const validateResponse = (questionId, response) => {
    const errors = {};
    
    // Check for empty responses
    if (!response.trim()) {
      errors[questionId] = 'Response is required';
    }
    
    // Check for minimum length
    if (response.trim().length < 10) {
      errors[questionId] = 'Response is too short';
    }
    
    // Check for maximum length
    if (response.trim().length > 5000) {
      errors[questionId] = 'Response is too long';
    }
    
    return errors;
  };

  const validateAllResponses = () => {
    const errors = {};
    let hasErrors = false;
    
    Object.entries(responses).forEach(([questionId, response]) => {
      const questionErrors = validateResponse(questionId, response);
      if (Object.keys(questionErrors).length > 0) {
        errors[questionId] = questionErrors[questionId];
        hasErrors = true;
      }
    });
    
    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[questionId]) {
      setValidationErrors(prev => ({
        ...prev,
        [questionId]: null
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Validate all responses
      if (!validateAllResponses()) {
        message.error('Please fix the validation errors before submitting');
        return;
      }
      
      setLoading(true);
      
      // Format responses using AI
      const formattedData = await formatFormInterrogatoryResponses(caseId, responses);
      
      if (!formattedData || !formattedData.responses) {
        throw new Error('Invalid response format from server');
      }
      
      // Call parent handler with formatted responses
      onSubmit(formattedData.responses);
      
      message.success('Responses formatted successfully');
    } catch (err) {
      console.error('Error formatting responses:', err);
      setError(err.message || 'Failed to format responses');
      message.error('Failed to format responses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spin size="large" />
        <div style={{ marginTop: '1rem' }}>
          <Text>Formatting responses...</Text>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
          >
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>Form Interrogatory Responses</Title>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            disabled={loading}
          >
            Format & Submit
          </Button>
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
              <Card style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Question {question.id}:</Text>
                  <Text>{question.text}</Text>
                  <TextArea
                    value={responses[question.id] || ''}
                    onChange={e => handleResponseChange(question.id, e.target.value)}
                    placeholder="Enter your response here..."
                    autoSize={{ minRows: 3, maxRows: 10 }}
                    status={validationErrors[question.id] ? 'error' : ''}
                  />
                  {validationErrors[question.id] && (
                    <Text type="danger">{validationErrors[question.id]}</Text>
                  )}
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};

export default FormInterrogatoryResponse; 