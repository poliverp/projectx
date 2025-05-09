// frontend/src/pages/PropoundingDiscoveryPage.jsx
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
  Radio,
  Spin,
  Alert,
  Tabs,
  Checkbox,
  Input,
  List,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  GlobalOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

function PropoundingDiscoveryPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [caseDisplayName, setCaseDisplayName] = useState('');
  const [loadingCase, setLoadingCase] = useState(true);
  const [language, setLanguage] = useState('english');
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // Fetch case display name
  useEffect(() => {
    setLoadingCase(true);
    api.getCase(caseId)
      .then(response => {
        setCaseDisplayName(response.data?.display_name || `Case ${caseId}`);
      })
      .catch(err => {
        console.error("Error fetching case display name:", err);
        setCaseDisplayName(`Case ${caseId}`);
        setError("Could not load case details. Using default case name.");
      })
      .finally(() => {
        setLoadingCase(false);
      });
  }, [caseId]);
  
  // Fetch questions when language changes
  useEffect(() => {
    setLoadingQuestions(true);
    api.getInterrogatoryQuestions(language)
      .then(response => {
        setQuestions(response.data);
        setFilteredQuestions(response.data);
      })
      .catch(err => {
        console.error("Error fetching interrogatory questions:", err);
        setError("Failed to load interrogatory questions.");
      })
      .finally(() => {
        setLoadingQuestions(false);
      });
  }, [language]);
  
  // Filter questions when search text changes
  useEffect(() => {
    if (searchText) {
      const filtered = questions.filter(q => 
        q.text.toLowerCase().includes(searchText.toLowerCase()) ||
        q.number.includes(searchText)
      );
      setFilteredQuestions(filtered);
    } else {
      setFilteredQuestions(questions);
    }
  }, [searchText, questions]);
  
  // Handle checkbox changes
  const handleCheckboxChange = (questionId) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };
  
  // Handle "Select All" for a category
  const handleSelectCategory = (category) => {
    const categoryQuestionIds = questions
      .filter(q => q.category === category)
      .map(q => q.id);
    
    // Check if all questions in this category are already selected
    const allSelected = categoryQuestionIds.every(id => selectedQuestions.includes(id));
    
    if (allSelected) {
      // Deselect all questions in this category
      setSelectedQuestions(prev => 
        prev.filter(id => !categoryQuestionIds.includes(id))
      );
    } else {
      // Select all questions in this category
      setSelectedQuestions(prev => {
        const newSelection = [...prev];
        categoryQuestionIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };
  
  // Handle clear all selections
  const handleClearSelections = () => {
    setSelectedQuestions([]);
    message.success('All selections cleared');
  };
  
  // Handle document generation
  const handleGenerateDocument = () => {
    if (selectedQuestions.length === 0) {
      message.warning('Please select at least one question');
      return;
    }
    
    setGenerating(true);
    api.generateInterrogatoryDocument(caseId, selectedQuestions, language)
      .then(response => {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `form_interrogatories_${language}_${caseId}.docx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        message.success('Document generated successfully');
      })
      .catch(err => {
        console.error("Error generating document:", err);
        setError("Failed to generate document");
        message.error('Failed to generate document');
      })
      .finally(() => {
        setGenerating(false);
      });
  };
  
  // Group questions by category
  const groupedQuestions = {};
  filteredQuestions.forEach(q => {
    if (!groupedQuestions[q.category]) {
      groupedQuestions[q.category] = [];
    }
    groupedQuestions[q.category].push(q);
  });
  
  return (
    <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
      {/* Page Header */}
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2}>
            Form Interrogatories for {loadingCase ? <Spin size="small" /> : <Text strong>{caseDisplayName}</Text>}
          </Title>
        </Col>
        <Col>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(`/case/${caseId}/discovery`)}
          >
            Back to Discovery Tools
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert message={error} type="warning" showIcon closable />
      )}

      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Title level={4}>Select Form Interrogatory Questions</Title>
          
          {/* Language Selection */}
          <Card type="inner" title={
            <Space>
              <GlobalOutlined />
              <span>Language</span>
            </Space>
          }>
            <Radio.Group 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <Radio.Button value="english">English</Radio.Button>
              <Radio.Button value="spanish">Spanish</Radio.Button>
            </Radio.Group>
          </Card>
          
          {/* Questions Selection */}
          <Card 
            type="inner" 
            title="Select Questions" 
            extra={
              <Space>
                <Button 
                  onClick={handleClearSelections}
                  disabled={selectedQuestions.length === 0}
                >
                  Clear All
                </Button>
                <Text strong>
                  {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                </Text>
              </Space>
            }
          >
            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <Text style={{ display: 'block', marginTop: '16px' }}>Loading questions...</Text>
              </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Search
                  placeholder="Search by question number or text"
                  allowClear
                  enterButton
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={setSearchText}
                  style={{ marginBottom: '16px' }}
                />
                
                {Object.keys(groupedQuestions).length === 0 ? (
                  <Alert 
                    message="No questions match your search" 
                    type="info" 
                    showIcon 
                  />
                ) : (
                  <Tabs defaultActiveKey="0">
                    {Object.entries(groupedQuestions).map(([category, categoryQuestions], index) => (
                      <Tabs.TabPane tab={category} key={index}>
                        <div style={{ marginBottom: '16px' }}>
                          <Button 
                            type="link" 
                            onClick={() => handleSelectCategory(category)}
                          >
                            {categoryQuestions.every(q => selectedQuestions.includes(q.id)) 
                              ? 'Deselect All' 
                              : 'Select All'}
                          </Button>
                        </div>
                        
                        <List
                          dataSource={categoryQuestions}
                          renderItem={question => (
                            <List.Item>
                              <Checkbox
                                checked={selectedQuestions.includes(question.id)}
                                onChange={() => handleCheckboxChange(question.id)}
                              >
                                <Space direction="vertical">
                                  <Text strong>{question.number}</Text>
                                  <Text>{question.text}</Text>
                                </Space>
                              </Checkbox>
                            </List.Item>
                          )}
                        />
                      </Tabs.TabPane>
                    ))}
                  </Tabs>
                )}
              </Space>
            )}
          </Card>
          
          {/* Generate Button */}
          <Card 
            type="inner" 
            title="Generate Document" 
            style={{ textAlign: 'center' }}
          >
            <Space direction="vertical" size="large">
              <Paragraph>
                Generate a Word document with only the selected interrogatory questions.
                The document will include space for answers and case information.
              </Paragraph>
              
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="large"
                onClick={handleGenerateDocument}
                loading={generating}
                disabled={selectedQuestions.length === 0 || generating}
              >
                Generate Form Interrogatories Document
              </Button>
            </Space>
          </Card>
        </Space>
      </Card>
    </Space>
  );
}

export default PropoundingDiscoveryPage;