import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
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
                {/* Search Bar */}
                <div style={{ marginBottom: 16 }}>
                  <Search
                    placeholder="Search questions..."
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Questions List */}
                <div style={{ 
                  maxHeight: 'calc(100vh - 400px)', 
                  overflowY: 'auto',
                  paddingRight: 8
                }}>
                  {Object.entries(groupedQuestions).map(([category, questions]) => (
                    <div key={category} style={{ marginBottom: 24 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: 8,
                        padding: '8px 0',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <Checkbox
                          checked={questions.every(q => selectedQuestions.includes(q.id))}
                          indeterminate={
                            questions.some(q => selectedQuestions.includes(q.id)) &&
                            !questions.every(q => selectedQuestions.includes(q.id))
                          }
                          onChange={() => handleSelectCategory(category)}
                        >
                          <Text strong>{category}</Text>
                        </Checkbox>
                      </div>
                      <List
                        dataSource={questions}
                        renderItem={question => (
                          <List.Item>
                            <Checkbox
                              checked={selectedQuestions.includes(question.id)}
                              onChange={() => handleCheckboxChange(question.id)}
                            >
                              <div>
                                <Text strong>{question.number}.</Text>
                                <Text style={{ marginLeft: 8 }}>{question.text}</Text>
                              </div>
                            </Checkbox>
                          </List.Item>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </Space>
          </Col>

          {/* Right Sidebar */}
          <Col xs={24} md={8}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Language Selection Card */}
              <Card 
                ref={languageCardRef}
                title="Document Settings"
                type="inner"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong>Language</Text>
                    <Radio.Group 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{ marginTop: 8, display: 'block' }}
                    >
                      <Radio.Button value="english" style={{ width: '100%', textAlign: 'center', marginBottom: 8 }}>
                        English
                      </Radio.Button>
                      <Radio.Button value="spanish" style={{ width: '100%', textAlign: 'center' }}>
                        Spanish
                      </Radio.Button>
                    </Radio.Group>
                  </div>
                </Space>
              </Card>

              {/* Generate Button Card */}
              <Card type="inner">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleGenerateDocument}
                    loading={generating}
                    disabled={selectedQuestions.length === 0}
                    block
                  >
                    Generate Document
                  </Button>
                  <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                    {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                  </Text>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </Card>
    </Space>
  );
}

export default PropoundingDiscoveryPage; 