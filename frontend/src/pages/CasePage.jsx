// --- src/pages/CasePage.jsx ---
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Adjust path if needed
import { Layout, Card, Descriptions, Button,  Checkbox, Space,
Typography, Alert, Spin,  Select,  Input, Modal, Form, List,  Popconfirm, Collapse 
} from 'antd';
import {EditOutlined, CopyOutlined, CloseOutlined,
CheckCircleTwoTone, LoadingOutlined
} from '@ant-design/icons';
import { toast } from 'react-toastify';

const { Title, Text, Paragraph } = Typography; // Destructure Typography components
const { TextArea } = Input; // Destructure TextArea

const modalOverlayStyle = {
  position: 'fixed', // Stick to viewport
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent black background
  display: 'flex',
  alignItems: 'center', // Center vertically
  justifyContent: 'center', // Center horizontally
  zIndex: 1050, // Ensure it's on top
};
const modalContentStyle = {
  background: 'white',
  padding: '25px 35px',
  borderRadius: '8px',
  minWidth: '450px',
  maxWidth: '600px',
  maxHeight: '90vh', // Limit height
  overflowY: 'auto', // Add scroll if content overflows
  boxShadow: '0 5px 15px rgba(0,0,0,.2)',
  position: 'relative' // Needed for potential close button positioning later
};
const formGroupStyle = {
  marginBottom: '1rem', // Standard spacing between form groups
  textAlign: 'left', // Align labels left
};
const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '1rem',
  lineHeight: 1.5,
  color: '#495057', backgroundColor: '#fff',
  backgroundClip: 'padding-box',
  border: '1px solid #ced4da',
  borderRadius: '0.25rem', // Corrected from '1 '0.25rem'
  transition: 'border-color .15s ease-in-out, box-shadow .15s ease-in-out', // Corrected from stray ', 2'
  boxSizing: 'border-box', // Include padding and border in element's total width/height
};
// --- End Basic Styles ---

function CasePage() {
  // --- Hooks MUST Be Called Unconditionally at the Top ---
  const { caseId } = useParams();
  const navigate = useNavigate(); // Keep if needed

  // State for Case Data Fetching
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true); // Main loading state
  const [error, setError] = useState(null); // General error state

  // State for Suggestions Review
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [isApplying, setIsApplying] = useState(false); // Apply button loading
  const [applySuccess, setApplySuccess] = useState(false); // Apply button success visual

  // --- State for Edit Case Modal --- (Already present in your code)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({}); // Holds data being edited in modal
  const [editLoading, setEditLoading] = useState(false); // Loading state for modal save
  const [editError, setEditError] = useState(null);      // Error state for modal save

  // State for Document Generation
  const [docTypes, setDocTypes] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const [copied, setCopied] = useState(false); // State for copy feedback
  
  const fetchCaseDetails = useCallback(() => {
    if (!isApplying) setLoading(true);
    setError(null);
    setGenerationError(null);
    setGenerationResult('');
    api.getCase(caseId)
      .then(response => {
        setCaseDetails(response.data);
      })
      .catch(err => {
        console.error(`Error fetching case ${caseId}:`, err);
        setError(`Failed to load case details. ${err.response?.status === 404 ? 'Case not found.' : 'Is the backend running?'}`);
        setCaseDetails(null);
      })
      .finally(() => {
         if (!isApplying) setLoading(false);
      });
  }, [caseId, isApplying]);

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

  // --- NEW: Handler to Open Edit Modal --- (Already present in your code)
  const handleOpenEditModal = () => {
      if (!caseDetails) return; // Safety check

      // Initialize the edit form state with current case details
      setEditFormData({
          // Use empty string '' as fallback for null/undefined values from backend
          display_name: caseDetails.display_name || '',
          official_case_name: caseDetails.official_case_name || '',
          case_number: caseDetails.case_number || '',
          judge: caseDetails.judge || '',
          plaintiff: caseDetails.plaintiff || '',
          defendant: caseDetails.defendant || '',
          // We are NOT editing the case_details JSON blob in this form
      });
      setEditError(null); // Clear any previous errors in the modal
      setIsEditModalOpen(true); // Open the modal
  };

  // --- NEW: Handler for Edit Form Input Changes --- (Already present in your code)
  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prevData => ({
        ...prevData,
        [name]: value // Update the specific field based on input's name attribute
    }));
  };

  // Handler for Applying Suggestions (Seems fine, no changes needed here for the modal)
  async function handleApplyChanges() {
    if (Object.keys(acceptedSuggestions).length === 0 || isApplying) {
      return;
    }
    console.log("Attempting to apply accepted suggestions to DEDICATED COLUMNS + case_details:", acceptedSuggestions);
    setIsApplying(true);
    setApplySuccess(false);
    setError(null);

    const updatePayload = {};
    const currentCaseDetailsData = caseDetails?.case_details ?? {};
    const updatedDetails = JSON.parse(JSON.stringify(currentCaseDetailsData));
    const processedDocKeys = new Set();
    let caseDetailsChanged = false;

    for (const docKey in acceptedSuggestions) {
      processedDocKeys.add(docKey);
      if (typeof acceptedSuggestions[docKey] === 'object' && acceptedSuggestions[docKey] !== null) {
        for (const field in acceptedSuggestions[docKey]) {
          const acceptedValue = acceptedSuggestions[docKey][field];
          const dedicatedFields = [
            'official_case_name',
            'case_number',
            'judge',
            'plaintiff',
            'defendant'
          ];
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
      setTimeout(() => setApplySuccess(false), 3000);
      setAcceptedSuggestions({});
      fetchCaseDetails();
    } catch (err) {
      console.error("Failed to apply changes:", err);
      setError(`Failed to apply changes: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsApplying(false);
    }
  }

  // Handler for Generating Document (No changes needed here for the modal)
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
          } else {
              setGenerationError("Received unexpected response from server.");
          }
      } catch (err) {
          console.error("Failed to generate document:", err);
          setGenerationError(`Generation failed: ${err.response?.data?.error || err.message}`);
      } finally {
          setIsGenerating(false);
      }
  }
  // Add this function inside the CasePage component
  const handleSaveChanges = async (event) => {
    event.preventDefault(); // Prevent default form submission (page reload)
    if (!caseDetails || editLoading) return; // Safety check

    setEditLoading(true);
    setEditError(null);

    // Prepare the payload: Only include the fields edited in the modal
    // Keys MUST match the backend model/API expectations (snake_case)
    const updatePayload = {
        display_name: editFormData.display_name,
        official_case_name: editFormData.official_case_name,
        case_number: editFormData.case_number,
        judge: editFormData.judge,
        plaintiff: editFormData.plaintiff,
        defendant: editFormData.defendant,
        // We are intentionally NOT sending the 'case_details' JSON here
        // as we are updating the dedicated columns directly via this modal.
    };

    console.log("Attempting to save changes with payload:", updatePayload);

    try {
        // Call the existing updateCase API function
        await api.updateCase(caseId, updatePayload);

        
        console.log("Case updated successfully.");
        setIsEditModalOpen(false); // Close the modal on success
        fetchCaseDetails(); // Re-fetch case details to show the updated data

        // Optional: Clear form data state if needed, though re-fetching usually handles it
        // setEditFormData({});

    } catch (err) {
        console.error("Failed to save case changes:", err);
        console.error("Error details:", err.response?.data);
        setEditError(`Failed to save changes: ${err.response?.data?.error || err.message}`);
        // Keep the modal open so the user sees the error and can retry/cancel
    } finally {
        setEditLoading(false); // Ensure loading state is turned off
    }
  };
  // Handler for Copy Button (No changes needed here for the modal)
  const handleCopyGeneratedText = useCallback(() => {
    if (!generationResult) return;
    navigator.clipboard.writeText(generationResult)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setGenerationError("Failed to copy text to clipboard.");
      });
  }, [generationResult]);

  // Handler for Dismiss Button (No changes needed here for the modal)
  const handleDismissGeneratedText = useCallback(() => {
      setGenerationResult('');
      setGenerationError(null);
      setCopied(false);
  }, []);

  // --- Effects (MUST come after all Hooks and function definitions) ---

  useEffect(() => {
    fetchCaseDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]); // Only run on caseId change

  useEffect(() => {
    api.getDocumentTypes()
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          setDocTypes(response.data);
          if (response.data.length > 0 && !selectedDocType) {
            setSelectedDocType(response.data[0]);
          }
        } else { setDocTypes([]); }
      })
      .catch(err => {
        console.error("Error fetching document types:", err);
        setGenerationError("Could not load document types list.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  // --- Conditional Returns for Loading/Error States ---
  // --- Conditional Returns for Loading/Error States ---
  // Use AntD Spin for loading indicator covering the content area
  if (loading && !isApplying && !editLoading) { // Check main loading state
      return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <Spin size="large" tip="Loading case details..." />
          </div>
      );
  }

  // Use AntD Alert for top-level errors
  if (error) {
      return (
          <Alert
              message="Error Loading Case"
              description={error}
              type="error"
              showIcon
              action={ // Optionally add retry/home buttons
                  <Space>
                      <Button size="small" type="primary" onClick={fetchCaseDetails} disabled={loading}>
                          Retry Load
                      </Button>
                      <Button size="small">
                         <Link to="/">Go Home</Link>
                      </Button>
                  </Space>
              }
              style={{ margin: '20px 0' }}
           />
       );
   }

  // Handle case not found after loading finished
  if (!caseDetails && !loading) {
       return (
           <Alert
               message="Case Not Found"
               description="The requested case could not be found or loaded."
               type="warning"
               showIcon
               action={
                   <Button size="small">
                      <Link to="/">Go Home</Link>
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

  // --- Callback Functions & Handlers (Defined at Top Level) ---
  const detailsItems = [
    { key: '1', label: 'Official Name', children: official_case_name || caseDetailsData.official_case_name || 'N/A', span: 2 },
    { key: '2', label: 'Case Number', children: case_number || caseDetailsData.case_number_doc || 'N/A' },
    { key: '3', label: 'Judge', children: judge || caseDetailsData.judge_doc || 'N/A' },
    { key: '4', label: 'Plaintiff', children: plaintiff || caseDetailsData.plaintiff || 'N/A' },
    { key: '5', label: 'Defendant', children: defendant || caseDetailsData.defendant || 'N/A' },
    // Add other relevant fields as needed, following the pattern:
    // { key: 'X', label: 'Field Name', children: caseDetails.dedicated_field || caseDetailsData.json_field || 'N/A' }
  ];
  // --- END ADD ---
   // --- JSX Rendering (Main structure using Space) ---
   return (
    // Use Space for vertical stacking of sections
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      {/* MODIFIED: Use AntD Typography Title */}
      <Title level={2}>Case: {display_name}</Title>
      {/* ===>>> ADD THIS ENTIRE <Card> SECTION HERE <<<=== */}
      <Card title="Case Actions" size="small"> {/* Use size="small" for less vertical space */}
                  <Space wrap size="middle"> {/* 'wrap' allows buttons to wrap; 'size' controls spacing */}
                      <Button>
                          {/* Link uses the route defined in App.jsx */}
                          <Link to={`/case/${caseId}/files`}>Manage Files</Link>
                      </Button>
                      <Button>
                          {/* Link uses the route defined in App.jsx */}
                          <Link to={`/case/${caseId}/analyze`}>Analyze Documents</Link>
                      </Button>
                      <Button>
                          {/* Link uses the route defined in App.jsx */}
                          {/* Label reflects the dual purpose of the target page */}
                          <Link to={`/case/${caseId}/create-doc`}>Create/Download Document</Link>
                      </Button>
                      <Button>
                          {/* Link uses the route defined in App.jsx */}
                          <Link to={`/case/${caseId}/create-discovery-response`}>Generate Discovery Response</Link>
                      </Button>
                      {/* Add other top-level action buttons here if needed in the future */}
                  </Space>
              </Card>
              {/* ===>>> END OF SECTION TO ADD <<<=== */}

      {/* --- Global Error Display (for apply/save errors) --- */}
      {error && caseDetails && ( // Show non-critical errors here if caseDetails did load
        <Alert
            message="Operation Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)} // Allow dismissing non-critical errors
            style={{ marginBottom: '16px' }}
           />
      )}

      {/* Official Details Section will go here (Next Snippet) */}
      <Card
        title="Official Details"
        extra={ // Place button in the card header
          <Button
            icon={<EditOutlined />}
            onClick={handleOpenEditModal}
            disabled={!caseDetails || editLoading} // Disable if no details or modal is saving
          >
            Edit Case Info
          </Button>
        }
      >
        <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} items={detailsItems} size="small"/>
      </Card>

      {/* Modal to Show All Details (Needs to be added later, driven by caseFieldConfig) */}
      {/* <Modal title="All Case Details" ... > ... </Modal> */}

      {/* --- Pending Suggestions Section --- */}
      <Card title="Pending Analysis Suggestions">
        {pendingSuggestions && Object.keys(pendingSuggestions).length > 0 ? (
          <> {/* Use Fragment to group Collapse and Button */}
            <Collapse accordion>
              {Object.entries(pendingSuggestions).map(([docKey, suggestions]) => (
              <Collapse.Panel header={`Suggestions from Document: ${docKey}`} key={docKey}>
                  <List
                    itemLayout="vertical" // Better layout for more info
                    dataSource={Object.entries(suggestions)}
                    renderItem={([field, suggestedValue]) => {
                        // Determine the current value for comparison
                        const currentValue = caseDetails[field] !== undefined ? caseDetails[field]
                                         : caseDetailsData[field] !== undefined ? caseDetailsData[field]
                                         : undefined; // Explicitly undefined if not found

                        return (
                          <List.Item>
                            <Space align="start" style={{ width: '100%' }}>
                              <Checkbox
                                style={{ paddingTop: '5px' }} // Align checkbox better
                                onChange={(e) => handleCheckboxChange(docKey, field, suggestedValue, e.target.checked)}
                                checked={!!acceptedSuggestions[docKey]?.[field]} // Check if this specific suggestion is accepted
                              >
                                {/* Intentionally blank label, info is on the right */}
                              </Checkbox>
                              <div style={{ flexGrow: 1 }}> {/* Allow text div to take remaining space */}
                                <Text strong>{field}: </Text>
                                <Text code style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(suggestedValue)}</Text>
                                <br />
                                {currentValue !== undefined ? (
                                    <Text type="secondary">Current: <Text code style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(currentValue)}</Text></Text>
                                ) : (
                                    <Text type="secondary">Current: Not Set</Text>
                                )}
                              </div>
                            </Space>
                          </List.Item>
                        );
                    }}
                  />
                </Collapse.Panel>
              ))}
            </Collapse>
            <Button
              type="primary"
              onClick={handleApplyChanges}
              loading={isApplying}
              disabled={Object.keys(acceptedSuggestions).length === 0 || isApplying}
              icon={applySuccess ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : (isApplying ? <LoadingOutlined /> : null)}
              style={{ marginTop: '16px' }}
            >
              {isApplying ? 'Applying...' : (applySuccess ? 'Applied!' : 'Apply Accepted Suggestions')}
            </Button>
          </>
        ) : (
          <> {/* Use Fragment */}
            <Text>No pending suggestions found.</Text>
            {lastAnalyzedDocId && <Text type="secondary"> (Last analyzed document ID: {lastAnalyzedDocId})</Text>}
         </>
        )}
      </Card>

      {/* --- Document Generation Section --- */}
      <Card title="Generate Document">
         {/* Error specific to generation */}
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
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            value={selectedDocType}
            onChange={setSelectedDocType}
            loading={docTypes.length === 0 && !generationError && !error} // Show loading only if no types AND no general/gen error
            disabled={isGenerating || docTypes.length === 0} // Disable if generating or no types loaded
            placeholder="Select document type"
            style={{ width: '100%' }}
            // Show not found only if loading is done and array is still empty
            notFoundContent={loading ? <Spin size="small" /> : <Text type="secondary">No document types found.</Text>}
          >
            {docTypes.map(type => <Select.Option key={type} value={type}>{type}</Select.Option>)}
          </Select>
          <TextArea
            rows={4}
            placeholder="Add custom instructions (optional)"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            disabled={isGenerating}
          />
          <Button
            type="primary"
            onClick={handleGenerateDocument}
            loading={isGenerating}
            disabled={!selectedDocType || isGenerating || docTypes.length === 0} // Also disable if no type selectable
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </Space>

        {/* Display Generation Result */}
        {isGenerating && !generationResult && ( // Show spinner *while* generating
             <div style={{ marginTop: 16, textAlign: 'center' }}><Spin tip="Generating content..."/></div>
        )}
        {generationResult && (
          <Card type="inner" title="Generated Document" style={{ marginTop: 16 }}
            extra={ // Add copy/dismiss to the inner card header
                <Space>
                    <Button icon={<CopyOutlined />} onClick={handleCopyGeneratedText} size="small" disabled={copied}>
                        {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Popconfirm title="Dismiss generated text?" onConfirm={handleDismissGeneratedText} okText="Yes" cancelText="No">
                       <Button danger icon={<CloseOutlined />} size="small">Dismiss</Button>
                    </Popconfirm>
                </Space>
            }
          >
            {/* Using Paragraph with copyable might be redundant if using header button */}
            {/* <Paragraph copyable={{ text: generationResult, tooltips: ['Copy', 'Copied!'] }} style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}> */}
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                {generationResult}
            </Paragraph>
          </Card>
        )}
      </Card>

      {/* --- Navigation --- */}
      <div style={{
          display: 'flex',
          justifyContent: 'flex-end', // Pushes content to the right
          width: '100%',             // Ensure the div takes full width
          marginTop: '20px'          // Keep the margin if needed
      }}>
          <Button>
              <Link to="/manage-cases">Back to Cases List</Link>
          </Button>
      </div>

      {/* --- Edit Case Modal (defined but not visible until isEditModalOpen is true) --- */}
      <Modal
        title="Edit Case Info"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        confirmLoading={editLoading} // Use confirmLoading for the OK button
        // Use default OK/Cancel buttons tied to onOk/onCancel
        // Or keep custom footer if preferred:
        footer={[
          <Button key="back" onClick={() => setIsEditModalOpen(false)} disabled={editLoading}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" loading={editLoading} onClick={handleSaveChanges}>
            Save Changes
          </Button>,
        ]}
        destroyOnClose // Good practice: resets form state when closed
        maskClosable={!editLoading} // Prevent closing by clicking outside while loading
      >
        {/* Error specific to the modal */}
        {editError && (
            <Alert
                message="Save Error"
                description={editError}
                type="error"
                showIcon
                closable
                onClose={() => setEditError(null)} // Clear modal error
                style={{ marginBottom: 16 }}
             />
        )}
        {/* Wrap inputs in Form for structure, labels, and potential validation later */}
        <Form layout="vertical" onFinish={handleSaveChanges}> {/* onFinish can trigger save */}
          <Form.Item label="Display Name (Internal)" required> {/* Example required */}
            <Input
              name="display_name"
              value={editFormData.display_name || ''}
              onChange={handleEditFormChange}
              disabled={editLoading}
              placeholder="Enter a short name for easy identification"
            />
          </Form.Item>
          <Form.Item label="Official Case Name">
            <Input
              name="official_case_name"
              value={editFormData.official_case_name || ''}
              onChange={handleEditFormChange}
              disabled={editLoading}
              placeholder="e.g., Smith v. Jones"
            />
          </Form.Item>
           <Form.Item label="Case Number">
            <Input
              name="case_number"
              value={editFormData.case_number || ''}
              onChange={handleEditFormChange}
              disabled={editLoading}
               placeholder="e.g., 2:24-cv-01234"
            />
          </Form.Item>
           <Form.Item label="Judge">
            <Input
              name="judge"
              value={editFormData.judge || ''}
              onChange={handleEditFormChange}
              disabled={editLoading}
               placeholder="e.g., Hon. Jane Doe"
            />
          </Form.Item>
           <Form.Item label="Plaintiff">
            <Input
              name="plaintiff"
              value={editFormData.plaintiff || ''}
              onChange={handleEditFormChange}
              disabled={editLoading}
              placeholder="Primary plaintiff name"
            />
          </Form.Item>
           <Form.Item label="Defendant">
            <Input
              name="defendant"
              value={editFormData.defendant || ''}
              onChange={handleEditFormChange}
              disabled={editLoading}
              placeholder="Primary defendant name"
            />
          </Form.Item>
          {/* If using Form's onFinish, the submit button within the footer might implicitly work,
              or you might need type="submit" on the save button if it's outside the <Form> tags
              but logically associated. Keeping onClick={handleSaveChanges} on the button is explicit. */}
        </Form>
      </Modal>

    </Space> // End main Space component
  );
} // End of CasePage component function

export default CasePage;