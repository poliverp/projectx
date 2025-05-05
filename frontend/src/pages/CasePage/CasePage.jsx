// Updated CasePage/index.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Card, Space, Button, Tabs, Modal, Alert, Spin, Badge
} from 'antd';
import { 
  RightOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  FileTextOutlined
} from '@ant-design/icons';

// Import our components and hooks
import { useCaseDetails } from './hooks/useCaseDetails';
import CaseHeader from './components/CaseHeader';
import CaseActionsBar from './components/CaseActionsBar';
import CaseFilesManager from './components/CaseFilesManager';
import DocumentAnalysisModal from './components/modals/DocumentAnalysisModal';
import EditCaseModal from './components/modals/EditCaseModal';
import AllDetailsModal from './components/modals/AllDetailsModal';
import CaseDetailsTab from './components/tabs/CaseDetailsTab';
import SuggestionsTab from './components/tabs/SuggestionsTab';
import DocumentGenerationTab from './components/tabs/DocumentGenerationTab';

function CasePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  
  // State for modals
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAllDetailsModalOpen, setIsAllDetailsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [autoExpandSuggestions, setAutoExpandSuggestions] = useState(false);

  
  // Active tab state
  const [activeTab, setActiveTab] = useState("details");
  
  // Use our custom hook
  const {
    caseDetails,
    loading,
    error,
    suggestionsCount,
    fetchCaseDetails,
    updateCase,
    deleteCase
  } = useCaseDetails(caseId);
  
  // Initial data fetch
  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);
  
  // Event handlers
  const handleEdit = () => setIsEditModalOpen(true);
  
  const handleExport = () => {
    console.log("Export functionality to be implemented");
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteCase();
    if (success) {
      navigate('/manage-cases');
    }
    setIsDeleting(false);
  };
  

  const switchToSuggestionsTab = () => {
    setActiveTab("suggestions");
    setAutoExpandSuggestions(true);
    
    // Reset the auto-expand flag after a short delay
    setTimeout(() => {
      setAutoExpandSuggestions(false);
    }, 500);
  };
  // Modal handlers
  const handleOpenFilesModal = () => setIsFilesModalOpen(true);
  const handleCloseFilesModal = () => setIsFilesModalOpen(false);
  
  const handleOpenAnalysisModal = () => setIsAnalysisModalOpen(true);
  const handleCloseAnalysisModal = () => {
    setIsAnalysisModalOpen(false);
    fetchCaseDetails();
  };
  
  // Loading state
  if (loading && !isDeleting) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <span>Loading case details...</span>
        </Space>
      </div>
    );
  }
  
  // Error state
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
  
  // Not found state
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
          style={{ marginBottom: '16px' }}
        />
      )}
      
      {/* Header Section */}
      <Card className="case-header-card">
        <CaseHeader 
          caseDetails={caseDetails}
          onEdit={handleEdit}
          onExport={handleExport}
          onDelete={handleDelete}
          loading={loading}
          isDeleting={isDeleting}
        />
      </Card>
      
      {/* Quick Action Buttons */}
      <CaseActionsBar 
        caseId={caseId}
        onManageFiles={handleOpenFilesModal}
        onAnalyzeDocuments={handleOpenAnalysisModal}
      />
      
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
                  <InfoCircleOutlined  />
                  Case Details
                </span>
              ),
              key: "details",
              children: (
                <CaseDetailsTab 
                  caseDetails={caseDetails} 
                  onShowAllDetails={() => setIsAllDetailsModalOpen(true)}
                />
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
                <SuggestionsTab
                  caseDetails={caseDetails}
                  refreshCase={fetchCaseDetails}
                  caseId={caseId}
                  autoExpand={autoExpandSuggestions}
                />
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
                <DocumentGenerationTab caseId={caseId} />
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
      
      {/* Modals */}
      <Modal
        title="Manage Documents"
        open={isFilesModalOpen}
        onCancel={handleCloseFilesModal}
        footer={null}
        width={800}
      >
        <CaseFilesManager caseId={caseId} />
      </Modal>
      
      <Modal
        title="Analyze Document"
        open={isAnalysisModalOpen}
        onCancel={handleCloseAnalysisModal}
        footer={null}
        width={700}
      >
        <DocumentAnalysisModal 
          caseId={caseId} 
          onComplete={handleCloseAnalysisModal}
          switchToSuggestionsTab={switchToSuggestionsTab}
        />
      </Modal>
      
      {/* Edit Case Modal */}
      <EditCaseModal
        isOpen={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onSave={async (values) => {
          try {
            await updateCase(values);
            setIsEditModalOpen(false);
          } catch (err) {
            // Error handling is done in updateCase
          }
        }}
        caseDetails={caseDetails}
        loading={loading}
      />
      
      {/* All Details Modal */}
      <AllDetailsModal
        isOpen={isAllDetailsModalOpen}
        onCancel={() => setIsAllDetailsModalOpen(false)}
        caseDetails={caseDetails}
      />
    </div>
  );
}

export default CasePage;