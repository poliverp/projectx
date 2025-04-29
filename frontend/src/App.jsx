// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  NavLink, 
  useLocation,
  useNavigate
} from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Ant Design imports
import { 
  Layout, 
  Menu, 
  Button, 
  Dropdown, 
  Avatar, 
  Space, 
  ConfigProvider,
  Typography,
  Breadcrumb,
  Card,
  Spin,
  Divider,
  theme
} from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined,
  HomeOutlined,
  FolderOutlined,
  FileOutlined,
  PlusOutlined,
  SettingOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SearchOutlined,
  BellOutlined
} from '@ant-design/icons';

// Import Pages
import ManageCasesScreen from './pages/ManageCasesScreen';
import CasePage from './pages/CasePage';
import FilesPage from './pages/FilesPage';
import DocumentAnalysisPage from './pages/DocumentAnalysisPage';
import CreateDocumentPage from './pages/CreateDocumentPage';
import CreateCasePage from './pages/CreateCasePage';
import RegistrationPage from './pages/RegistrationPage';
import CreateDiscoveryPage2 from './pages/CreateDiscoveryPage2';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Destructure AntD Layout components
const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;
const { useToken } = theme;

// Define enhanced theme
const customTheme = {
  token: {
    // Color Palette
    colorPrimary: '#7A4D3B', // Richer brown for primary elements
    colorInfo: '#7A4D3B',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    
    // Fonts
    fontFamily: '"Segoe UI", Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
    
    // Rounded corners
    borderRadius: 4,
    
    // Shadows
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    
    // Other
    colorBgBase: '#F9F9F9', // Light background
    colorTextBase: '#444444', // Slightly softer than black
  },
  components: {
    Button: {
      colorPrimaryHover: '#8D5A45', // Slightly lighter on hover
    },
    Menu: {
      colorItemBgSelected: 'rgba(122, 77, 59, 0.1)', // Transparent brown for selected
      colorItemTextSelected: '#7A4D3B', // Same as primary
    },
    Card: {
      colorBorderSecondary: '#E8E8E8',
    }
  }
};

// Logo component
const Logo = ({ collapsed }) => (
  <div className="logo" style={{ 
    padding: collapsed ? '16px 8px' : '16px 24px',
    transition: 'all 0.3s',
    textAlign: collapsed ? 'center' : 'left',
    overflow: 'hidden'
  }}>
    {collapsed ? (
      <div style={{ 
        width: '32px', 
        height: '32px', 
        borderRadius: '4px',
        background: 'linear-gradient(135deg, #7A4D3B 0%, #A0522D 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto',
        color: '#fff',
        fontWeight: 'bold'
      }}>
        CL
      </div>
    ) : (
      <Space>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '4px',
          background: 'linear-gradient(135deg, #7A4D3B 0%, #A0522D 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
          fontWeight: 'bold'
        }}>
          CL
        </div>
        <span style={{ 
          color: '#7A4D3B', 
          fontWeight: 'bold', 
          fontSize: '18px',
          letterSpacing: '0.5px'
        }}>
          ClerkLegal
        </span>
      </Space>
    )}
  </div>
);

// Path to breadcrumb mapping
const pathToBreadcrumb = {
  'manage-cases': 'My Cases',
  'cases/new': 'New Case',
  'case': 'Case Details',
  'files': 'Files',
  'analyze': 'Analysis',
  'create-doc': 'Create Document',
  'create-discovery-response': 'Discovery Response',
};

// Breadcrumb component
const PageBreadcrumb = () => {
  const location = useLocation();
  const pathSnippets = location.pathname.split('/').filter(i => i);

    // ---### START REPLACEMENT ###---
  // Build breadcrumb items dynamically
  const breadcrumbItems = pathSnippets
    .map((snippet, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
      const isLast = index === pathSnippets.length - 1;

      // --- Logic Modification ---
      // 1. Skip the 'case' path segment entirely
      if (snippet === 'case' && index === 0) { // Check if it's the first segment after root
          return null; // Don't create a breadcrumb item for '/case'
      }

      // 2. Handle the Case ID segment (now the second segment, index 1, if '/case' was skipped)
      // Or more robustly, check if the previous segment was 'case'
      const isCaseIdSegment = index > 0 && pathSnippets[index - 1] === 'case';

      let displayName;
      if (isCaseIdSegment && isLast) {
          // For now, just display the Case ID itself as the last item
          // TODO: Fetch display_name later if needed
          displayName = `Case ${snippet}`; // Display "Case [ID]"
      } else {
          // Use mapping for other known segments or format the snippet
          displayName = pathToBreadcrumb[snippet] || (snippet.charAt(0).toUpperCase() + snippet.slice(1));
      }

      // --- End Logic Modification ---

      return {
        // Only make it a link if it's NOT the last item
        title: isLast ? displayName : <Link to={url}>{displayName}</Link>,
        // Optional: Add key if needed for React list rendering
        // key: url,
      };
    })
    .filter(item => item !== null); // Remove any null items created by skipping '/case'
  // ---### END REPLACEMENT ###---

  // Always add Home at the beginning
  breadcrumbItems.unshift({
    title: <Link to="/manage-cases"><HomeOutlined /></Link>,
  });

  return (
    <Breadcrumb 
      items={breadcrumbItems}
      style={{ marginBottom: '16px' }}
    />
  );
};

// Main App component
function AppContent() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useToken();
  
  // State for collapsed sidebar
  const [collapsed, setCollapsed] = useState(false);
  
  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // User dropdown menu items
  const userMenuItems = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      onClick: () => navigate('/settings')
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: logout,
      danger: true
    }
  ];

  // Sidebar menu items
  const sidebarMenuItems = currentUser
    ? [
        {
          key: '/manage-cases',
          icon: <FolderOutlined />,
          label: 'My Cases',
        },
        {
          key: '/cases/new',
          icon: <PlusOutlined />,
          label: 'New Case',
        },
        // Can add more main sections here
      ]
    : [];

  // Determine which key should be active
  let selectedKeys = [location.pathname];
  if (currentUser && (location.pathname === '/' || location.pathname.startsWith('/case/'))) {
    const key = location.pathname.startsWith('/case/') 
      ? '/manage-cases' // Keep "My Cases" active when viewing a specific case
      : '/manage-cases'; // Default to My Cases for root when logged in
    selectedKeys = [key];
  } else if (!currentUser && (location.pathname === '/' || location.pathname === '/login')) {
    selectedKeys = ['/'];
  }

  // Check if user is on a page that should show breadcrumbs
  const showBreadcrumbs = currentUser && location.pathname !== '/' && 
                          location.pathname !== '/login' && location.pathname !== '/register';

  // Determine if we're looking at a specific case
  const isCasePage = location.pathname.match(/^\/case\/[^\/]+/);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Toast notifications */}
      <ToastContainer
        position="top-right" 
        autoClose={4000} 
        hideProgressBar={false}
        newestOnTop={false} 
        closeOnClick 
        rtl={false}
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="light"
      />
      
      {/* Show sidebar only for logged in users */}
      {currentUser && (
        <Sider
          width={220}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 2,
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
          }}
          theme="light"
        >
          <Logo collapsed={collapsed} />
          
          <Divider style={{ margin: '0 0 8px 0' }} />
          
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={selectedKeys}
            items={sidebarMenuItems}
            onClick={({ key }) => navigate(key)}
          />
          
          {/* Show submenu for case-specific pages if we're on a case page */}
          {isCasePage && (
            <>
              <Divider style={{ margin: '16px 0 8px 0' }} />
              <Text 
                type="secondary" 
                style={{ 
                  padding: collapsed ? '0 16px' : '0 24px',
                  display: collapsed ? 'none' : 'block',
                  fontSize: '12px'
                }}
              >
                CASE ACTIONS
              </Text>
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[location.pathname]}
                style={{ marginTop: collapsed ? '8px' : '4px' }}
                items={[
                  {
                    key: location.pathname.split('/').slice(0, 3).join('/'),
                    icon: <FileOutlined />,
                    label: 'Overview'
                  },
                  {
                    key: `${location.pathname.split('/').slice(0, 3).join('/')}/files`,
                    icon: <FolderOutlined />,
                    label: 'Files'  
                  },
                  {
                    key: `${location.pathname.split('/').slice(0, 3).join('/')}/analyze`,
                    icon: <SearchOutlined />,
                    label: 'Analysis'
                  },
                  {
                    key: `${location.pathname.split('/').slice(0, 3).join('/')}/create-doc`,
                    icon: <FileOutlined />,
                    label: 'Create Doc'
                  },
                  {
                    key: `${location.pathname.split('/').slice(0, 3).join('/')}/create-discovery-response`,
                    icon: <FileOutlined />,
                    label: 'Discovery'
                  }
                ]}
                onClick={({ key }) => navigate(key)}
              />
            </>
          )}
        </Sider>
      )}
      
      <Layout style={{ 
        marginLeft: currentUser ? (collapsed ? 80 : 220) : 0,
        transition: 'margin-left 0.3s'
      }}>
        {/* Enhanced Header */}
        <Header style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fff',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          height: '64px',
          width: '100%',
        }}>
          {/* Left side of header */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Show logo in header for non-logged in users */}
            {!currentUser && (
              <div style={{ marginRight: '24px' }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                  <Space>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '4px',
                      background: 'linear-gradient(135deg, #7A4D3B 0%, #A0522D 100%)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}>
                      CL
                    </div>
                    <span style={{ 
                      color: '#7A4D3B', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      letterSpacing: '0.5px'
                    }}>
                      ClerkLegal
                    </span>
                  </Space>
                </Link>
              </div>
            )}
            
            {/* For logged in users, title or page specific title */}
            {currentUser && (
              <Title 
                level={4} 
                style={{ 
                  margin: 0, 
                  fontWeight: '600',
                  color: token.colorTextBase
                }}
              >
                {/* Dynamic title based on location */}
                {(() => {
                  if (location.pathname.includes('/manage-cases')) return 'My Cases';
                  if (location.pathname.includes('/cases/new')) return 'Create New Case';
                  if (location.pathname.includes('/files')) return 'Case Files';
                  if (location.pathname.includes('/analyze')) return 'Document Analysis';
                  if (location.pathname.includes('/create-doc')) return 'Create Document';
                  if (location.pathname.includes('/create-discovery')) return 'Discovery Response';
                  if (location.pathname.includes('/case/')) return 'Case Details';
                  return 'ClerkLegal';
                })()}
              </Title>
            )}
          </div>
          
          {/* Right side of header */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Main navigation for non-logged in users */}
            {!currentUser && (
              <Menu
                theme="light"
                mode="horizontal"
                selectedKeys={[location.pathname === '/' ? '/' : location.pathname]}
                style={{ 
                  border: 'none',
                  background: 'transparent'
                }}
                items={[
                  { key: '/', label: <Link to="/">Login</Link> },
                  { key: '/register', label: <Link to="/register">Register</Link> }
                ]}
              />
            )}
            
            {/* Notification icon for logged in users */}
            {currentUser && (
              <Space size="large">
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: '18px' }} />}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />
                
                {/* User avatar/dropdown */}
                <Dropdown 
                  menu={{ items: userMenuItems }} 
                  placement="bottomRight" 
                  trigger={['click']}
                  arrow={{
                    pointAtCenter: true,
                  }}
                >
                  <Space style={{ cursor: 'pointer' }}>
                    <Avatar 
                      style={{ 
                        backgroundColor: token.colorPrimary,
                        cursor: 'pointer' 
                      }} 
                      icon={<UserOutlined />} 
                    />
                    <Text 
                      style={{ 
                        fontWeight: '500',
                        display: 'inline-block',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentUser.name || currentUser.email || 'User'}
                    </Text>
                  </Space>
                </Dropdown>
              </Space>
            )}
          </div>
        </Header>
        
        {/* Main Content */}
        <Content style={{ 
          padding: '24px',
          minHeight: '280px',
          backgroundColor: token.colorBgBase,
        }}>
          {/* Show breadcrumbs for logged in users on nested pages */}
          {showBreadcrumbs && <PageBreadcrumb />}
          
          {/* Main content card container */}
          <Card 
            bordered={false}
            style={{ 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              marginBottom: '24px'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/manage-cases" element={<ManageCasesScreen />} />
                <Route path="/cases/new" element={<CreateCasePage />} />
                <Route path="/case/:caseId" element={<CasePage />} />
                <Route path="/case/:caseId/files" element={<FilesPage />} />
                <Route path="/case/:caseId/analyze" element={<DocumentAnalysisPage />} />
                <Route path="/case/:caseId/create-doc" element={<CreateDocumentPage />} />
                <Route path="/case/:caseId/create-discovery-response" element={<CreateDiscoveryPage2 />} />
              </Route>

              {/* Not Found Route */}
              <Route path="*" element={
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <Title level={2}>404 - Page Not Found</Title>
                  <Button type="primary">
                    <Link to="/">Go Home</Link>
                  </Button>
                </div>
              } />
            </Routes>
          </Card>
        </Content>
        
        {/* Enhanced Footer */}
        <Footer style={{ 
          textAlign: 'center', 
          padding: '16px',
          background: '#f9f9f9',
          borderTop: '1px solid #eaeaea',
          fontSize: '14px',
          color: 'rgba(0, 0, 0, 0.45)'
        }}>
          ClerkLegal · AI-powered litigation support ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
}

// Wrapper component
function App() {
  return (
    <ConfigProvider theme={customTheme}>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;