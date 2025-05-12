// frontend/src/pages/PropoundingDiscoveryPage.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  SearchOutlined,
  CloseOutlined
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
  const [languageCardHeight, setLanguageCardHeight] = useState(0);
  const languageCardRef = useRef(null);
  
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
  
  useEffect(() => {
    if (languageCardRef.current) {
      setLanguageCardHeight(languageCardRef.current.offsetHeight + 24); // 24px for Space gap (size='large')
    }
  }, [language, loadingCase]);
  
  return (
    <Space direction="vertical" style={{ width: '100%', padding: '20px' }} size="large">
      {/* Page Header */}
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            Form Interrogatories for:
            <span style={{ fontSize: '1.05em', fontWeight: 500, color: '#7A4D3B', background: 'rgba(122,77,59,0.07)', borderRadius: '6px', padding: '2px 10px', marginLeft: 6, fontStyle: 'italic', letterSpacing: '0.5px', verticalAlign: 'middle', display: 'inline-block' }}>
              {loadingCase ? <Spin size="small" /> : caseDisplayName}
            </span>
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
        <Row gutter={32}>
          {/* Main Question Selection Area */}
          <Col xs={24} md={16}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Questions Selection */}
              <Card 
                type="inner" 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>Select Questions</span>
                      <Radio.Group 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{ marginLeft: 16 }}
                      >
                        <Radio.Button value="english">English</Radio.Button>
                        <Radio.Button value="spanish">Spanish</Radio.Button>
                      </Radio.Group>
                    </span>
                    <Space>
                      <Button 
                        onClick={handleClearSelections}
                        disabled={selectedQuestions.length === 0}
                        type="default"
                      >
                        Clear All
                      </Button>
                      <Text strong>
                        {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                      </Text>
                    </Space>
                  </div>
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
                                type="default" 
                                onClick={() => handleSelectCategory(category)}
                                size="small"
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
            </Space>
          </Col>
          {/* Running Tab of Selected Questions */}
          <Col xs={24} md={8}>
            <Card
              type="inner"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Selected Questions</span>
                  <Button
                    type={selectedQuestions.length === 0 ? 'default' : 'primary'}
                    style={{
                      backgroundColor: selectedQuestions.length === 0 ? '#d9d9d9' : '#8B4513',
                      borderColor: selectedQuestions.length === 0 ? '#d9d9d9' : '#8B4513',
                      color: selectedQuestions.length === 0 ? '#888' : '#fff',
                      fontWeight: 600,
                      fontStyle: 'normal',
                      borderRadius: 3,
                      boxShadow: selectedQuestions.length === 0 ? 'none' : '0 2px 8px rgba(139,69,19,0.10)',
                      letterSpacing: '0.5px',
                      cursor: selectedQuestions.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      padding: '0 8px',
                      minWidth: 'auto',
                      height: 24,
                      lineHeight: '22px',
                      fontSize: 13,
                    }}
                    onClick={handleGenerateDocument}
                    disabled={selectedQuestions.length === 0 || generating}
                    loading={generating}
                    size="small"
                  >
                    Generate
                  </Button>
                </div>
              }
              style={{ minHeight: 300, maxHeight: 600, overflowY: 'auto' }}
            >
              {selectedQuestions.length === 0 ? (
                <Text type="secondary">No questions selected yet.</Text>
              ) : (
                <List
                  dataSource={questions.filter(q => selectedQuestions.includes(q.id))}
                  renderItem={q => (
                    <List.Item style={{ padding: '4px 0', display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
                        <div>
                          <Text strong style={{ marginRight: 6 }}>{q.number}</Text>
                          <Text>{q.text}</Text>
                        </div>
                        <Checkbox
                          checked={true}
                          style={{ marginLeft: 8, marginBottom: 0, transform: 'scale(0.85)' }}
                          onChange={() => setSelectedQuestions(selectedQuestions.filter(id => id !== q.id))}
                        />
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  );
}

export default PropoundingDiscoveryPage;