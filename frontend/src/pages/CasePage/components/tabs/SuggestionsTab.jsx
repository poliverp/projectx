// Updated SuggestionsTab.jsx to fix the infinite loop
import React, { useEffect, useState, useRef } from 'react';
import { 
  Typography, Card, Space, Button, Collapse, List, Checkbox, 
  Tag, Divider, Popconfirm, Empty,
} from 'antd';
import { 
  FileTextOutlined, CheckCircleTwoTone, CloseOutlined, 
  SearchOutlined, BulbOutlined, LockOutlined, UnlockOutlined
} from '@ant-design/icons';
import { useSuggestions } from '../../hooks/useSuggestions';
import { formatDate, datesAreEqual } from '../../../../utils/dateUtils';
import { useParams } from 'react-router-dom';

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
    handleClearSuggestions,
    lockedFields,
    toggleFieldLock
  } = useSuggestions(caseDetails, refreshCase);
  
  // Early return after hooks are called
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
  
  // Helper function to get document name from docKey
  const getDocumentName = (docKey) => {
    if (!caseDetails?.documents) return docKey;
    // Extract the numeric ID from docKey (e.g., "doc_34" -> 34)
    const docId = parseInt(docKey.split('_')[1]);
    const doc = caseDetails.documents.find(d => d.id === docId);
    return doc ? doc.file_name : docKey;
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
      // Skip if value should be filtered or is dismissed
      if (shouldFilterValue(value) || dismissedSuggestions[docKey]?.[field]) {
        return validFields;
      }

      // Check for redundancy with current case values
      const currentValue = caseDetails?.[field] !== undefined
        ? caseDetails[field]
        : caseDetailsData?.[field];

      if (currentValue !== undefined) {
        // For date fields
        if (isDateField(field)) {
          if (datesAreEqual(currentValue, value)) {
            console.log(`Filtering out redundant date suggestion for ${field}`);
            return validFields;
          }
        }
        // For string values
        else if (typeof value === 'string' && typeof currentValue === 'string') {
          const normalizedCurrent = currentValue.toLowerCase().trim()
            .replace(/\s+/g, ' ')
            .replace(/[.,]/g, '')
            .replace(/\b(the|a|an)\b/gi, '');
          const normalizedSuggested = value.toLowerCase().trim()
            .replace(/\s+/g, ' ')
            .replace(/[.,]/g, '')
            .replace(/\b(the|a|an)\b/gi, '');

          if (normalizedCurrent === normalizedSuggested) {
            console.log(`Filtering out redundant string suggestion for ${field}`);
            return validFields;
          }

          if (normalizedCurrent.includes(normalizedSuggested) || 
              normalizedSuggested.includes(normalizedCurrent)) {
            console.log(`Filtering out similar string suggestion for ${field}`);
            return validFields;
          }
        }
        // For other types
        else {
          try {
            const normalizedCurrent = JSON.stringify(currentValue).toLowerCase();
            const normalizedSuggested = JSON.stringify(value).toLowerCase();
            if (normalizedCurrent === normalizedSuggested) {
              console.log(`Filtering out redundant object suggestion for ${field}`);
              return validFields;
            }
          } catch (e) {
            if (value === currentValue) {
              console.log(`Filtering out redundant value suggestion for ${field}`);
              return validFields;
            }
          }
        }
      }

      // If we get here, this is a valid suggestion
      validFields[field] = value;
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
        style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
        bodyStyle={{
          flex: 1,
          overflow: 'hidden',
          padding: '0',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {hasSuggestions ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ 
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#fff',
              padding: '16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Space>
                <BulbOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                <Text strong style={{ fontSize: '16px' }}>AI Analysis Suggestions</Text>
              </Space>
              <Space>
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
              </Space>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
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
                        <span>{getDocumentName(docKey)}</span>
                        <Tag color="blue">{Object.keys(suggestions).length} suggestions</Tag>
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
                        const isLocked = lockedFields.includes(field);
                        
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
                                  onChange={(e) => handleCheckboxChange(docKey, field, suggestedValue, e.target.checked, true)}
                                  checked={acceptedSuggestions[docKey]?.[field]?.applyAndLock}
                                  disabled={isLocked}
                                >
                                  <LockOutlined style={{ color: '#1890ff' }} />
                                </Checkbox>
                                <div style={{ flexGrow: 1 }}>
                                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <Space>
                                      <Text strong>{formatFieldName(field)}</Text>
                                      <Divider type="vertical" />
                                      <Tag color="blue">Suggestion</Tag>
                                      {isLocked && <Tag color="red">Locked</Tag>}
                                    </Space>
                                    <Space>
                                      <Popconfirm
                                        title="Dismiss suggestion?"
                                        onConfirm={() => handleDismissLocally(docKey, field)}
                                        okText="Dismiss"
                                        cancelText="Cancel"
                                        placement="top"
                                      >
                                        <Button
                                          type="text"
                                          size="small"
                                          style={{ 
                                            padding: '0 4px',
                                            color: '#8c8c8c',
                                            fontSize: '12px',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            height: '24px'
                                          }}
                                        >
                                          <Space size={4}>
                                            <CloseOutlined style={{ fontSize: '12px' }} />
                                            <span>Ignore</span>
                                          </Space>
                                        </Button>
                                      </Popconfirm>
                                    </Space>
                                  </Space>
                                  
                                  <div style={{ marginTop: '8px' }}>
                                    <div style={{ 
                                      whiteSpace: 'pre-wrap', 
                                      display: 'block', 
                                      background: '#f0f8ff', 
                                      padding: '12px 16px', 
                                      borderRadius: '8px', 
                                      border: '1px solid #d9e8ff',
                                      fontSize: '14px',
                                      lineHeight: '1.6',
                                      color: '#444',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}>
                                      {isDateField(field) ? formatDate(suggestedValue) : 
                                        (typeof suggestedValue === 'string' ? 
                                          suggestedValue : 
                                          JSON.stringify(suggestedValue, null, 2))}
                                    </div>
                                  </div>
                                  
                                  {currentValueExists && 
                                  currentValue !== null && 
                                  currentValue !== undefined && 
                                  currentValue !== '' && 
                                  !(typeof currentValue === 'object' && Object.keys(currentValue).length === 0) && (
                                    <div style={{ marginTop: '8px' }}>
                                      <Text type="secondary">Current Value:</Text>
                                      <Text code type="secondary" style={{ 
                                        whiteSpace: 'pre-wrap', 
                                        display: 'block', 
                                        background: '#f5f5f5', 
                                        padding: '8px 12px', 
                                        marginTop: '4px',
                                        borderRadius: '6px', 
                                        border: '1px solid #d9d9d9',
                                        fontFamily: 'inherit',
                                        fontSize: '14px',
                                        lineHeight: '1.5'
                                      }}>
                                        {isDateField(field) ? formatDate(currentValue) : 
                                          (typeof currentValue === 'string' ? 
                                            currentValue : 
                                            JSON.stringify(currentValue, null, 2))}
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
            </div>
          </div>
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
            <div style={{ 
              textAlign: 'center',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              <BulbOutlined style={{ 
                fontSize: '48px', 
                color: '#1890ff',
                marginBottom: '24px',
                display: 'block'
              }} />
              <Text style={{ 
                fontSize: '18px',
                display: 'block',
                marginBottom: '8px'
              }}>
                No AI Suggestions Available
              </Text>
              <Text type="secondary" style={{ 
                display: 'block',
                marginBottom: '24px'
              }}>
                {lastAnalyzedDocId 
                  ? 'No new suggestions from the last document analysis.'
                  : 'Analyze your documents to get AI-powered suggestions for case details.'}
              </Text>
              <Button 
                type="primary" 
                size="large"
                icon={<SearchOutlined />} 
                onClick={onAnalyzeDocuments}
              >
                Analyze Documents
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SuggestionsTab;