import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function CasePage() {
  const { caseId } = useParams(); // Get caseId from URL
  const navigate = useNavigate();
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCaseDetails = useCallback(() => {
    setLoading(true);
    api.getCase(caseId)
      .then(response => {
        setCaseDetails(response.data); // Expect { id, display_name, official_case_name, case_number, ... }
        setError(null);
      })
      .catch(err => {
        console.error(`Error fetching case ${caseId}:`, err);
        setError(`Failed to load case details. ${err.response?.status === 404 ? 'Case not found.' : 'Is the backend running?'}`);
        setCaseDetails(null);
      })
      .finally(() => setLoading(false));
  }, [caseId]); // Re-fetch if caseId changes

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  const handleUpdateInfo = () => {
      // TODO: Implement update functionality - maybe navigate to an edit page or open a modal
      alert("Update Case Info: Feature not implemented yet.");
  };

  if (loading) return <p className="loading-message">Loading case details...</p>;
  if (error) return <div className="error-message">Error: {error} <Link to="/">Go Home</Link></div>;
  if (!caseDetails) return <div><p>Case not found.</p><Link to="/">Go Home</Link></div>;

  // Destructure details for easier access
  const { display_name, official_case_name, case_number, judge, plaintiff, defendant } = caseDetails;

  return (
    <div>
      {/* Display name is prominent */}
      <h1>Case: {display_name}</h1>

      {/* Section for official details */}
      <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h4>Official Details</h4>
        <p style={{ margin: '5px 0' }}><strong>Official Name:</strong> {official_case_name || 'N/A'}</p>
        <p style={{ margin: '5px 0' }}><strong>Case Number:</strong> {case_number || 'N/A'}</p>
        <p style={{ margin: '5px 0' }}><strong>Judge:</strong> {judge || 'N/A'}</p>
        <p style={{ margin: '5px 0' }}><strong>Plaintiff:</strong> {plaintiff || 'N/A'}</p>
        <p style={{ margin: '5px 0' }}><strong>Defendant:</strong> {defendant || 'N/A'}</p>
        <button onClick={handleUpdateInfo} style={{marginTop: '10px', backgroundColor: '#ffc107', color: '#333'}}>Update Case Info</button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <Link to={`/case/${caseId}/files`} className="button-link">
          View/Upload Files
        </Link>
        <Link to={`/case/${caseId}/analyze`} className="button-link" style={{backgroundColor: '#17a2b8'}}>
           Document Analysis
        </Link>
        <Link to={`/case/${caseId}/create-doc`} className="button-link" style={{backgroundColor: '#28a745'}}>
           Create Document
        </Link>
      </div>

      {/* Navigation back */}
      <div style={{ marginTop: '30px' }}>
        <Link to="/manage-cases" className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Manage Cases</Link>
        <Link to="/" className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Home</Link>
      </div>
    </div>
  );
}

export default CasePage;