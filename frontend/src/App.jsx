import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import HomeScreen from './pages/HomeScreen';
import ManageCasesScreen from './pages/ManageCasesScreen';
import CasePage from './pages/CasePage';
import FilesPage from './pages/FilesPage';
import DocumentAnalysisPage from './pages/DocumentAnalysisPage';
import CreateDocumentPage from './pages/CreateDocumentPage';
import CreateCasePage from './pages/CreateCasePage';
import CreateDiscoveryPage2 from './pages/CreateDiscoveryPage2.jsx'; 
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext'; // Import useAuth
import ProtectedRoute from './components/ProtectedRoute';
// Import other pages as needed

function App() {
  const { currentUser, logout } = useAuth(); // Get user state and logout function
  return (
    <Router>
      <div className="app-container">
        <header>
          <nav>
            <NavLink to="/" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
              Home
            </NavLink>
            {/* Only show Manage Cases if logged in */}
            {currentUser && (
              <NavLink to="/manage-cases" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal', marginLeft: '10px' })}>
                Manage Cases
              </NavLink>
            )}

            <div style={{ marginLeft: 'auto' }}> {/* Pushes auth links to the right */}
              {currentUser ? (
                <>
                  <span style={{ marginRight: '10px' }}>Welcome, {currentUser.username}!</span>
                  <button onClick={logout} style={{ /* Add button styling */ }}>
                    Logout
                  </button>
                </>
              ) : (
                <>
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
            {/* Public Routes */}
            <Route path="/" element={<HomeScreen />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
             
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Routes nested inside here require authentication */}
              <Route path="/manage-cases" element={<ManageCasesScreen />} />
              <Route path="/cases/new" element={<CreateCasePage />} /> {/* <-- ADD THIS ROUTE */}
              <Route path="/case/:caseId" element={<CasePage />} />
              <Route path="/case/:caseId/files" element={<FilesPage />} />
              <Route path="/case/:caseId/analyze" element={<DocumentAnalysisPage />} />
              <Route path="/case/:caseId/create-doc" element={<CreateDocumentPage />} />
              <Route path="/case/:caseId/create-discovery-response" element={<CreateDiscoveryPage2 />} />
              {/* Add any other routes that need protection */}
            </Route>

            <Route path="*" element={
              <div>
                <h2>404 - Page Not Found</h2>
                <Link to="/">Go Home</Link>
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