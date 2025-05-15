// Updated CasePage/index.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Card, Space, Button, Tabs, Modal, Alert, Spin, Badge, Typography
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
import CaseDetailsSidebar from './components/CaseDetailsSidebar';
import './styles.css';
import CaseCalendar from "./components/CaseCalendar";
import './calendar.css';
import DiscoveryTab from './components/tabs/DiscoveryTab';

const { Title } = Typography;

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
  const [activeTab, setActiveTab] = useState("generate");  
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
      {/* Global Error Banner - unchanged */}
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
      
      {/* Header Section - full width at top */}
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
      
      {/* Main container with flex layout - starting below header */}
      <div style={{ display: 'flex', gap: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Left column - Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Quick Action Buttons */}
          <CaseActionsBar 
            caseId={caseId}
            onManageFiles={handleOpenFilesModal}
            onAnalyzeDocuments={handleOpenAnalysisModal}
          />
          
          {/* Main Content Tabs */}
          <Card style={{ marginTop: '16px', height: '500px', overflow: 'hidden' }}>
            <div style={{ 
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#fff',
              borderBottom: '1px solid #f0f0f0',
              padding: '0 16px',
            }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                size="large"
                items={[
                  {
                    label: (
                      <span>
                        <FileTextOutlined />
                        Document Generation
                      </span>
                    ),
                    key: "generate",
                    children: (
                      <div style={{ height: 'calc(500px - 54px)', overflowY: 'auto', padding: '16px' }}>
                        <DocumentGenerationTab caseId={caseId} />
                      </div>
                    )
                  },
                  {
                    label: (
                      <span>
                        <BulbOutlined />
                        Suggestions
                      </span>
                    ),
                    key: "suggestions",
                    children: (
                      <div style={{ height: 'calc(500px - 54px)', overflowY: 'auto', padding: '16px' }}>
                        <SuggestionsTab
                          caseDetails={caseDetails}
                          refreshCase={fetchCaseDetails}
                          caseId={caseId}
                          autoExpand={autoExpandSuggestions}
                          onAnalyzeDocuments={handleOpenAnalysisModal} 
                        />
                      </div>
                    )
                  },
                  {
                    label: (
                      <span>
                        <InfoCircleOutlined />
                        Discovery Response
                      </span>
                    ),
                    key: "discovery",
                    children: (
                      <div style={{ height: 'calc(500px - 54px)', overflowY: 'auto', padding: '16px' }}>
                        <DiscoveryTab caseId={caseId} userId={caseDetails?.user_id} />
                      </div>
                    )
                  },
                ]}
              />
            </div>
          </Card>

          <CaseCalendar caseDetails={caseDetails} />
          
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
        </div>
        
        {/* Right column - Case Details Sidebar */}
        <div style={{ 
          width: '400px',
          position: 'sticky',
          top: '16px',
          alignSelf: 'flex-start',
          height: 'calc(100vh - 120px)',
          marginTop: '16px',
          marginBottom: '24px',
        }}>
          <Card 
            style={{ 
              height: '100%',
              overflow: 'hidden',
              borderRadius: '8px',
            }}
            bodyStyle={{
              height: '100%',
              padding: 0, // Remove padding from card body
            }}
          >
            {/* Sticky header */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              padding: '16px 16px 8px',
              borderBottom: '1px solid #f0f0f0',
              background: '#fff',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
            }}>
              <Title level={4} style={{ 
                margin: 0, 
                fontWeight: 600,
                fontSize: '18px',
              }}>
                Case Details
              </Title>
            </div>
            
            {/* Scrollable content */}
            <div style={{ 
              height: 'calc(100% - 50px)', // Adjust for header height
              overflowY: 'auto',
              padding: '0 16px 16px',
            }}>
              <CaseDetailsSidebar 
                caseDetails={caseDetails}
                onShowAllDetails={() => setIsAllDetailsModalOpen(true)}
                hideTitle={true} // Add this prop to hide the title in the component
              />
            </div>
          </Card>
        </div>
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