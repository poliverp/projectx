// src/pages/CasePage/components/tabs/SuggestionsTab.jsx
import React from 'react';
import { 
  Typography, Card, Space, Button, Collapse, List, Checkbox, 
  Tag, Divider, Popconfirm, Empty,
} from 'antd';
import { 
  FileTextOutlined, CheckCircleTwoTone, CloseOutlined, 
  SearchOutlined 
} from '@ant-design/icons';
import { useSuggestions } from '../../hooks/useSuggestions';
import { formatDate, datesAreEqual } from '../../../../utils/dateUtils';

const { Text } = Typography;

function SuggestionsTab({ caseDetails, refreshCase, caseId }) {
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
  
  // Helper function to check if a value should be filtered out (null, zero, or empty string)
  const shouldFilterValue = (value) => {
    if (value === null || value === undefined) return true;
    if (value === 0 || value === "0") return true;
    if (value === "") return true;
    // For empty objects or arrays
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
    return false;
  };
  
  // Helper function to determine if a field is a date field
  const isDateField = (fieldName) => {
    return fieldName.includes('date');
  };
  
  // Filter the pending suggestions to remove documents with no valid suggestions
  const filteredPendingSuggestions = Object.entries(pendingSuggestions).reduce((acc, [docKey, suggestions]) => {
    // Filter out null, zero, and empty values from this document's suggestions
    const validSuggestions = Object.entries(suggestions).reduce((validFields, [field, value]) => {
      if (!shouldFilterValue(value) && !dismissedSuggestions[docKey]?.[field]) {
        validFields[field] = value;
      }
      return validFields;
    }, {});
    
    // Only include this document if it has at least one valid suggestion
    if (Object.keys(validSuggestions).length > 0) {
      acc[docKey] = validSuggestions;
    }
    return acc;
  }, {});
  
  // Determine if we have pending suggestions after filtering
  const hasSuggestions = Object.keys(filteredPendingSuggestions).length > 0;
  
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card 
        title="AI Analysis Suggestions" 
        type="inner"
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
      >
        {hasSuggestions ? (
          <Collapse 
            accordion
            expandIconPosition="end"
            bordered={false}
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
              >
                <List
                  itemLayout="vertical"
                  dataSource={Object.entries(suggestions)}
                  renderItem={([field, suggestedValue]) => {
                    // Skip rendering if value should be filtered or is dismissed
                    if (shouldFilterValue(suggestedValue) || dismissedSuggestions[docKey]?.[field]) {
                      return null;
                    }
                    
                    // Get the current value for comparison
                    let currentValue = caseDetails?.[field] !== undefined
                                      ? caseDetails[field]
                                      : caseDetailsData?.[field];
                    const currentValueExists = currentValue !== undefined;
                    
                    // Filter out redundant suggestions
                    let isRedundant = false;
                    if (currentValueExists) {
                      if (isDateField(field)) {
                        // Use special date comparison for date fields
                        isRedundant = datesAreEqual(suggestedValue, currentValue);
                      } else if (typeof suggestedValue === 'string' && typeof currentValue === 'string') {
                        // Case-insensitive string comparison for string fields
                        isRedundant = suggestedValue.toLowerCase() === currentValue.toLowerCase();
                      } else {
                        // For objects and other types, try JSON comparison first
                        try {
                          isRedundant = JSON.stringify(suggestedValue) === JSON.stringify(currentValue);
                        } catch (e) { 
                          // Fallback to direct comparison if JSON fails
                          isRedundant = suggestedValue === currentValue; 
                        }
                      }
                    }
                    
                    // Skip redundant values
                    if (isRedundant) { 
                      return null; 
                    }
                    
                    return (
                      <List.Item key={field}>
                        <Card
                          size="small"
                          bordered={false}
                          style={{ background: '#f9f9f9', marginBottom: '8px' }}
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
                              <Text strong>{formatFieldName(field)}:</Text>
                              <Divider type="vertical" />
                              <Tag color="blue">Suggestion</Tag>
                              
                              <div style={{ marginTop: '8px' }}>
                                <Text code style={{ 
                                  whiteSpace: 'pre-wrap', 
                                  display: 'block', 
                                  background: '#e6f7ff', 
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  border: '1px solid #91d5ff' 
                                }}>
                                  {isDateField(field) ? formatDate(suggestedValue) : JSON.stringify(suggestedValue, null, 2)}
                                </Text>
                              </div>
                              
                              {currentValueExists ? (
                                <div style={{ marginTop: '8px' }}>
                                  <Text type="secondary">Current Value:</Text>
                                  <Text code type="secondary" style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    display: 'block', 
                                    background: '#fafafa', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    border: '1px solid #d9d9d9' 
                                  }}>
                                    {isDateField(field) ? formatDate(currentValue) : JSON.stringify(currentValue, null, 2)}
                                  </Text>
                                </div>
                              ) : (
                                <div style={{ marginTop: '8px' }}>
                                  <Text type="secondary">Current: Not Set</Text>
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
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description={
              <Space direction="vertical" align="center">
                <Text>No pending suggestions found</Text>
                {lastAnalyzedDocId && (
                  <Text type="secondary">Last analyzed document ID: {lastAnalyzedDocId}</Text>
                )}
                <Button type="primary" icon={<SearchOutlined />} onClick={() => {}}>
                  Analyze Documents
                </Button>
              </Space>
            }
          />
        )}
      </Card>
    </Space>
  );
}

export default SuggestionsTab;