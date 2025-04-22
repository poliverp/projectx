import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function ManageCasesScreen() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Fetch cases function using useCallback to memoize
  const fetchCases = useCallback(() => {
    setLoading(true);
    api.getCases()
      .then(response => {
        setCases(response.data || []);
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching cases:", err);
        setError("Failed to load cases. Is the backend running?");
        setCases([]);
      })
      .finally(() => setLoading(false));
  }, []); // No dependencies, fetchCases is stable

  // Fetch cases on component mount
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Filter cases based on search term, memoized for performance
  const filteredCases = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
      return cases; // Return all cases if search is empty
    }
    return cases.filter(c =>
      c.display_name.toLowerCase().includes(lowerSearchTerm)
    );
  }, [searchTerm, cases]); // Re-filter only when search or cases change

  const handleCreateCase = async () => {
    const newCaseName = prompt("Enter new case display name:");
    if (newCaseName && newCaseName.trim()) {
      const trimmedName = newCaseName.trim();
      // Basic client-side duplicate check
      if (cases.some(c => c.display_name.toLowerCase() === trimmedName.toLowerCase())) {
        alert("A case with this name already exists.");
        return;
      }
      try {
        setLoading(true); // Indicate loading during creation
        // Backend expects an object like { display_name: "..." }
        const response = await api.createCase({ display_name: trimmedName });
        const newCase = response.data; // Expect backend to return the created case { id, display_name }
        setCases(prevCases => [...prevCases, newCase]); // Add to state
        setError(null);
         if (window.confirm(`Case "${newCase.display_name}" created. Go to the new case page?`)) {
           navigate(`/case/${newCase.id}`);
         }
      } catch (err) {
        console.error("Error creating case:", err);
        setError(`Failed to create case: ${err.response?.data?.error || err.message}`);
      } finally {
          setLoading(false);
      }
    }
  };

  const handleDeleteCase = async (caseId, caseName) => {
    if (window.confirm(`Are you sure you want to delete case "${caseName}"? This action cannot be undone.`)) {
      try {
        setLoading(true);
        await api.deleteCase(caseId);
        setCases(prevCases => prevCases.filter(c => c.id !== caseId)); // Remove from state
        setError(null);
      } catch (err) {
        console.error("Error deleting case:", err);
        setError(`Failed to delete case: ${err.response?.data?.error || err.message}`);
      } finally {
          setLoading(false);
      }
    }
  };

  return (
    <div>
      <h1>Manage Cases</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Link to="/cases/new" className="button-link"> {/* You can style this Link like a button using CSS */}
        Create New Case
      </Link>
        <input
          type="search"
          placeholder="Filter cases by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Filter cases"
        />
         <Link to="/" className="button-link" style={{backgroundColor: '#6c757d'}}>Back to Home</Link>
      </div>

      {loading && <p className="loading-message">Loading...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && (
        <ul>
          {filteredCases.length > 0 ? filteredCases.map(c => (
            <li key={c.id}>
              <Link to={`/case/${c.id}`} title={`View case ${c.display_name}`}>
                {c.display_name}
              </Link>
              {/* Consider adding an Edit button here later */}
              {/* <button onClick={() => navigate(`/case/${c.id}/edit`)} style={{backgroundColor: '#ffc107'}}>Edit</button> */}
              <button
                onClick={() => handleDeleteCase(c.id, c.display_name)}
                className="button-danger"
                disabled={loading}
                aria-label={`Delete case ${c.display_name}`}
              >
                Delete
              </button>
            </li>
          )) : (
            <li>No cases found{searchTerm ? ' matching your filter' : ''}.</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default ManageCasesScreen;