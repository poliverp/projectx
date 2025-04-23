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
// Import other pages as needed

function App() {
  return (
    <Router>
      <div className="app-container">
        <header>
          <nav>
            {/* Use NavLink for active styling */}
            <NavLink to="/" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
                Home
            </NavLink>
            <NavLink to="/manage-cases" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
                Manage Cases
            </NavLink>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/manage-cases" element={<ManageCasesScreen />} />
            <Route path="/cases/new" element={<CreateCasePage />} /> {/* <-- ADD THIS ROUTE */}
            <Route path="/case/:caseId" element={<CasePage />} />
            <Route path="/case/:caseId/files" element={<FilesPage />} />
            <Route path="/case/:caseId/analyze" element={<DocumentAnalysisPage />} />
            <Route path="/case/:caseId/create-doc" element={<CreateDocumentPage />} />
            <Route path="/case/:caseId/create-discovery-response" element={<CreateDiscoveryPage2 />} />
            <Route path="/register" element={<RegistrationPage />} />
            {/* Add other routes as needed */}
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