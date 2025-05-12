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
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import DiscoveryLandingPage from './pages/DiscoveryLandingPage';
import PropoundingDiscoveryPage from './pages/PropoundingDiscoveryPage';
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
  FileAddOutlined,
  FileSearchOutlined,
  AppstoreOutlined
} from '@ant-design/icons';

// Import Pages
import ManageCasesScreen from './pages/ManageCasesScreen';
import CasePage from './pages/CasePage/index';
import FilesPage from './pages/FilesPage';
import DocumentAnalysisPage from './pages/DocumentAnalysisPage';
import CreateDocumentPage from './pages/CreateDocumentPage';
import CreateCasePage from './pages/CreateCasePage';
import RegistrationPage from './pages/RegistrationPage';
import CreateDiscoveryPage2 from './pages/CreateDiscoveryPage2';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfileDropdown from './components/UserProfileDropdown';
import { Navigate } from 'react-router-dom'; // If not already imported

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
                    icon: <AppstoreOutlined />,
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
                    icon: <FileAddOutlined />,
                    label: 'Create Doc'
                  },
                  {
                    key: `${location.pathname.split('/').slice(0, 3).join('/')}/discovery`,
                    icon: <FileSearchOutlined />,
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
          background: 'rgba(255,255,255,0.55)', // More translucent
          backdropFilter: 'blur(12px)', // Frosted glass effect
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1.5px solid rgba(200,200,200,0.25)', // Subtle border
          boxShadow: '0 2px 12px 0 rgba(31, 38, 135, 0.07)',
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
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7A4D3B 0%, #A0522D 100%)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '20px',
                      fontFamily: 'Segoe UI, Arial, sans-serif',
                      boxShadow: '0 2px 8px rgba(122,77,59,0.10)',
                    }}>
                      CL
                    </div>
                    <span style={{ 
                      color: '#7A4D3B',
                      fontWeight: 700,
                      fontSize: '20px',
                      fontFamily: 'Segoe UI, Arial, sans-serif',
                      marginLeft: 8,
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
                  fontWeight: 500,
                  color: token.colorTextBase,
                  letterSpacing: '1.5px',
                  textShadow: '0 2px 8px rgba(122,77,59,0.10)',
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
                <UserProfileDropdown 
                  currentUser={currentUser} 
                  logout={logout} 
                  token={token} 
                />
            )}
          </div>
        </Header>
        
        {/* Main Content */}
        <Content style={{ 
          padding: '24px',
          minHeight: '280px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}>
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
                <Route 
                    path="/case/:caseId/create-discovery-response" 
                    element={<Navigate to={params => `/case/${params.caseId}/discovery`} replace />} 
                  />                
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/profile" element={<ProfilePage />} />  {/* Add this line */}
                <Route path="/case/:caseId/discovery" element={<DiscoveryLandingPage />} />
                <Route path="/case/:caseId/propound-discovery" element={<PropoundingDiscoveryPage />} />
                <Route path="/case/:caseId/respond-discovery" element={<CreateDiscoveryPage2 />} />
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