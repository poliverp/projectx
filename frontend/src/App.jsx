// frontend/src/App.jsx
import React from 'react';
// ADDED: useLocation for Menu active state
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Import useAuth
import { ToastContainer } from 'react-toastify'; // Keep ToastContainer import
import 'react-toastify/dist/ReactToastify.css';
// --- ADDED: Import Ant Design components ---
import { Layout, Menu, Button, Dropdown, Avatar, Space, ConfigProvider } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
// --- END ADDED ---

// --- Import Pages ---
import ManageCasesScreen from './pages/ManageCasesScreen';
import CasePage from './pages/CasePage';
import FilesPage from './pages/FilesPage';
import DocumentAnalysisPage from './pages/DocumentAnalysisPage';
import CreateDocumentPage from './pages/CreateDocumentPage';
import CreateCasePage from './pages/CreateCasePage';
import RegistrationPage from './pages/RegistrationPage';
import CreateDiscoveryPage2 from'./pages/CreateDiscoveryPage2'; // Ensure correct name
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// --- ADDED: Destructure AntD Layout components ---
const { Header, Content, Footer } = Layout;

// --- ADDED: Define basic AntD theme object ---
const customTheme = {
  token: {
    // Color Palette
    colorPrimary: '#A0522D', // Example: Sienna brown for primary elements (buttons, active states) - CHANGE THIS!
    colorInfo: '#A0522D', // Use primary color for info states too?
    colorSuccess: '#52c41a', // AntD default green
    colorWarning: '#faad14', // AntD default orange
    colorError: '#f5222d', // AntD default red

    // Base Text & Backgrounds (AntD defaults are usually good, but can override)
    // colorTextBase: '#333333', // Base text color
    // colorBgLayout: '#f0f2f5', // Layout background (like default footer)
    // colorBgContainer: '#ffffff', // Container background (like default header/content)

    // Font
    // fontFamily: 'Roboto, sans-serif', // Example: Specify a custom font family

    // Border Radius (optional)
    // borderRadius: 4, // Slightly less rounded corners? (default is 6)
  },
  // Can also configure component-specific styles here later
  // components: {
  //   Button: {
  //     colorPrimary: '#AnotherBrown?', // Override button primary specifically
  //   }
  // }
};
// --- END ADDED ---

function App() {
  const { currentUser, logout } = useAuth(); // Get user state and logout function
  const location = useLocation(); // Get location for active menu state

  // --- ADDED: Define items for the User Dropdown Menu ---
  const userMenuItems = [
    // { key: 'profile', label: (<Link to="/profile">Profile</Link>) }, // Example Profile Link for later
    // { type: 'divider' }, // Optional divider
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: logout // Call the logout function from AuthContext
      // danger: true, // Optional: makes item red
    }
  ];

  // --- ADDED: Determine active menu key based on current path ---
  let selectedKeys = [location.pathname];
  // Handle edge cases for highlighting keys correctly
  if (!currentUser && (location.pathname === '/' || location.pathname === '/login')) {
       selectedKeys = ['/']; // Highlight Login key if at root or /login when logged out
  } else if (currentUser && (location.pathname === '/' || location.pathname.startsWith('/case/'))) {
       // If logged in and at root or a case page, highlight My Cases
       selectedKeys = ['/manage-cases'];
  } else if (location.pathname === '/register') {
      selectedKeys = ['/register']; // Highlight Register key if on that page
  }


  // --- ADDED: Define items for main Nav Menu ---
  const navMenuItems = currentUser
      ? [ // Logged In Items
          { key: '/manage-cases', label: <Link to="/manage-cases">My Cases</Link> },
          // Add other main logged-in links here, e.g.:
          // { key: '/settings', label: <Link to="/settings">Settings</Link> },
        ]
      : [ // Logged Out Items
          { key: '/', label: <Link to="/">Login</Link> }, // Link root to Login
          // { key: '/register', label: <Link to="/register">Register</Link> }, // Register button is separate now
        ];


  return (
    <ConfigProvider theme={customTheme}>
      <Layout className="app-container" style={{ minHeight: '100vh' }}>
        {/* Keep ToastContainer */}
        <ToastContainer
            position="top-right" autoClose={4000} hideProgressBar={false}
            newestOnTop={false} closeOnClick rtl={false}
            pauseOnFocusLoss draggable pauseOnHover theme="light"
        />
        {/* MODIFIED: Use AntD Header */}
        <Header style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#fff', // Default white background
            paddingInline: '20px', // Adjust padding as needed
            position: 'sticky', top: 0, zIndex: 1, width: '100%' // Make header sticky
         }}>
          {/* Logo/Brand */}
          <div className="logo" style={{ color: '#333', marginRight: 'auto', fontWeight: 'bold', fontSize: '1.2em' }}>
            {/* Make logo link home appropriately */}
            <Link to={currentUser ? "/manage-cases" : "/"} style={{ color: 'inherit', textDecoration: 'none' }}>
                AI Litigator
            </Link>
          </div>

          {/* MODIFIED: Use AntD Menu for Nav links (pushed towards center/right) */}
          {/* Note: For complex nav, AntD recommends Menu inside Header content, not flex nav */}
          {/* This places Menu between Logo and Auth actions */}
           <Menu
              theme="light"
              mode="horizontal"
              selectedKeys={selectedKeys}
              items={navMenuItems}
              style={{ flexGrow: 1, borderBottom: 'none', lineHeight: '62px', justifyContent: 'flex-end' }} // Adjust alignment
              disabledOverflow={true} // Prevent collapsing into "..." menu for now
           />


          {/* MODIFIED: User/Auth Section using AntD components */}
          <div style={{ marginLeft: '24px', display: 'flex', alignItems: 'center' }}>
            {currentUser ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                {/* Avatar triggers dropdown */}
                <Avatar style={{ backgroundColor: '#7265e6', cursor: 'pointer' }} icon={<UserOutlined />} />
              </Dropdown>
            ) : (
               // Use AntD Button for Register link
               <Button type="primary"> {/* Primary style button */}
                 <Link to="/register">Register</Link>
               </Button>
               // Login button removed as Menu handles it
            )}
          </div>
        </Header>

        {/* MODIFIED: Use AntD Content */}
        <Content style={{ padding: '20px 40px', marginTop: '64px' /* Offset for sticky header */ }}>
          {/* Routes remain the same */}
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
              <div>
                <h2>404 - Page Not Found</h2>
                <Link to="/">Go Home</Link>
              </div>
            } />
          </Routes>
        </Content>

        {/* MODIFIED: Use AntD Footer */}
        <Footer style={{ textAlign: 'center', backgroundColor: '#f0f2f5' }}>
           AI Litigation App ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </ConfigProvider> // <-- END ConfigProvider wrap
  );
}

export default App;