import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api'; // Use the API service

function HomeScreen() {
  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch cases for the suggestion list/datalist
  useEffect(() => {
    setLoading(true);
    api.getCases()
      .then(response => {
        setCases(response.data || []);
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching cases:", err);
        setError('Failed to load cases. Is the backend running?');
        setCases([]);
      })
      .finally(() => setLoading(false));
  }, []); // Empty dependency array means run once on mount

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const findCaseAndNavigate = () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    // Simple exact match (case-insensitive) - could improve with fuzzy search later
    const targetCase = cases.find(c => c.display_name.toLowerCase() === term);

    if (targetCase) {
      navigate(`/case/${targetCase.id}`);
    } else {
      setError(`Case "${searchTerm}" not found. Please check the name or manage cases.`);
      // Clear error after a delay
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleGoToCase = () => {
    findCaseAndNavigate();
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      findCaseAndNavigate();
    }
  };

  return (
    <div>
      <h1>Case Management Home</h1>
      <p>Enter a case name to view details or manage existing cases.</p>

      <div style={{ margin: '20px 0' }}>
        <input
          type="search" // Use type="search" for potential browser enhancements
          placeholder="Enter case name..."
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          list="case-suggestions" // Link to datalist
          aria-label="Search for case"
        />
        {/* Basic HTML datalist for autocomplete suggestions */}
        <datalist id="case-suggestions">
          {cases.map((c) => (
            <option key={c.id} value={c.display_name} />
          ))}
        </datalist>

        <button onClick={handleGoToCase} disabled={!searchTerm.trim() || loading}>
          Go to Case
        </button>
      </div>

      {loading && <p className="loading-message">Loading cases...</p>}
      {error && <p className="error-message">{error}</p>}

      <div style={{ marginTop: '30px' }}>
        <Link to="/manage-cases" className="button-link">
          Manage All Cases
        </Link>
      </div>
    </div>
  );
}

export default HomeScreen;