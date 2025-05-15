// src/components/DiscoveryResponseSelection.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Button, Card, Radio, Space, Typography, Spin, message, Alert } from 'antd';

const { Title, Text, Paragraph } = Typography;

const DiscoveryResponseSelection = ({ caseId, formData, onBack, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [selections, setSelections] = useState({});
  const [sessionKey, setSessionKey] = useState('');
  const [discoveryType, setDiscoveryType] = useState('');
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // Parse the document when component mounts
  useEffect(() => {
    parseDocument();
  }, []);

  // Parse the uploaded document
  const parseDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.parseDiscoveryDocument(caseId, formData);
      
      // Initialize selection state with default 'no_text' option for each question
      const initialSelections = {};
      result.questions.forEach(q => {
        initialSelections[q.id] = 'no_text';
      });
      
      setQuestions(result.questions);
      setSelections(initialSelections);
      setSessionKey(result.session_key);
      setDiscoveryType(result.discovery_type);
      setLoading(false);
    } catch (err) {
      console.error('Error parsing document:', err);
      setError(err.message || 'Failed to parse document');
      setLoading(false);
    }
  };

  // Handle selection change for a question
  const handleSelectionChange = (questionId, value) => {
    setSelections(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Generate the final document with selections
  const handleGenerateDocument = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      await api.generateDiscoveryDocument(caseId, {
        session_key: sessionKey,
        selections: selections,
        discovery_type: discoveryType
      });
      
      message.success('Document generated successfully!');
      if (onComplete) onComplete();
      setGenerating(false);
    } catch (err) {
      console.error('Error generating document:', err);
      setError(err.message || 'Failed to generate document');
      setGenerating(false);
    }
  };

  // Handle back button click
  const handleBack = () => {
    if (onBack) onBack();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }}>Parsing document...</Paragraph>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Processing Document"
        description={error}
        type="error"
        action={
          <Button onClick={handleBack} type="primary">
            Go Back
          </Button>
        }
      />
    );
  }

  return (
    <div className="discovery-selection-container">
      <Title level={3}>Review Requests for Production</Title>
      <Paragraph>
        Select an additional response for each request before generating the document.
      </Paragraph>

      {questions.map((question, index) => (
        <Card key={question.id} style={{ marginBottom: 16 }} title={`Request ${question.number}`}>
          <Paragraph>{question.text}</Paragraph>
          
          <Radio.Group 
            value={selections[question.id]} 
            onChange={(e) => handleSelectionChange(question.id, e.target.value)}
          >
            <Space direction="vertical">
              <Radio value="will_provide">Plaintiff will produce responsive documents.</Radio>
              <Radio value="none_found">Plaintiff has no responsive documents to produce.</Radio>
              <Radio value="no_text">No additional text</Radio>
            </Space>
          </Radio.Group>
        </Card>
      ))}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleBack}>
          Back
        </Button>
        <Button 
          type="primary" 
          onClick={handleGenerateDocument}
          loading={generating}
          disabled={questions.length === 0}
        >
          Generate Document
        </Button>
      </div>
    </div>
  );
};

export default DiscoveryResponseSelection;