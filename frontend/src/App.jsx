// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Import useAuth

// --- Import Pages ---
// import HomeScreen from './pages/HomeScreen'; // Keep if used elsewhere, otherwise remove
import ManageCasesScreen from './pages/ManageCasesScreen';
import CasePage from './pages/CasePage';
import FilesPage from './pages/FilesPage';
import DocumentAnalysisPage from './pages/DocumentAnalysisPage';
import CreateDocumentPage from './pages/CreateDocumentPage';
import CreateCasePage from './pages/CreateCasePage';
import RegistrationPage from './pages/RegistrationPage';
import CreateDiscoveryPage2 from'./pages/CreateDiscoveryPage2';
import LoginPage from './pages/LoginPage'; // <-- Ensure Login Page is imported
import ProtectedRoute from './components/ProtectedRoute'; // <-- Ensure ProtectedRoute is imported

function App() {
  const { currentUser, logout } = useAuth(); // Get user state and logout function

  return (
    <Router>
      <div className="app-container">
        <header>
          <nav>
            {/* Conditionally render Home link? Or always show? */}
            <NavLink to="/" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
               {/* Changed from Home - maybe just show brand/title? Or conditionally '/' or '/manage-cases'? */}
               App Home
            </NavLink>

            {/* Only show Manage Cases if logged in */}
            {currentUser && (
              <NavLink to="/manage-cases" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', marginLeft: '10px' })}>
                Manage Cases
              </NavLink>
            )}

            <div style={{ marginLeft: 'auto' }}> {/* Pushes auth links/info to the right */}
              {currentUser ? (
                <>
                  <span style={{ marginRight: '10px' }}>Welcome, {currentUser.username}!</span>
                  <button onClick={logout} style={{ /* Add button styling */ }}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {/* Login link might be redundant if '/' is login, but keep for clarity? */}
                  <NavLink to="/login" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', marginRight: '10px' })}>
                    Login
                  </NavLink>
                  <NavLink to="/register" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
                    Register
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        </header>

        <main>
          <Routes>
            {/* --- MODIFIED Public Routes --- */}
            {/* Point the root path directly to the Login Page */}
            <Route path="/" element={<LoginPage />} />
            {/* Point /login to the same component */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            {/* The original HomeScreen route for "/" is removed/replaced */}
            {/* <Route path="/home-original" element={<HomeScreen />} />  <-- If you want to keep it accessible */}


            {/* --- Keep Protected Routes --- */}
            {/* Routes nested inside ProtectedRoute require authentication */}
            <Route element={<ProtectedRoute />}>
              <Route path="/manage-cases" element={<ManageCasesScreen />} />
              <Route path="/cases/new" element={<CreateCasePage />} />
              <Route path="/case/:caseId" element={<CasePage />} />
              <Route path="/case/:caseId/files" element={<FilesPage />} />
              <Route path="/case/:caseId/analyze" element={<DocumentAnalysisPage />} />
              <Route path="/case/:caseId/create-doc" element={<CreateDocumentPage />} />
              <Route path="/case/:caseId/create-discovery-response" element={<CreateDiscoveryPage2 />} />
              {/* Add any other routes that need protection here */}
            </Route>

            {/* --- Keep Not Found Route --- */}
            <Route path="*" element={
              <div>
                <h2>404 - Page Not Found</h2>
                <Link to="/">Go Home</Link> {/* Sends to Login Page now */}
              </div>
            } />
          </Routes>
        </main>

        {/* Optional Footer */}
        {/* <footer> <p>&copy; 2025 Case Manager</p> </footer> */}
      </div>
    </Router>
  );
}

export default App;