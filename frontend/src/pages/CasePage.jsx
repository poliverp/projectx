// --- src/pages/CasePage.jsx ---
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Layout, 
  Card, 
  Descriptions, 
  Button, 
  Checkbox, 
  Space,
  Typography, 
  Alert, 
  Spin, 
  Select, 
  Input, 
  Modal, 
  Form, 
  List, 
  Popconfirm, 
  Collapse,
  Tabs,
  Tag,
  Badge,
  Tooltip,
  Divider,
  Progress,
  Row,
  Col,
  Statistic,
  Empty
} from 'antd';
import {
  EditOutlined,
  CopyOutlined,
  CloseOutlined,
  CheckCircleTwoTone,
  LoadingOutlined,
  FileTextOutlined,
  FolderOutlined,
  SearchOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  FileAddOutlined,
  FileDoneOutlined,
  BulbOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  RightOutlined,
  PlusOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { toast } from 'react-toastify';
import { caseFieldConfig, getCaseFieldValue } from '../config/caseFieldConfig';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function CasePage() {
  // --- Hooks and State ---
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // State for Case Data Fetching
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Suggestions Review
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  // --- ADD THIS STATE ---
  const [dismissedSuggestions, setDismissedSuggestions] = useState({}); // Tracks { docKey: { fieldKey: true } }

  // State for Edit Case Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [isAllDetailsModalOpen, setIsAllDetailsModalOpen] = useState(false);

  // State for Document Generation
  const [docTypes, setDocTypes] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const [copied, setCopied] = useState(false);
  // --- Add this state variable ---
  const [isClearing, setIsClearing] = useState(false);
  // --- End Add ---
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("details");

  // Quick Stats
  const [caseProgress, setCaseProgress] = useState(0);

  // --- API Functions ---
  const fetchCaseDetails = useCallback(() => {
    setLoading(true);
    setError(null);
    setGenerationError(null);
    setGenerationResult('');
    
    api.getCase(caseId)
      .then(response => {
        setCaseDetails(response.data);
        
        // Calculate and set case progress (demo purposes)
        // In production, this would be based on actual case status data
        const dataCompleteness = calculateDataCompleteness(response.data);
        setCaseProgress(dataCompleteness);
        
        // Count pending suggestions for badge
        const pendingSuggestions = response.data.case_details?.pending_suggestions || {};
        let count = 0;
        
        // Count non-redundant suggestions (simplified version)
        Object.values(pendingSuggestions).forEach(docSuggestions => {
          count += Object.keys(docSuggestions).length;
        });
        
        setSuggestionsCount(count);
        
        console.log("Updated case details:", response.data);
      })
      .catch(err => {
        console.error(`Error fetching case ${caseId}:`, err);
        setError(`Failed to load case details. ${err.response?.status === 404 ? 'Case not found.' : 'Is the backend running?'}`);
        setCaseDetails(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [caseId]);

  // Helper function to calculate case data completeness
  const calculateDataCompleteness = (data) => {
    // This is a simplified example - in production you'd have a more sophisticated algorithm
    if (!data) return 0;
    
    const requiredFields = [
      'display_name', 'official_case_name', 'case_number', 
      'judge', 'plaintiff', 'defendant'
    ];
    
    let filledFields = 0;
    requiredFields.forEach(field => {
      if (data[field] && data[field].toString().trim() !== '') {
        filledFields++;
      }
    });
    
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  // --- Event Handlers ---
  const handleCheckboxChange = useCallback((docKey, field, suggestedValue, isChecked) => {
    setAcceptedSuggestions(prev => {
      const newAccepted = JSON.parse(JSON.stringify(prev));
      if (isChecked) {
        if (!newAccepted[docKey]) newAccepted[docKey] = {};
        newAccepted[docKey][field] = suggestedValue;
      } else {
        if (newAccepted[docKey]?.[field] !== undefined) {
          delete newAccepted[docKey][field];
          if (Object.keys(newAccepted[docKey]).length === 0) delete newAccepted[docKey];
        }
      }
      console.log("Updated Accepted Suggestions State:", newAccepted);
      return newAccepted;
    });
  }, []);

  // --- ADD THIS HANDLER FUNCTION ---
  const handleDismissLocally = (docKey, fieldKey) => {
    setDismissedSuggestions(prev => {
        const newDismissed = JSON.parse(JSON.stringify(prev)); // Deep copy
        if (!newDismissed[docKey]) {
            newDismissed[docKey] = {};
        }
        newDismissed[docKey][fieldKey] = true; // Mark as dismissed
        console.log("Updated Dismissed Suggestions State:", newDismissed);
        return newDismissed;
    });
    // Optional: Provide feedback
    // toast.info(`Suggestion for "${formatFieldName(fieldKey)}" hidden.`);

    // Also, ensure it's removed from accepted suggestions if it was checked
    setAcceptedSuggestions(prev => {
        const newAccepted = JSON.parse(JSON.stringify(prev));
        if (newAccepted[docKey]?.[fieldKey] !== undefined) {
            delete newAccepted[docKey][fieldKey];
            if (Object.keys(newAccepted[docKey]).length === 0) delete newAccepted[docKey];
            console.log("Removed dismissed item from accepted suggestions:", newAccepted);
            return newAccepted;
        }
        return prev; // Return previous state if no change needed
    });
  };
  // --- END ADD ---
  const handleOpenEditModal = () => {
    if (!caseDetails) return;

    const initialEditData = {};
    caseFieldConfig.forEach(field => {
      if (field.isEditable) {
        const currentValue = field.isDedicated
          ? caseDetails[field.name]
          : (caseDetails.case_details ? caseDetails.case_details[field.name] : undefined);

        initialEditData[field.name] = currentValue ?? '';
      }
    });

    form.setFieldsValue(initialEditData);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  async function handleApplyChanges() {
    if (Object.keys(acceptedSuggestions).length === 0 || isApplying) {
      return;
    }
    
    setIsApplying(true);
    setApplySuccess(false);
    setError(null);

    const updatePayload = {};
    const currentCaseDetailsData = caseDetails?.case_details ?? {};
    const updatedDetails = JSON.parse(JSON.stringify(currentCaseDetailsData));
    const processedDocKeys = new Set();
    let caseDetailsChanged = false;

    for (const docKey in acceptedSuggestions) {
      // ---### START CHANGE ###---
      // Skip this whole docKey if it doesn't exist or has no fields in acceptedSuggestions
      if (!acceptedSuggestions[docKey] || Object.keys(acceptedSuggestions[docKey]).length === 0) {
          continue;
      }
      processedDocKeys.add(docKey);
      if (typeof acceptedSuggestions[docKey] === 'object' && acceptedSuggestions[docKey] !== null) {
        for (const field in acceptedSuggestions[docKey]) {
          const acceptedValue = acceptedSuggestions[docKey][field];
          
          const dedicatedFields = caseFieldConfig
            .filter(field => field.isDedicated === true)
            .map(field => field.name);
            
          if (dedicatedFields.includes(field)) {
            updatePayload[field] = acceptedValue;
            console.log(`Applying to dedicated column: ${field} = ${JSON.stringify(acceptedValue)}`);
          } else {
            if (updatedDetails[field] !== acceptedValue) {
              updatedDetails[field] = acceptedValue;
              console.log(`Applying to case_details JSON (non-dedicated field): ${field} = ${JSON.stringify(acceptedValue)}`);
              caseDetailsChanged = true;
            }
          }
        }
      }
    }

    if (updatedDetails.pending_suggestions) {
      for (const docKey of processedDocKeys) {
        if (updatedDetails.pending_suggestions[docKey]) {
          delete updatedDetails.pending_suggestions[docKey];
          console.log(`Removed processed suggestions for ${docKey} from case_details`);
          caseDetailsChanged = true;
        }
      }
      if (Object.keys(updatedDetails.pending_suggestions).length === 0) {
        delete updatedDetails.pending_suggestions;
      }
    }

    if (caseDetailsChanged) {
      updatePayload.case_details = updatedDetails;
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log("No effective changes detected to apply.");
      setIsApplying(false);
      setAcceptedSuggestions({});
      return;
    }

    console.log("Sending combined update payload (targetting columns & case_details):", updatePayload);

    try {
      await api.updateCase(caseId, updatePayload);
      setApplySuccess(true);
      toast.success("Changes applied successfully!");
      setTimeout(() => setApplySuccess(false), 3000);
      setAcceptedSuggestions({});
      
      setTimeout(() => {
        fetchCaseDetails();
      }, 500);
    } catch (err) {
      console.error("Failed to apply changes:", err);
      setError(`Failed to apply changes: ${err.response?.data?.error || err.message}`);
      toast.error("Failed to apply changes");
    } finally {
      setIsApplying(false);
    }
  }

  async function handleGenerateDocument() {
    if (!selectedDocType || isGenerating) return;
    
    console.log(`Requesting generation for type: ${selectedDocType}`);
    setIsGenerating(true);
    setGenerationResult('');
    setGenerationError(null);
    setError(null);

    const generationData = {
      document_type: selectedDocType,
      custom_instructions: customInstructions
    };

    try {
      const response = await api.generateDocument(caseId, generationData);
      if (response.data && response.data.generated_content) {
        setGenerationResult(response.data.generated_content);
        toast.success("Document generated successfully");
      } else {
        setGenerationError("Received unexpected response from server.");
        toast.warning("Unexpected response from server");
      }
    } catch (err) {
      console.error("Failed to generate document:", err);
      setGenerationError(`Generation failed: ${err.response?.data?.error || err.message}`);
      toast.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  }

  const handleSaveChanges = async (event) => {
    event.preventDefault();
    if (!caseDetails || editLoading) return;

    try {
      const formValues = await form.validateFields();
      console.log("Validated Form Values:", formValues);

      const updatePayload = { ...formValues };

      setEditLoading(true);
      setEditError(null);

      console.log("Attempting to save changes with payload:", updatePayload);

      await api.updateCase(caseId, updatePayload);

      console.log("Case updated successfully.");
      setIsEditModalOpen(false);
      setEditLoading(false);
      fetchCaseDetails();
      toast.success("Case information updated");

    } catch (errorInfo) {
      if (errorInfo.errorFields) {
        console.log('Form Validation Failed:', errorInfo);
        setEditError("Please check the form for errors.");
      } else {
        console.error("Failed to save case changes:", errorInfo);
        const apiError = errorInfo;
        setEditError(`Failed to save changes: ${apiError.response?.data?.error || apiError.response?.data?.messages || apiError.message}`);
        toast.error("Failed to save changes");
      }
      setEditLoading(false);
    } finally {
      if (editLoading) {
        setEditLoading(false);
      }
    }
  };

  const handleClearSuggestions = async () => {
    // Prevent action if no details or already clearing/applying
    if (!caseDetails || isClearing || isApplying) return;

    // Confirm with the user
    if (!window.confirm("Are you sure you want to clear all pending suggestions for this case? This cannot be undone.")) {
        return;
    }

    setIsClearing(true);
    setError(null); // Clear previous page-level errors

    // Prepare payload to specifically clear pending_suggestions
    // Get current details, ensuring it's an object
    const currentDetails = caseDetails.case_details || {};

    // Create the payload to update ONLY case_details, setting pending_suggestions to empty
    const payload = {
        case_details: {
            ...currentDetails, // Keep other existing details
            pending_suggestions: {} // Set pending_suggestions to empty object
        }
        // If you also want to clear the 'last_analyzed_doc_id' inside case_details:
        // delete payload.case_details.last_analyzed_doc_id; // Or set to null if preferred
    };

    // If you have last_analyzed_doc_id as a DEDICATED column and want to clear it:
    // payload.last_analyzed_doc_id = null; // Add this line if it's a top-level column

    console.log("Attempting to clear suggestions with payload:", payload);

    try {
        await api.updateCase(caseId, payload); // Call the update API
        toast.success("Pending suggestions cleared successfully!");
        // Refresh the case details to reflect the changes
        // No need for setTimeout here, fetch immediately after success
        fetchCaseDetails();
    } catch (err) {
        console.error("Failed to clear suggestions:", err);
        // Try to get a more specific error message
        const errorMsg = err.response?.data?.messages
                        ? JSON.stringify(err.response.data.messages)
                        : (err.response?.data?.error || err.message);
        setError(`Failed to clear suggestions: ${errorMsg}`);
        toast.error("Failed to clear suggestions.");
    } finally {
        setIsClearing(false); // Reset loading state
    }
  };

  const handleCopyGeneratedText = useCallback(() => {
    if (!generationResult) return;
    navigator.clipboard.writeText(generationResult)
      .then(() => {
        setCopied(true);
        toast.info("Text copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setGenerationError("Failed to copy text to clipboard.");
        toast.error("Failed to copy text");
      });
  }, [generationResult]);

  const handleDismissGeneratedText = useCallback(() => {
    setGenerationResult('');
    setGenerationError(null);
    setCopied(false);
  }, []);

  // --- Effects ---
  useEffect(() => {
    fetchCaseDetails();
  }, [caseId, fetchCaseDetails]);

  useEffect(() => {
    api.getDocumentTypes()
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          setDocTypes(response.data);
          if (response.data.length > 0 && !selectedDocType) {
            setSelectedDocType(response.data[0]);
          }
        } else { 
          setDocTypes([]);
        }
      })
      .catch(err => {
        console.error("Error fetching document types:", err);
        setGenerationError("Could not load document types list.");
      });
  }, []);

  // --- Loading & Error States ---
  if (loading && !isApplying && !editLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Loading case details...</Text>
        </Space>
      </div>
    );
  }

  if (error && !caseDetails) {
    return (
      <Alert
        message="Error Loading Case"
        description={error}
        type="error"
        showIcon
        action={
          <Space>
            <Button size="small" type="primary" onClick={fetchCaseDetails} disabled={loading}>
              Retry Load
            </Button>
            <Button size="small">
              <Link to="/manage-cases">Go Home</Link>
            </Button>
          </Space>
        }
        style={{ margin: '20px 0' }}
      />
    );
  }

  if (!caseDetails && !loading) {
    return (
      <Alert
        message="Case Not Found"
        description="The requested case could not be found or loaded."
        type="warning"
        showIcon
        action={
          <Button size="small">
            <Link to="/manage-cases">Go Home</Link>
          </Button>
        }
        style={{ margin: '20px 0' }}
      />
    );
  }

  // --- Prepare Data for Rendering ---
  const { display_name, official_case_name, case_number, judge, plaintiff, defendant } = caseDetails;
  const caseDetailsData = caseDetails.case_details || {};
  const pendingSuggestions = caseDetailsData.pending_suggestions;
  const lastAnalyzedDocId = caseDetailsData.last_analyzed_doc_id;

  // Generate details items
  const detailsItems = caseDetails ? caseFieldConfig
    .filter(field => field.showInitially === true)
    .map((field) => ({
      key: field.name,
      label: field.label,
      children: field.isDedicated
        ? (caseDetails[field.name] ?? 'N/A')
        : (caseDetailsData[field.name] ?? 'N/A'),
      span: field.span || 1,
    })) : [];

  const allDetailsItems = caseDetails ? caseFieldConfig
    .filter(field => field.name !== 'id' && field.name !== 'user_id')
    .map((field) => ({
      key: field.name,
      label: field.label,
      children: field.isDedicated
        ? (caseDetails[field.name] ?? 'N/A')
        : (caseDetailsData[field.name] ?? 'N/A'),
      span: 1,
    })) : [];

  // --- Helper Functions ---
  const formatFieldName = (fieldName) => {
    if (!fieldName) return '';
    return fieldName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const getCaseStatusTag = () => {
    // This is a demo implementation - in real app would use actual status
    const status = caseDetailsData.status || 'Active';
    
    const statusColors = {
      'Active': 'green',
      'Pending': 'orange',
      'Closed': 'gray',
      'On Hold': 'red'
    };
    
    return (
      <Tag color={statusColors[status] || 'blue'}>
        {status}
      </Tag>
    );
  };
  
  // Determine if we have pending suggestions
  const hasSuggestions = pendingSuggestions && Object.keys(pendingSuggestions).length > 0;

  // --- Render ---
  return (
    <div className="case-page-container">
      {/* Global Error Banner */}
      {error && caseDetails && (
        <Alert
          message="Operation Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Header Section */}
      <Card className="case-header-card">
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={24} md={16} lg={18}>
            <Space direction="vertical" size={0}>
              <Space align="center">
                <Title level={3} style={{ margin: 0 }}>{display_name}</Title>
                {getCaseStatusTag()}
              </Space>
              <Space size="large">
                <Text type="secondary">Case #{case_number || 'N/A'}</Text>
                <Text type="secondary">Judge: {judge || 'N/A'}</Text>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={8} lg={6} style={{ textAlign: 'right' }}>
            <Space>
              <Tooltip title="Edit Case Info">
                <Button 
                  icon={<EditOutlined />} 
                  onClick={handleOpenEditModal} 
                  disabled={!caseDetails || editLoading}
                >
                  Edit
                </Button>
              </Tooltip>
              <Tooltip title="Download Case Summary">
                <Button icon={<DownloadOutlined />}>Export</Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
        
        {/* Case Progress and Quick Stats */}
        <Row gutter={[24, 24]} style={{ marginTop: '16px' }}>
        </Row>
      </Card>

      {/* Quick Action Buttons */}
      <Card size="small" className="case-actions-card" style={{ marginTop: '16px' }}>
        <Space wrap size="middle">
          <Button 
            type="primary" 
            icon={<FolderOutlined />}
          >
            <Link to={`/case/${caseId}/files`}>Manage Files</Link>
          </Button>
          <Button
            icon={<SearchOutlined />}
          >
            <Link to={`/case/${caseId}/analyze`}>Analyze Documents</Link>
          </Button>
          <Button
            icon={<FileAddOutlined />}
          >
            <Link to={`/case/${caseId}/create-doc`}>Create Document</Link>
          </Button>
          <Button
            icon={<FileDoneOutlined />}
          >
            <Link to={`/case/${caseId}/create-discovery-response`}>Discovery Response</Link>
          </Button>
        </Space>
      </Card>

      {/* Main Content Tabs */}
      <Card style={{ marginTop: '16px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            {
              label: (
                <span>
                  <InfoCircleOutlined />
                  Case Details
                </span>
              ),
              key: "details",
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Card 
                    title="Official Details" 
                    type="inner"
                    extra={
                      <Button onClick={() => setIsAllDetailsModalOpen(true)}>
                        Show All Details
                      </Button>
                    }
                  >
                    <Descriptions 
                      bordered 
                      column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} 
                      items={detailsItems} 
                      size="small"
                    />
                  </Card>
                </Space>
              )
            },
            {
              label: (
                <span>
                  <BulbOutlined />
                  Suggestions
                  {suggestionsCount > 0 && (
                    <Badge count={suggestionsCount} offset={[5, -5]} size="small" />
                  )}
                </span>
              ),
              key: "suggestions",
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Card 
                    title="AI Analysis Suggestions" 
                    type="inner"
                    extra={
                      <Space> {/* Wrap buttons */}
                        {hasSuggestions && ( // Only show Clear button if there are suggestions
                          <Popconfirm
                            title="Clear all suggestions?"
                            description="Are you sure? This cannot be undone."
                            onConfirm={handleClearSuggestions}
                            okText="Yes, Clear All"
                            cancelText="No"
                            okButtonProps={{ danger: true }}
                            disabled={isApplying || isClearing} // Disable popconfirm if busy
                          >
                              <Button
                                danger
                                size="small"
                                loading={isClearing}
                                disabled={isApplying || isClearing} // Disable button if busy
                              >
                                Clear All Suggestions
                              </Button>
                          </Popconfirm>
                        )}
                        <Button
                          type="primary"
                          size="small" // Make size consistent
                          onClick={handleApplyChanges}
                          loading={isApplying}
                          // Disable if no suggestions selected OR if applying OR if clearing
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
                        {Object.entries(pendingSuggestions).map(([docKey, suggestions]) => (
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
                                // ---### START CHANGE ###---
                                // 1. Check if suggestion is locally dismissed
                                if (dismissedSuggestions[docKey]?.[field]) {
                                  return null; // Don't render if dismissed locally
                                }
                                // ---### END CHANGE ###---
              
                                // 2. Filter out null or 0 suggestions (Keep this check)
                                if (suggestedValue === null || suggestedValue === 0) {
                                  return null;
                                }
              
                                // 3. Get the current value for comparison (Keep this logic)
                                let currentValue = caseDetails?.[field] !== undefined
                                                  ? caseDetails[field]
                                                  : caseDetailsData?.[field];
                                const currentValueExists = currentValue !== undefined;
              
                                // 4. Filter out redundant suggestions (Keep this logic)
                                let isRedundant = false;
                                if (currentValueExists) {
                                    if (typeof suggestedValue === 'string' && typeof currentValue === 'string') {
                                        isRedundant = suggestedValue.toLowerCase() === currentValue.toLowerCase();
                                    } else {
                                        try {
                                            isRedundant = JSON.stringify(suggestedValue) === JSON.stringify(currentValue);
                                        } catch (e) { isRedundant = suggestedValue === currentValue; }
                                    }
                                }
                                if (isRedundant) { return null; }
              
                                // 5. If checks pass, render the List Item
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
                                          // description="This only hides it for this session." // Optional description
                                          onConfirm={() => handleDismissLocally(docKey, field)}
                                          okText="Dismiss"
                                          cancelText="Cancel"
                                          placement="top" // Adjust placement
                                        >
                                          <Tooltip title="">
                                            <Button
                                              type="text" // Keeps it subtle
                                              danger      // Red color indicates dismissal
                                              size="small" // Small size matches checkbox area
                                              icon={<CloseOutlined />}
                                              style={{ marginLeft: '8px', padding: '0 4px' }} // Add margin, reduce padding
                                              // Add loading state here if you implement per-item loading later
                                            />
                                          </Tooltip>
                                        </Popconfirm>
                                        {/* ---### END CHANGE ###--- */}
                                        <div style={{ flexGrow: 1 }}>
                                          <Text strong>{formatFieldName(field)}:</Text>
                                          <Divider type="vertical" />
                                          <Tag color="blue">Suggestion</Tag>
                                          {/* ... Rest of value display ... */}
                                          <div style={{ marginTop: '8px' }}>
                                             <Text code style={{ whiteSpace: 'pre-wrap', display: 'block', background: '#e6f7ff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #91d5ff' }}>
                                               {JSON.stringify(suggestedValue, null, 2)}
                                             </Text>
                                           </div>
                                           {currentValueExists ? (
                                             <div style={{ marginTop: '8px' }}>
                                               <Text type="secondary">Current Value:</Text>
                                               <Text code type="secondary" style={{ whiteSpace: 'pre-wrap', display: 'block', background: '#fafafa', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d9d9d9' }}>
                                                 {JSON.stringify(currentValue, null, 2)}
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
                            <Button type="primary" icon={<SearchOutlined />}>
                              <Link to={`/case/${caseId}/analyze`}>Analyze Documents</Link>
                            </Button>
                          </Space>
                        }
                      />
                    )}
                  </Card>
                </Space>
              )
            },
            {
              label: (
                <span>
                  <FileTextOutlined />
                  Document Generation
                </span>
              ),
              key: "generate",
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Card title="Generate Legal Document" type="inner">
                    {/* Generation Error Alert */}
                    {generationError && (
                      <Alert
                        message="Generation Error"
                        description={generationError}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setGenerationError(null)}
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Form layout="vertical">
                          <Form.Item 
                            label="Document Type" 
                            required
                            tooltip="Select the type of document you wish to generate"
                          >
                            <Select
                              value={selectedDocType}
                              onChange={setSelectedDocType}
                              loading={docTypes.length === 0 && !generationError && !error}
                              disabled={isGenerating || docTypes.length === 0}
                              placeholder="Select document type"
                              style={{ width: '100%' }}
                              notFoundContent={loading ? <Spin size="small" /> : <Text type="secondary">No document types found.</Text>}
                            >
                              {docTypes.map(type => (
                                <Select.Option key={type} value={type}>
                                  <Space>
                                    <FileTextOutlined />
                                    {type}
                                  </Space>
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                          
                          <Form.Item 
                            label="Custom Instructions" 
                            tooltip="Add any specific requirements or information to include in the document"
                          >
                            <TextArea
                              rows={4}
                              placeholder="Add custom instructions (optional)"
                              value={customInstructions}
                              onChange={(e) => setCustomInstructions(e.target.value)}
                              disabled={isGenerating}
                            />
                          </Form.Item>
                          
                          <Form.Item>
                            <Button
                              type="primary"
                              onClick={handleGenerateDocument}
                              loading={isGenerating}
                              disabled={!selectedDocType || isGenerating || docTypes.length === 0}
                              icon={<FileAddOutlined />}
                              block
                            >
                              {isGenerating ? 'Generating Document...' : 'Generate Document'}
                            </Button>
                          </Form.Item>
                        </Form>
                      </Col>
                    </Row>
                    
                    {/* Generation Loading */}
                    {isGenerating && !generationResult && (
                      <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Space direction="vertical" align="center">
                          <Spin size="large" />
                          <Text type="secondary">Generating document... This may take a moment.</Text>
                        </Space>
                      </div>
                    )}
                    
                    {/* Display Generation Result */}
                    {generationResult && (
                      <Card 
                        type="inner" 
                        title="Generated Document" 
                        style={{ marginTop: 16 }}
                        className="generated-document-card"
                        extra={
                          <Space>
                            <Button 
                              icon={<CopyOutlined />} 
                              onClick={handleCopyGeneratedText} 
                              disabled={copied}
                            >
                              {copied ? 'Copied!' : 'Copy'}
                            </Button>
                            <Tooltip title="Save as Word Document">
                              <Button icon={<DownloadOutlined />}>Download</Button>
                            </Tooltip>
                            <Popconfirm 
                              title="Dismiss generated text?" 
                              onConfirm={handleDismissGeneratedText} 
                              okText="Yes" 
                              cancelText="No"
                            >
                              <Button danger icon={<CloseOutlined />}>Dismiss</Button>
                            </Popconfirm>
                          </Space>
                        }
                      >
                        <div className="document-preview" style={{ 
                          padding: '20px', 
                          border: '1px solid #f0f0f0', 
                          borderRadius: '4px',
                          background: '#fff',
                          fontFamily: 'Times New Roman, serif',
                          lineHeight: '1.6',
                          maxHeight: '500px',
                          overflowY: 'auto'
                        }}>
                          <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                            {generationResult}
                          </Paragraph>
                        </div>
                      </Card>
                    )}
                  </Card>
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* Footer Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: '20px'
      }}>
        <Button type="default">
          <Link to="/manage-cases">
            <Space>
              <RightOutlined style={{ transform: 'rotate(180deg)' }} />
              Back to Cases
            </Space>
          </Link>
        </Button>
        
      </div>

      {/* Edit Case Modal */}
      <Modal
        title="Edit Case Information"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditLoading(false);
          setEditError(null);
        }}
        confirmLoading={editLoading}
        footer={[
          <Button key="back" onClick={() => setIsEditModalOpen(false)} disabled={editLoading}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" loading={editLoading} onClick={handleSaveChanges}>
            Save Changes
          </Button>,
        ]}
        destroyOnClose
        maskClosable={!editLoading}
        width={700}
      >
        {editError && (
          <Alert
            message="Save Error"
            description={editError}
            type="error"
            showIcon
            closable
            onClose={() => setEditError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveChanges}
        >
          <Row gutter={[16, 0]}>
            {caseFieldConfig
              .filter(field => field.isEditable === true)
              .map(field => (
                <Col xs={24} sm={field.span === 3 ? 24 : 12} md={field.span === 3 ? 24 : 12} key={field.name}>
                  <Form.Item
                    label={field.label}
                    key={field.name}
                    name={field.name}
                    required={field.isRequired}
                    rules={[
                      {
                        required: field.isRequired,
                        message: `Please input ${field.label}!`
                      }
                    ]}
                  >
                    {field.type === 'textarea' ? (
                      <TextArea
                        name={field.name}
                        disabled={editLoading}
                        placeholder={field.placeholder}
                        rows={4}
                      />
                    ) : (
                      <Input
                        name={field.name}
                        disabled={editLoading}
                        placeholder={field.placeholder}
                        prefix={field.name.includes('date') ? <CalendarOutlined /> : null}
                      />
                    )}
                  </Form.Item>
                </Col>
              ))
            }
          </Row>
        </Form>
      </Modal>

      {/* All Details Modal */}
      <Modal
        title="All Case Details"
        open={isAllDetailsModalOpen}
        onCancel={() => setIsAllDetailsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsAllDetailsModalOpen(false)}>
            Close
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        {allDetailsItems.length > 0 ? (
          <Tabs
            defaultActiveKey="table"
            items={[
              {
                key: 'table',
                label: 'Table View',
                children: (
                  <Descriptions
                    bordered
                    column={1}
                    items={allDetailsItems}
                    size="small"
                  />
                )
              },
              {
                key: 'json',
                label: 'JSON View',
                children: (
                  <div style={{ 
                    background: '#f6f8fa', 
                    padding: '12px', 
                    borderRadius: '4px',
                    maxHeight: '500px',
                    overflowY: 'auto'
                  }}>
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify(caseDetails, null, 2)}
                    </pre>
                  </div>
                )
              }
            ]}
          />
        ) : (
          <Empty description="Details not available" />
        )}
      </Modal>
    </div>
  );
}

export default CasePage;