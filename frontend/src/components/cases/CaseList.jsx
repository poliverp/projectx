// Example in a React component (e.g., src/components/CaseList.jsx)
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Use relative URL so Vite proxy works in all environments
const API_BASE_URL = '/api';
// You might need your API key if the backend endpoint requires it (check your setup)
// const API_KEY = 'AIzaSyDeW...';

function CaseList() {
  const [cases, setCases] = useState([]); // State to hold the list of cases
  const [loading, setLoading] = useState(true); // State for loading indicator
  const [error, setError] = useState(null); // State for error messages

  // useEffect to fetch cases when the component mounts
  useEffect(() => {
    setLoading(true);
    setError(null); // Clear previous errors

    axios.get(`${API_BASE_URL}/cases`, {
       // Add headers if your GET endpoint requires the API key
       // headers: { 'x-api-key': API_KEY }
    })
      .then(response => {
        setCases(response.data); // Store the fetched cases in state
        // console.log("Cases fetched:", response.data); // For debugging
      })
      .catch(err => {
        console.error("Error fetching cases:", err);
        setError("Failed to load cases. Is the backend running?"); // Set error message
        setCases([]); // Clear cases on error
      })
      .finally(() => {
        setLoading(false); // Set loading to false once done (success or error)
      });

  }, []); // Empty dependency array means run only once on mount

  // Render logic
  if (loading) {
    return <div>Loading cases...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Manage Cases</h2>
      {cases.length === 0 ? (
        <p>No cases found.</p>
      ) : (
        <ul>
          {cases.map(caseItem => (
            <li key={caseItem.id}>
              {caseItem.display_name} (ID: {caseItem.id})
              {/* Add buttons for view details, delete etc. later */}
            </li>
          ))}
        </ul>
      )}
      {/* Add a form/button here to trigger case creation */}
    </div>
  );
}

export default CaseList;