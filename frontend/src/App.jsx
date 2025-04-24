// frontend/src/App.jsx
import React from 'react';
// Import useLocation if needed for more complex active link styling
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Import useAuth
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import default CSS
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

function App() {
  const { currentUser, logout } = useAuth(); // Get user state and logout function
  // const location = useLocation(); // Import if using location in NavLink style

  return (
    <Router>
      <div className="app-container">
        <ToastContainer
            position="top-right" // Or "bottom-right", "top-center", etc.
            autoClose={5000} // Auto close after 5 seconds
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light" // Or "dark" or "colored"
        />
        <header>
          <nav>
            {/* --- MODIFIED: Context-Aware Main Link --- */}
            <NavLink
              // Link to manage-cases if logged in, otherwise to login page ('/')
              to={currentUser ? "/manage-cases" : "/"}
              // Basic style, adjust active style as needed
              style={({ isActive }) => ({
                  fontWeight: isActive ? 'bold' : 'normal',
                  marginRight: '10px' // Added margin
              })}
              // 'end' prop helps ensure '/' only matches exactly when logged out
              end={!currentUser}
            >
              {/* Change link text based on login status */}
              {currentUser ? "My Cases" : "Login"}
            </NavLink>
            {/* --- END MODIFIED Link --- */}


            {/* NOTE: Separate "Manage Cases" link is likely redundant now */}
            {/* {currentUser && (
              <NavLink to="/manage-cases" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', marginLeft: '10px' })}>
                Manage Cases
              </NavLink>
            )} */}

            {/* --- Auth links/info pushed to the right --- */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              {currentUser ? (
                <>
                  <span style={{ marginRight: '15px' }}>
                    Welcome, {currentUser.username}! {/* Display username */}
                  </span>
                  <button onClick={logout} className="button-link-style"> {/* Added example class */}
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {/* NOTE: Separate Login link is redundant now as "/" is Login */}
                  {/* <NavLink to="/login" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', marginRight: '10px' })}>
                    Login
                  </NavLink> */}
                  <NavLink to="/register" className="button-link-style" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}> {/* Added example class */}
                    Register
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        </header>

        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} /> {/* Keep for explicit /login URLs */}
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
                <Link to="/">Go Home</Link> {/* Sends to Login Page */}
              </div>
            } />
          </Routes>
        </main>

        {/* Optional Footer */}
        {/* <footer> <p>&copy; {new Date().getFullYear()} AI Litigation App</p> </footer> */}
      </div>
    </Router>
  );
}

export default App;