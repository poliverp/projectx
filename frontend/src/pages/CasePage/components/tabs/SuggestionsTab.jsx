// Updated SuggestionsTab.jsx to fix the infinite loop
import React, { useEffect, useState, useRef } from 'react';
import { 
  Typography, Card, Space, Button, Collapse, List, Checkbox, 
  Tag, Divider, Popconfirm, Empty,
} from 'antd';
import { 
  FileTextOutlined, CheckCircleTwoTone, CloseOutlined, 
  SearchOutlined, BulbOutlined
} from '@ant-design/icons';
import { useSuggestions } from '../../hooks/useSuggestions';
import { formatDate, datesAreEqual } from '../../../../utils/dateUtils';

const { Text } = Typography;

function SuggestionsTab({ caseDetails, refreshCase, caseId, autoExpand = false, onAnalyzeDocuments }) {
  const [activeCollapseKeys, setActiveCollapseKeys] = useState([]);
  const processedAutoExpand = useRef(false);
  
  const {
    acceptedSuggestions,
    dismissedSuggestions,
    isApplying,
    isClearing,
    applySuccess,
    handleCheckboxChange,
    handleDismissLocally,
    handleApplyChanges,
    handleClearSuggestions
  } = useSuggestions(caseDetails, refreshCase);
  
  if (!caseDetails) return null;
  
  const caseDetailsData = caseDetails.case_details || {};
  const pendingSuggestions = caseDetailsData.pending_suggestions || {};
  const lastAnalyzedDocId = caseDetailsData.last_analyzed_doc_id;
  
  // Helper function to format field names
  const formatFieldName = (fieldName) => {
    if (!fieldName) return '';
    return fieldName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };
  
  // Helper function to check if a value should be filtered out
  const shouldFilterValue = (value) => {
    if (value === null || value === undefined) return true;
    if (value === 0 || value === "0" || value === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  };
  
  // Helper function to determine if a field is a date field
  const isDateField = (fieldName) => {
    return fieldName.includes('date');
  };
  
  // Filter the pending suggestions
  const filteredPendingSuggestions = Object.entries(pendingSuggestions).reduce((acc, [docKey, suggestions]) => {
    const validSuggestions = Object.entries(suggestions).reduce((validFields, [field, value]) => {
      if (!shouldFilterValue(value) && !dismissedSuggestions[docKey]?.[field]) {
        validFields[field] = value;
      }
      return validFields;
    }, {});
    
    if (Object.keys(validSuggestions).length > 0) {
      acc[docKey] = validSuggestions;
    }
    return acc;
  }, {});
  
  const hasSuggestions = Object.keys(filteredPendingSuggestions).length > 0;
  
  // Auto-expand effect
  useEffect(() => {
    if (autoExpand && hasSuggestions && !processedAutoExpand.current) {
      const suggestionsKeys = Object.keys(filteredPendingSuggestions);
      if (suggestionsKeys.length > 0) {
        setActiveCollapseKeys([suggestionsKeys[0]]);
        processedAutoExpand.current = true;
      }
    }
    
    if (!autoExpand) {
      processedAutoExpand.current = false;
    }
  }, [autoExpand, hasSuggestions]);
  
  const handleCollapseChange = (key) => {
    setActiveCollapseKeys(Array.isArray(key) ? key : [key]);
  };
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card 
        title={
          <Space>
            <BulbOutlined />
            AI Analysis Suggestions
          </Space>
        }
        extra={
          <Space>
            {hasSuggestions && (
              <Popconfirm
                title="Clear all suggestions?"
                description="Are you sure? This cannot be undone."
                onConfirm={handleClearSuggestions}
                okText="Yes, Clear All"
                cancelText="No"
                okButtonProps={{ danger: true }}
                disabled={isApplying || isClearing}
              >
                <Button
                  danger
                  size="small"
                  loading={isClearing}
                  disabled={isApplying || isClearing}
                >
                  Clear All Suggestions
                </Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              size="small"
              onClick={handleApplyChanges}
              loading={isApplying}
              disabled={Object.keys(acceptedSuggestions).length === 0 || isApplying || isClearing}
              icon={applySuccess ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : null}
            >
              {isApplying ? 'Applying...' : (applySuccess ? 'Applied!' : 'Apply Selected')}
            </Button>
          </Space>
        }
        style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
        bodyStyle={{
          flex: 1,
          overflow: 'auto',
          padding: '0'
        }}
      >
        {hasSuggestions ? (
          <Collapse 
            accordion
            expandIconPosition="end"
            activeKey={activeCollapseKeys}
            onChange={handleCollapseChange}
            style={{ 
              background: 'transparent',
              border: 'none'
            }}
          >
            {Object.entries(filteredPendingSuggestions).map(([docKey, suggestions]) => (
              <Collapse.Panel 
                header={
                  <Space>
                    <FileTextOutlined />
                    <span>Suggestions from Document: {docKey}</span>
                  </Space>
                } 
                key={docKey}
                style={{
                  marginBottom: '8px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #f0f0f0'
                }}
              >
                <List
                  itemLayout="vertical"
                  dataSource={Object.entries(suggestions)}
                  renderItem={([field, suggestedValue]) => {
                    if (shouldFilterValue(suggestedValue) || dismissedSuggestions[docKey]?.[field]) {
                      return null;
                    }
                    
                    const currentValue = caseDetails?.[field] !== undefined
                      ? caseDetails[field]
                      : caseDetailsData?.[field];
                    const currentValueExists = currentValue !== undefined;
                    
                    return (
                      <List.Item key={field}>
                        <Card
                          size="small"
                          bordered={false}
                          style={{ 
                            background: '#fafafa',
                            marginBottom: '8px',
                            borderRadius: '6px'
                          }}
                        >
                          <Space align="start" style={{ width: '100%' }}>
                            <Checkbox
                              style={{ paddingTop: '4px' }}
                              onChange={(e) => handleCheckboxChange(docKey, field, suggestedValue, e.target.checked)}
                              checked={acceptedSuggestions[docKey]?.[field] !== undefined}
                            />
                            <Popconfirm
                              title="Dismiss suggestion?"
                              onConfirm={() => handleDismissLocally(docKey, field)}
                              okText="Dismiss"
                              cancelText="Cancel"
                              placement="top"
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<CloseOutlined />}
                                style={{ marginLeft: '8px', padding: '0 4px' }}
                              />
                            </Popconfirm>
                            
                            <div style={{ flexGrow: 1 }}>
                              <Text strong>{formatFieldName(field)}</Text>
                              <Divider type="vertical" />
                              <Tag color="blue">Suggestion</Tag>
                              
                              <div style={{ marginTop: '8px' }}>
                                <Text code style={{ 
                                  whiteSpace: 'pre-wrap', 
                                  display: 'block', 
                                  background: '#e6f7ff', 
                                  padding: '8px 12px', 
                                  borderRadius: '6px', 
                                  border: '1px solid #91d5ff' 
                                }}>
                                  {isDateField(field) ? formatDate(suggestedValue) : JSON.stringify(suggestedValue, null, 2)}
                                </Text>
                              </div>
                              
                              {currentValueExists && (
                                <div style={{ marginTop: '8px' }}>
                                  <Text type="secondary">Current Value:</Text>
                                  <Text code type="secondary" style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    display: 'block', 
                                    background: '#f5f5f5', 
                                    padding: '8px 12px', 
                                    marginTop: '4px',
                                    borderRadius: '6px', 
                                    border: '1px solid #d9d9d9' 
                                  }}>
                                    {isDateField(field) ? formatDate(currentValue) : JSON.stringify(currentValue, null, 2)}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Space>
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              </Collapse.Panel>
            ))}
          </Collapse>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            height: '100%',
            background: '#fafafa',
            borderRadius: '8px'
          }}>
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={
                <Space direction="vertical" align="center" size="large">
                  <Text>No pending suggestions found</Text>
                  {lastAnalyzedDocId && (
                    <Text type="secondary">Last analyzed document ID: {lastAnalyzedDocId}</Text>
                  )}
                  <Button type="primary" icon={<SearchOutlined />} onClick={onAnalyzeDocuments}>
                    Analyze Documents
                  </Button>
                </Space>
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default SuggestionsTab;