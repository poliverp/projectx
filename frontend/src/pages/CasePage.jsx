// --- START: Complete src/pages/CasePage.jsx ---
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
    Modal, // <<< Ensure Modal is imported
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
    FolderOutlined, // Icon for the button
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

// +++ IMPORT CaseFilesManager +++
// Adjust path if your structure differs (e.g., '../components/CasePage/...')
import CaseFilesManager from './CasePage/components/CaseFilesManager';
// +++ END IMPORT +++

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function CasePage() {
    // --- Hooks and State ---
    const { caseId } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    // Case Data State
    const [caseDetails, setCaseDetails] = useState(null);
    const [loading, setLoading] = useState(true); // Main page loading
    const [error, setError] = useState(null); // Main page error

    // Suggestions State
    const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
    const [dismissedSuggestions, setDismissedSuggestions] = useState({});
    const [isApplying, setIsApplying] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);
    const [suggestionsCount, setSuggestionsCount] = useState(0);
    const [isClearing, setIsClearing] = useState(false);

    // Edit Case Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({}); // Still needed if you use it? Check handleEditFormChange usage
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState(null);
    const [isAllDetailsModalOpen, setIsAllDetailsModalOpen] = useState(false);

    // Delete Case State
    const [isDeleting, setIsDeleting] = useState(false);

    // Document Generation State (for the tab)
    const [docTypes, setDocTypes] = useState([]);
    const [selectedDocType, setSelectedDocType] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState('');
    const [generationError, setGenerationError] = useState(null);
    const [copied, setCopied] = useState(false);

    // Active Tab State
    const [activeTab, setActiveTab] = useState("details");

    // Quick Stats State (Example)
    const [caseProgress, setCaseProgress] = useState(0);

    // +++ STATE for Files Modal +++
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    // +++ END STATE +++

    // --- API Call Wrapper ---
    const fetchCaseDetails = useCallback(() => {
        if (!caseId) return; // Prevent fetch if caseId is missing
        console.log(`Workspaceing details for case ${caseId}`);
        setLoading(true);
        setError(null); // Clear previous main errors
        // Clear related states that depend on caseDetails? Optional.
        setGenerationError(null);
        setGenerationResult('');

        api.getCase(caseId)
            .then(response => {
                setCaseDetails(response.data);

                // Example calculations (move to helpers if complex)
                const dataCompleteness = calculateDataCompleteness(response.data);
                setCaseProgress(dataCompleteness);

                const pendingSuggestions = response.data.case_details?.pending_suggestions || {};
                let count = 0;
                Object.values(pendingSuggestions).forEach(docSuggestions => {
                    count += Object.keys(docSuggestions).length;
                });
                setSuggestionsCount(count);

                console.log("Fetched case details:", response.data);
            })
            .catch(err => {
                console.error(`Error fetching case ${caseId}:`, err);
                const errorMsg = `Failed to load case details. ${err.response?.status === 404 ? 'Case not found.' : 'Is the backend running?'}`;
                setError(errorMsg); // Set main page error
                setCaseDetails(null); // Clear details on error
            })
            .finally(() => {
                setLoading(false);
            });
    }, [caseId]); // Dependency: caseId

    // --- Helper Functions ---
    const calculateDataCompleteness = (data) => {
        // Simplified example
        if (!data) return 0;
        const requiredFields = ['display_name', 'case_number', 'judge', 'plaintiff', 'defendant']; // Example required
        let filledFields = requiredFields.filter(field => data[field] && data[field].toString().trim() !== '').length;
        return Math.round((filledFields / requiredFields.length) * 100);
    };

    const formatFieldName = (fieldName) => {
        if (!fieldName) return '';
        return fieldName.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    };

    const getCaseStatusTag = () => {
        // Simplified example using case_details
        const status = caseDetails?.case_details?.status || 'Active';
        const statusColors = { 'Active': 'green', 'Pending': 'orange', 'Closed': 'gray', 'On Hold': 'red' };
        return <Tag color={statusColors[status] || 'blue'}>{status}</Tag>;
    };

    // --- Event Handlers ---

    // Suggestion Handlers
    const handleCheckboxChange = useCallback((docKey, field, suggestedValue, isChecked) => {
        // ... (implementation remains the same - ensure it uses functional updates if needed)
         setAcceptedSuggestions(prev => {
            const newAccepted = JSON.parse(JSON.stringify(prev)); // Deep copy for safety
            if (isChecked) {
                if (!newAccepted[docKey]) newAccepted[docKey] = {};
                newAccepted[docKey][field] = suggestedValue;
            } else {
                if (newAccepted[docKey]?.[field] !== undefined) {
                    delete newAccepted[docKey][field];
                    if (Object.keys(newAccepted[docKey]).length === 0) delete newAccepted[docKey];
                }
            }
            return newAccepted;
        });
    }, []);

    const handleDismissLocally = useCallback((docKey, fieldKey) => {
       // ... (implementation remains the same)
        setDismissedSuggestions(prev => {
             const newDismissed = JSON.parse(JSON.stringify(prev));
             if (!newDismissed[docKey]) newDismissed[docKey] = {};
             newDismissed[docKey][fieldKey] = true;
             return newDismissed;
        });
        // Remove from accepted if it was checked
         setAcceptedSuggestions(prev => {
             const newAccepted = JSON.parse(JSON.stringify(prev));
             if (newAccepted[docKey]?.[fieldKey] !== undefined) {
                 delete newAccepted[docKey][fieldKey];
                 if (Object.keys(newAccepted[docKey]).length === 0) delete newAccepted[docKey];
                 return newAccepted;
             }
             return prev;
         });
    }, []); // Dependencies might be needed if using external state here

    const handleApplyChanges = useCallback(async () => {
        if (Object.keys(acceptedSuggestions).length === 0 || isApplying) return;
        setIsApplying(true);
        setApplySuccess(false);
        setError(null); // Clear main page errors

        // ... (rest of the complex apply logic remains the same) ...
        // Make sure it calls fetchCaseDetails() on success to refresh

        // Simplified structure of apply logic:
        const updatePayload = { /* build payload based on acceptedSuggestions and caseFieldConfig */ };
        const processedDocKeys = new Set(Object.keys(acceptedSuggestions));

        // Add logic to update dedicated columns vs case_details JSON
        // based on caseFieldConfig.isDedicated

         // Remove processed suggestions from case_details.pending_suggestions
        if (caseDetails?.case_details?.pending_suggestions) {
            updatePayload.case_details = JSON.parse(JSON.stringify(caseDetails.case_details)); // Start with current details
            processedDocKeys.forEach(docKey => {
                if (updatePayload.case_details.pending_suggestions?.[docKey]) {
                    delete updatePayload.case_details.pending_suggestions[docKey];
                }
            });
            if (Object.keys(updatePayload.case_details.pending_suggestions).length === 0) {
               delete updatePayload.case_details.pending_suggestions;
            }
            // Clean up empty pending_suggestions object itself?
            if (updatePayload.case_details.pending_suggestions && Object.keys(updatePayload.case_details.pending_suggestions).length === 0) {
               delete updatePayload.case_details.pending_suggestions;
            }
        }


        if (Object.keys(updatePayload).length === 0) {
             console.log("No effective changes detected to apply.");
             setIsApplying(false);
             setAcceptedSuggestions({});
             return;
        }

        try {
            await api.updateCase(caseId, updatePayload);
            setApplySuccess(true);
            toast.success("Changes applied successfully!");
            setTimeout(() => setApplySuccess(false), 3000);
            setAcceptedSuggestions({});
            setDismissedSuggestions({}); // Clear locally dismissed ones too? Or let them persist? Decide based on UX.
            // Refresh after a short delay to allow backend processing
            setTimeout(fetchCaseDetails, 300);
        } catch (err) {
            console.error("Failed to apply changes:", err);
            const errorMsg = `Failed to apply changes: ${err.response?.data?.error || err.message}`;
            setError(errorMsg); // Show error on main page
            toast.error("Failed to apply changes");
        } finally {
            setIsApplying(false);
        }
    }, [acceptedSuggestions, isApplying, caseId, fetchCaseDetails, caseDetails]); // Add dependencies

     const handleClearSuggestions = useCallback(async () => {
         // ... (implementation remains the same) ...
          if (!caseDetails || isClearing || isApplying) return;
          if (!window.confirm("Are you sure...")) return; // Use AntD Modal.confirm later for better UX

          setIsClearing(true);
          setError(null);
          const currentDetails = caseDetails.case_details || {};
          const payload = {
               case_details: { ...currentDetails, pending_suggestions: {} }
               // Add logic to clear last_analyzed_doc_id if needed
          };
          // Add logic to clear dedicated last_analyzed_doc_id column if it exists

          try {
               await api.updateCase(caseId, payload);
               toast.success("Pending suggestions cleared!");
               fetchCaseDetails(); // Refresh immediately
               setAcceptedSuggestions({}); // Clear selection state
               setDismissedSuggestions({});// Clear dismissed state
          } catch (err) {
               // ... error handling ...
                const errorMsg = `Failed to clear suggestions: ${err.response?.data?.error || err.message}`;
                setError(errorMsg);
                toast.error("Failed to clear suggestions.");
          } finally {
               setIsClearing(false);
          }
     }, [caseDetails, isApplying, isClearing, caseId, fetchCaseDetails]); // Dependencies


    // Edit Modal Handlers
    const handleOpenEditModal = useCallback(() => {
        if (!caseDetails) return;
        // ... (logic to populate initialEditData based on caseFieldConfig remains the same) ...
        const initialEditData = {};
         caseFieldConfig.forEach(field => {
           if (field.isEditable) {
              const currentValue = field.isDedicated
                 ? caseDetails[field.name]
                 : (caseDetails.case_details ? caseDetails.case_details[field.name] : undefined);
              initialEditData[field.name] = currentValue ?? '';
           }
         });

        form.setFieldsValue(initialEditData); // Use AntD form instance
        setEditError(null);
        setIsEditModalOpen(true);
    }, [caseDetails, form]); // Dependencies

    const handleSaveChanges = useCallback(async (/* event - not needed if using form.submit */) => {
        if (!caseDetails || editLoading) return;
        try {
            const formValues = await form.validateFields(); // Validate and get values from AntD form
            setEditLoading(true);
            setEditError(null);
            await api.updateCase(caseId, formValues); // Send validated values
            setIsEditModalOpen(false);
            fetchCaseDetails(); // Refresh main page data
            toast.success("Case information updated");
        } catch (errorInfo) {
            // Handle validation errors vs API errors
            if (errorInfo.errorFields) {
                 console.log('Form Validation Failed:', errorInfo);
                 setEditError("Please check the form for errors.");
            } else {
                 console.error("Failed to save case changes:", errorInfo);
                 const apiError = errorInfo;
                 const errorMsg = `Failed to save changes: ${apiError.response?.data?.error || apiError.message}`;
                 setEditError(errorMsg);
                 toast.error("Failed to save changes");
            }
        } finally {
            setEditLoading(false);
        }
    }, [caseDetails, editLoading, form, caseId, fetchCaseDetails]); // Dependencies

    // Delete Case Handler
    const handleDeleteCase = useCallback(async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        setError(null);
        try {
            await api.deleteCase(caseId);
            toast.success(`Case deleted successfully!`);
            navigate('/manage-cases'); // Navigate away on success
        } catch (err) {
            console.error("Failed to delete case:", err);
            const errorMsg = `Failed to delete case: ${err.response?.data?.error || err.message}`;
            setError(errorMsg); // Show error on current page
            toast.error("Failed to delete case.");
            setIsDeleting(false); // Reset loading only on error
        }
    }, [caseId, isDeleting, navigate]); // Dependencies

    // Generation Handlers (Tab)
    const handleGenerateDocument = useCallback(async () => {
         if (!selectedDocType || isGenerating) return;
         // ... (implementation remains the same) ...
         setIsGenerating(true);
         setGenerationResult('');
         setGenerationError(null);
         //setError(null); // Clear main page errors too?
         const generationData = { document_type: selectedDocType, custom_instructions: customInstructions };
         try {
              const response = await api.generateDocument(caseId, generationData);
              if (response.data && response.data.generated_content !== undefined) { // Check specific field
                   setGenerationResult(response.data.generated_content);
                   toast.success("Document content generated");
              } else {
                   throw new Error("Unexpected response format from server.");
              }
         } catch (err) {
             // ... error handling ...
              console.error("Failed to generate document:", err);
              const errorMsg = `Generation failed: ${err.response?.data?.error || err.message}`;
              setGenerationError(errorMsg); // Set specific generation error
              toast.error("Failed to generate document content");
         } finally {
              setIsGenerating(false);
         }
    }, [selectedDocType, isGenerating, customInstructions, caseId]); // Dependencies

    const handleCopyGeneratedText = useCallback(() => {
        // ... (implementation remains the same) ...
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

    // +++ HANDLERS for Files Modal +++
    const handleOpenFilesModal = useCallback(() => {
        setIsFilesModalOpen(true);
    }, []); // No dependencies needed

    const handleCloseFilesModal = useCallback(() => {
        setIsFilesModalOpen(false);
        // Decide if fetchCaseDetails() is needed here. If the modal's internal
        // operations (via useDocumentManager) are self-contained and don't
        // affect the main CasePage display directly (like a file count badge),
        // you might not need to refresh the whole page on close.
        // fetchCaseDetails();
    }, []); // Add fetchCaseDetails dependency if uncommented: [fetchCaseDetails]
    // +++ END HANDLERS +++

    // --- Effects ---
    useEffect(() => {
        // Fetch main case details on mount/caseId change
        if (caseId) {
            fetchCaseDetails();
        } else {
            // Handle case where caseId is missing from URL params
            setError("No Case ID specified in URL.");
            setLoading(false);
            setCaseDetails(null);
        }
    }, [caseId, fetchCaseDetails]); // fetchCaseDetails is stable due to useCallback

    useEffect(() => {
        // Fetch document types for generation tab
        api.getDocumentTypes()
            .then(response => {
                if (response.data && Array.isArray(response.data)) {
                    setDocTypes(response.data);
                    // Optionally set a default selection
                    // if (response.data.length > 0 && !selectedDocType) {
                    //   setSelectedDocType(response.data[0]);
                    // }
                } else {
                    setDocTypes([]);
                }
            })
            .catch(err => {
                console.error("Error fetching document types:", err);
                // Use generationError state for generation tab specific errors
                setGenerationError("Could not load document types list.");
            });
    }, []); // Run only once on mount


    // --- Loading & Error States ---
    // Handle initial loading state before caseDetails is available
    if (loading && !caseDetails) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <Spin size="large" tip="Loading case details..." />
            </div>
        );
    }

    // Handle error state where case details couldn't be fetched at all
    if (error && !caseDetails && !loading) { // Check !loading to avoid showing error during initial load
        return (
            <Alert
                message="Error Loading Case"
                description={error}
                type="error"
                showIcon
                action={
                 <Space>
                   {/* Allow retry only if it's not a 404? Or always? */}
                   <Button size="small" type="primary" onClick={() => fetchCaseDetails()} disabled={loading}>
                     Retry Load
                   </Button>
                   <Button size="small">
                     <Link to="/manage-cases">Go Home</Link>
                   </Button>
                 </Space>
                }
                style={{ margin: '20px' }} // Add padding
            />
        );
    }

    // Handle case where caseId was invalid from the start or case deleted
     if (!caseId || (!loading && !caseDetails)) {
         // Use the main error state if it exists, otherwise generic message
         const description = error || "The requested case could not be found or loaded, or the Case ID is invalid.";
         return (
           <Alert
             message="Case Unavailable"
             description={description}
             type="warning"
             showIcon
             action={
                 <Button size="small">
                     <Link to="/manage-cases">Go Home</Link>
                 </Button>
             }
             style={{ margin: '20px' }}
           />
         );
     }

    // --- Prepare Data for Rendering (only if caseDetails exists) ---
    // Safe navigation: use caseDetails? throughout
    const { display_name, official_case_name, case_number, judge, plaintiff, defendant } = caseDetails || {};
    const caseDetailsData = caseDetails?.case_details || {};
    const pendingSuggestions = caseDetailsData.pending_suggestions || {}; // Default to empty object
    const lastAnalyzedDocId = caseDetailsData.last_analyzed_doc_id;
    const hasSuggestions = Object.keys(pendingSuggestions).length > 0;


    // Generate details items safely
    const detailsItems = caseDetails ? caseFieldConfig
        .filter(field => field.showInitially === true)
        .map((field) => ({
            key: field.name,
            label: field.label,
            children: getCaseFieldValue(caseDetails, field.name) ?? 'N/A', // Use helper?
            span: field.span || 1,
        })) : [];

    const allDetailsItems = caseDetails ? caseFieldConfig
        .filter(field => field.name !== 'id' && field.name !== 'user_id') // Example filter
        .map((field) => ({
            key: field.name,
            label: field.label,
            children: getCaseFieldValue(caseDetails, field.name) ?? 'N/A',
            span: 1, // Typically 1 span per item in modal list view
        })) : [];


    // --- Render Component ---
    return (
        <div className="case-page-container" style={{ padding: '20px' }}> {/* Add padding */}

            {/* Global Error Banner for non-fatal errors */}
            {error && caseDetails && ( // Show only if details loaded but an operation failed
                <Alert
                    message="Operation Error"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setError(null)} // Allow dismissing
                    style={{ marginBottom: '16px' }}
                />
            )}

            {/* Header Section */}
            <Card className="case-header-card" style={{ marginBottom: '16px' }}>
                <Row gutter={[24, 16]} align="middle">
                    <Col xs={24} sm={24} md={16} lg={18}>
                         {/* Use Spin here if only header part needs loading indicator during refreshes */}
                         <Spin spinning={loading && !!caseDetails}>
                             <Space direction="vertical" size={0}>
                                <Space align="center">
                                    <Title level={3} style={{ margin: 0 }}>{display_name || 'Loading...'}</Title>
                                    {caseDetails && getCaseStatusTag()}
                                </Space>
                                <Space size="large">
                                    <Text type="secondary">Case #{case_number || 'N/A'}</Text>
                                    <Text type="secondary">Judge: {judge || 'N/A'}</Text>
                                </Space>
                            </Space>
                        </Spin>
                    </Col>
                    <Col xs={24} sm={24} md={8} lg={6} style={{ textAlign: 'right' }}>
                        <Space>
                            <Tooltip title="Edit Case Info">
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={handleOpenEditModal}
                                    disabled={!caseDetails || editLoading || loading}
                                >
                                    Edit
                                </Button>
                            </Tooltip>
                            <Tooltip title="Export Options (Placeholder)">
                                <Button icon={<ExportOutlined />} disabled={!caseDetails || loading}>Export</Button>
                            </Tooltip>
                            <Popconfirm
                                title="Delete Case?"
                                description={`Are you sure you want to permanently delete case "${display_name || caseId}"?`}
                                onConfirm={handleDeleteCase}
                                okText="Yes, Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true, loading: isDeleting }}
                                disabled={isDeleting || loading} // Disable trigger if deleting/loading
                            >
                               <Tooltip title="Delete Case">
                                    <Button danger icon={<DeleteOutlined />} disabled={!caseDetails || isDeleting || loading} loading={isDeleting} />
                               </Tooltip>
                           </Popconfirm>
                        </Space>
                    </Col>
                </Row>
                {/* Progress Bar Example */}
                <Progress percent={caseProgress} status="active" style={{ marginTop: '16px' }} />
            </Card>

            {/* Quick Action Buttons */}
            <Card size="small" className="case-actions-card" style={{ marginBottom: '16px' }}>
                <Space wrap size="middle">
                    {/* --- MODIFIED Manage Files Button --- */}
                    <Button
                        type="primary"
                        icon={<FolderOutlined />}
                        onClick={handleOpenFilesModal} // <<< Uses handler to open modal
                        disabled={!caseDetails || loading}
                    >
                        Manage Files
                    </Button>
                    {/* --- END MODIFICATION --- */}

                    {/* Analyze Button (will be modified next) */}
                    <Button icon={<SearchOutlined />} disabled={!caseDetails || loading}>
                        <Link to={`/case/${caseId}/analyze`}>Analyze Documents</Link>
                    </Button>

                    {/* Create Doc Button (redundant, consider removing later) */}
                    <Button icon={<FileAddOutlined />} disabled={!caseDetails || loading}>
                        <Link to={`/case/${caseId}/create-doc`}>Create Document</Link>
                    </Button>

                     {/* Discovery Response Button */}
                    <Button icon={<FileDoneOutlined />} disabled={!caseDetails || loading}>
                        <Link to={`/case/${caseId}/create-discovery-response`}>Discovery Response</Link>
                    </Button>
                </Space>
            </Card>

            {/* Main Content Tabs */}
            {/* We will refactor the 'items' prop later */}
            <Card style={{ marginTop: '16px' }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    size="large"
                    items={[
                        { // Case Details Tab
                            label: (<span><InfoCircleOutlined /> Case Details</span>),
                            key: "details",
                            children: (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Card
                                        title="Official Details" type="inner"
                                        extra={<Button onClick={() => setIsAllDetailsModalOpen(true)}>Show All Details</Button>}
                                    >
                                         <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }} items={detailsItems} size="small" />
                                    </Card>
                                    {/* Add more detail sections here if needed */}
                                </Space>
                            )
                        },
                        { // Suggestions Tab
                            label: (
                                <span>
                                    <BulbOutlined /> Suggestions
                                    {/* Use suggestionsCount state for the badge */}
                                    {suggestionsCount > 0 && (<Badge count={suggestionsCount} offset={[5, -5]} size="small" />)}
                                </span>
                            ),
                            key: "suggestions",
                            children: (
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Card
                                        title="AI Analysis Suggestions" type="inner"
                                        extra={
                                            <Space>
                                                {hasSuggestions && (
                                                     <Popconfirm /* ... clear suggestions confirm props ... */
                                                        title="Clear all suggestions?"
                                                        description="This cannot be undone."
                                                        onConfirm={handleClearSuggestions}
                                                        okText="Yes, Clear All"
                                                        cancelText="No"
                                                        okButtonProps={{ danger: true }}
                                                        disabled={isApplying || isClearing || loading}
                                                    >
                                                         <Button danger size="small" loading={isClearing} disabled={isApplying || isClearing || loading}>
                                                             Clear All Suggestions
                                                         </Button>
                                                     </Popconfirm>
                                                )}
                                                <Button /* ... apply changes button props ... */
                                                    type="primary" size="small"
                                                    onClick={handleApplyChanges}
                                                    loading={isApplying}
                                                    disabled={Object.keys(acceptedSuggestions).length === 0 || isApplying || isClearing || loading}
                                                    icon={applySuccess ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : null}
                                                >
                                                     {isApplying ? 'Applying...' : (applySuccess ? 'Applied!' : 'Apply Selected')}
                                                </Button>
                                            </Space>
                                        }
                                    >
                                        {/* Suggestions List Logic */}
                                        {hasSuggestions ? (
                                            <Collapse accordion expandIconPosition="end" bordered={false}>
                                                {Object.entries(pendingSuggestions).map(([docKey, suggestions]) => (
                                                    <Collapse.Panel
                                                        header={<Space><FileTextOutlined /><span>Suggestions from: {docKey}</span></Space>}
                                                        key={docKey}
                                                    >
                                                        <List
                                                            itemLayout="vertical"
                                                            dataSource={Object.entries(suggestions)}
                                                            renderItem={([field, suggestedValue]) => {
                                                                // --- Add all filtering logic here ---
                                                                if (dismissedSuggestions[docKey]?.[field]) return null; // Dismissed
                                                                if (suggestedValue === null || suggestedValue === 0) return null; // Empty value

                                                                let currentValue = getCaseFieldValue(caseDetails, field);
                                                                let isRedundant = false;
                                                                // Simplified redundancy check (improve if needed)
                                                                if (currentValue !== undefined && currentValue !== null) {
                                                                    try { isRedundant = JSON.stringify(suggestedValue) === JSON.stringify(currentValue); }
                                                                    catch(e){ isRedundant = String(suggestedValue) === String(currentValue); }
                                                                }
                                                                if (isRedundant) return null;
                                                                // --- End filtering ---

                                                                return ( // Render List Item Card
                                                                    <List.Item key={field} style={{padding: '8px 0'}}>
                                                                        <Card size="small" bordered={false} style={{ background: '#f9f9f9' }}>
                                                                             <Space align="start" style={{ width: '100%' }}>
                                                                                 {/* Checkbox, Dismiss Button, Suggestion details */}
                                                                                  <Checkbox
                                                                                       style={{ paddingTop: '4px' }}
                                                                                       onChange={(e) => handleCheckboxChange(docKey, field, suggestedValue, e.target.checked)}
                                                                                       checked={acceptedSuggestions[docKey]?.[field] !== undefined}
                                                                                  />
                                                                                 <Popconfirm /* ... dismiss confirm props ... */
                                                                                       title="Dismiss suggestion?"
                                                                                       onConfirm={() => handleDismissLocally(docKey, field)}
                                                                                       okText="Dismiss" cancelText="Cancel" placement="top"
                                                                                  >
                                                                                     <Tooltip title="Dismiss this suggestion">
                                                                                         <Button type="text" danger size="small" icon={<CloseOutlined />} style={{ marginLeft: '8px', padding: '0 4px' }} />
                                                                                     </Tooltip>
                                                                                 </Popconfirm>
                                                                                 <div style={{ flexGrow: 1 }}>
                                                                                     <Text strong>{formatFieldName(field)}:</Text>
                                                                                     <Tag color="blue" style={{marginLeft: 8}}>Suggestion</Tag>
                                                                                     <Text code style={{ whiteSpace: 'pre-wrap', display: 'block', background: '#e6f7ff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #91d5ff', marginTop: 8 }}>
                                                                                          {JSON.stringify(suggestedValue, null, 2)}
                                                                                     </Text>
                                                                                      {currentValue !== undefined ? (
                                                                                         <div style={{ marginTop: 8 }}>
                                                                                             <Text type="secondary">Current Value:</Text>
                                                                                             <Text code type="secondary" style={{ whiteSpace: 'pre-wrap', display: 'block', background: '#fafafa', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d9d9d9' }}>
                                                                                                 {JSON.stringify(currentValue, null, 2)}
                                                                                             </Text>
                                                                                         </div>
                                                                                      ) : (
                                                                                         <div style={{ marginTop: 8 }}><Text type="secondary">Current: Not Set</Text></div>
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
                                        ) : ( // No Suggestions Empty State
                                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={
                                                <Space direction="vertical" align="center">
                                                    <Text>No pending suggestions found</Text>
                                                    {lastAnalyzedDocId && (<Text type="secondary">Last analyzed: doc_{lastAnalyzedDocId}</Text>)}
                                                    {/* Keep Analyze button for now, link will change later */}
                                                    <Button type="link" icon={<SearchOutlined />}>
                                                         <Link to={`/case/${caseId}/analyze`}>Analyze Documents</Link>
                                                    </Button>
                                                </Space>
                                            }/>
                                        )}
                                    </Card>
                                </Space>
                            )
                        },
                         { // Document Generation Tab (to be split later)
                             label: (<span><FileTextOutlined /> Document Generation</span>),
                             key: "generate",
                             children: (
                                 <Space direction="vertical" style={{ width: '100%' }}>
                                     <Card title="Generate Legal Document Content" type="inner">
                                         {/* Generation Error Alert */}
                                         {generationError && (
                                             <Alert /* ... props ... */
                                                 message="Generation Error" description={generationError} type="error" showIcon closable onClose={() => setGenerationError(null)} style={{ marginBottom: 16 }}
                                             />
                                         )}
                                         <Row gutter={[16, 16]}> <Col span={24}> <Form layout="vertical">
                                            {/* Doc Type Select */}
                                             <Form.Item label="Document Type" required tooltip="Select AI document type">
                                                 <Select /* ... props ... */
                                                    value={selectedDocType} onChange={setSelectedDocType} loading={docTypes.length === 0 && !generationError}
                                                    disabled={isGenerating || docTypes.length === 0} placeholder="Select document type..." style={{ width: '100%' }}
                                                 >
                                                      {docTypes.map(type => (<Select.Option key={type} value={type}><Space><FileTextOutlined />{type}</Space></Select.Option>))}
                                                 </Select>
                                             </Form.Item>
                                             {/* Custom Instructions */}
                                             <Form.Item label="Custom Instructions" tooltip="Add specific requirements">
                                                  <TextArea /* ... props ... */
                                                     rows={4} placeholder="Add custom instructions (optional)" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} disabled={isGenerating}
                                                  />
                                             </Form.Item>
                                             {/* Generate Button */}
                                             <Form.Item>
                                                  <Button /* ... props ... */
                                                     type="primary" onClick={handleGenerateDocument} loading={isGenerating}
                                                     disabled={!selectedDocType || isGenerating || docTypes.length === 0} icon={<FileAddOutlined />} block
                                                  >
                                                      {isGenerating ? 'Generating...' : 'Generate Content'}
                                                  </Button>
                                             </Form.Item>
                                         </Form> </Col> </Row>

                                         {/* Loading Indicator */}
                                          {isGenerating && !generationResult && ( <div style={{ marginTop: 16, textAlign: 'center' }}><Spin size="large" tip="Generating..." /></div> )}

                                         {/* Result Display */}
                                          {generationResult && (
                                             <Card /* ... props ... */
                                                type="inner" title="Generated Content" style={{ marginTop: 16 }} className="generated-document-card"
                                                extra={ <Space> {/* Copy, Download (placeholder), Dismiss buttons */}
                                                      <Button icon={<CopyOutlined />} onClick={handleCopyGeneratedText} disabled={copied}>{copied ? 'Copied!' : 'Copy'}</Button>
                                                      <Tooltip title="Download as Word (Requires Template)"><Button icon={<DownloadOutlined />} disabled>Download</Button></Tooltip>
                                                      <Popconfirm title="Dismiss generated text?" onConfirm={handleDismissGeneratedText} okText="Yes" cancelText="No">
                                                          <Button danger icon={<CloseOutlined />}>Dismiss</Button>
                                                      </Popconfirm>
                                                </Space>}
                                             >
                                                 <div className="document-preview" style={{ /* styles... */ padding: '15px', border: '1px solid #f0f0f0', maxHeight: '400px', overflowY: 'auto', background: '#fff' }}>
                                                      <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{generationResult}</Paragraph>
                                                 </div>
                                             </Card>
                                          )}
                                     </Card>
                                 </Space>
                             )
                         }
                    ]} // End Tabs items array
                />
            </Card>

            {/* Footer Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '20px' }}>
                <Button type="default">
                    <Link to="/manage-cases">
                        <Space><RightOutlined style={{ transform: 'rotate(180deg)' }} /> Back to Cases</Space>
                    </Link>
                </Button>
                {/* Add other footer elements if needed */}
            </div>


            {/* --- MODALS --- */}
            {/* Files Management Modal */}
            {/* Ensure Modal is imported from 'antd' */}
            <Modal
                title={`Manage Documents for: ${caseDetails?.display_name || `Case ${caseId}`}`}
                open={isFilesModalOpen}
                onCancel={handleCloseFilesModal} // Use the correct close handler
                width={900}
                footer={null} // Actions are inside CaseFilesManager
                destroyOnClose={true} // Keep modal state fresh
            >
                 {/* Render content only when modal is open AND caseId is valid */}
                 {/* This passes the required caseId to the component and its hook */}
                 {(isFilesModalOpen && caseId) && (
                    <CaseFilesManager caseId={caseId} />
                 )}
            </Modal>

            {/* Edit Case Modal */}
            <Modal
                title="Edit Case Information"
                open={isEditModalOpen}
                onCancel={() => { setIsEditModalOpen(false); setEditError(null); /* Reset form? */ }}
                confirmLoading={editLoading}
                // Use AntD form instance's submit() method triggered by Button onClick
                // Alternatively, keep handleSaveChanges and trigger manually
                footer={[
                     <Button key="back" onClick={() => setIsEditModalOpen(false)} disabled={editLoading}>Cancel</Button>,
                     <Button key="submit" type="primary" loading={editLoading} onClick={handleSaveChanges}>Save Changes</Button>,
                     // Or: <Button key="submit" type="primary" loading={editLoading} onClick={() => form.submit()}>Save Changes</Button>,
                ]}
                destroyOnClose // Reset form fields on close
                maskClosable={!editLoading}
                width={700}
            >
                {/* Edit Modal Content */}
                {editError && ( <Alert /* ... props ... */ message="Save Error" description={editError} type="error" showIcon closable onClose={() => setEditError(null)} style={{ marginBottom: 16 }}/> )}
                <Form form={form} layout="vertical" onFinish={handleSaveChanges} /* Remove onFinish if using form.submit() */ >
                     <Row gutter={[16, 0]}>
                         {caseFieldConfig.filter(field => field.isEditable === true).map(field => (
                             <Col xs={24} sm={field.span === 3 ? 24 : 12} md={field.span === 3 ? 24 : 12} key={field.name}>
                                 <Form.Item /* ... props ... */ label={field.label} name={field.name} required={field.isRequired} rules={[{ required: field.isRequired, message: `Please input ${field.label}!` }]} >
                                      {field.type === 'textarea' ? (<TextArea /* ... */ name={field.name} disabled={editLoading} placeholder={field.placeholder} rows={4} />)
                                       : (<Input /* ... */ name={field.name} disabled={editLoading} placeholder={field.placeholder} prefix={field.name.includes('date') ? <CalendarOutlined /> : null} />)}
                                 </Form.Item>
                             </Col>
                         ))}
                     </Row>
                 </Form>
            </Modal>

            {/* All Details Modal */}
            <Modal
                title="All Case Details"
                open={isAllDetailsModalOpen}
                onCancel={() => setIsAllDetailsModalOpen(false)}
                footer={[ <Button key="close" onClick={() => setIsAllDetailsModalOpen(false)}>Close</Button> ]}
                width={800}
                destroyOnClose
            >
                {/* All Details Content */}
                 {caseDetails && allDetailsItems.length > 0 ? ( // Check caseDetails exists
                     <Tabs defaultActiveKey="table" items={[
                          { key: 'table', label: 'Table View', children: (<Descriptions bordered column={1} items={allDetailsItems} size="small" />) },
                          { key: 'json', label: 'JSON View', children: (<div style={{ background: '#f6f8fa', padding: '12px', borderRadius: '4px', maxHeight: '500px', overflowY: 'auto' }}><pre style={{ margin: 0 }}>{JSON.stringify(caseDetails, null, 2)}</pre></div>) }
                     ]} />
                 ) : (<Empty description="Details not available" />)}
            </Modal>

        </div> // End case-page-container
    );
}

export default CasePage;
// --- END: Complete src/pages/CasePage.jsx ---