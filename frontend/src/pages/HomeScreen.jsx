import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api'; // Use the API service

function HomeScreen() {
  // --- Existing Case Management State ---
  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Used for case fetching/search errors
  const navigate = useNavigate();
  // ------------------------------------

  // --- New Basic Login State (INSECURE) ---
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // isLogged In state controls which content is shown
  // Initialize to false, so the login form appears first
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(false); // Used for login errors
  // ---------------------------------------

  // --- HARDCODED INSECURE CREDENTIALS ---
  // !!! SEVERE SECURITY RISK - FOR TEMPORARY USE ONLY !!!
  const HARDCODED_USERNAME = 'admin';
  const HARDCODED_PASSWORD = 'password123';
  // --- DO NOT USE HARDCODED REAL CREDENTIALS ---
  // ----------------------------------------


  // Fetch cases for the suggestion list/datalist (Only runs if isLoggedIn becomes true)
  // Modified useEffect to only fetch cases *after* a successful insecure login
  useEffect(() => {
    if (isLoggedIn) { // Only fetch if the user is considered "logged in" by the basic check
        setLoading(true);
        api.getCases()
          .then(response => {
            setCases(response.data || []);
            setError(null); // Clear any previous case fetching/search errors
            setLoginError(false); // Also clear login errors on successful case load
          })
          .catch(err => {
            console.error("Error fetching cases:", err);
            setError('Failed to load cases. Is the backend running and accessible?');
            setCases([]);
            // Note: This setError is for the case list fetching, not the login error
          })
          .finally(() => setLoading(false));
    }
    // Dependency array includes isLoggedIn so it runs when login state changes to true
  }, [isLoggedIn]);


  // --- New Basic Login Functions (INSECURE) ---
  const handleLoginUsernameChange = (event) => {
    setLoginUsername(event.target.value);
    setLoginError(false); // Clear login error when typing
  };

  const handleLoginPasswordChange = (event) => {
    setLoginPassword(event.target.value);
    setLoginError(false); // Clear login error when typing
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault(); // Prevent form default submit behavior

    // *** INSECURE CHECK ***
    // Comparing directly against hardcoded values in frontend code
    if (loginUsername === HARDCODED_USERNAME && loginPassword === HARDCODED_PASSWORD) {
      setIsLoggedIn(true); // Set logged in state to true
      setLoginError(false); // Clear any login error
      // No navigation needed here, as the conditional rendering will show the case list content
    } else {
      setIsLoggedIn(false); // Keep logged in state false
      setLoginError(true); // Show login error
      // Optionally clear password field on failure: setLoginPassword('');
    }
  };
  // ------------------------------------------


  // --- Existing Case Management Functions ---
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const findCaseAndNavigate = () => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
        // Optionally clear previous case search error if term is empty
        // setError(null);
        return;
    }


    // Simple exact match (case-insensitive) - could improve with fuzzy search later
    // Use cases state which is fetched after login
    const targetCase = cases.find(c => c.display_name.toLowerCase() === term);

    if (targetCase) {
      navigate(`/case/${targetCase.id}`);
    } else {
      // Use the error state that's already defined for case search issues
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
  // ----------------------------------------


  return (
    // --- Conditional Rendering: Show Login Form or Case Management Content ---
    <div>
      {!isLoggedIn ? (
        // --- Render the Basic Login Form (If not logged in) ---
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h2>Login</h2>
          <form onSubmit={handleLoginSubmit}> {/* Use the new submit handler */}
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="login-username">Username:</label> {/* Use unique ID */}
              <input
                type="text"
                id="login-username" // Use unique ID
                value={loginUsername}
                onChange={handleLoginUsernameChange} // Use the new handler
                required
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="login-password">Password:</label> {/* Use unique ID */}
              <input
                type="password"
                id="login-password" // Use unique ID
                value={loginPassword}
                onChange={handleLoginPasswordChange} // Use the new handler
                required
              />
            </div>
            <button type="submit">Login</button>
            {loginError && (
              // Use the new loginError state for login form messages
              <p style={{ color: 'red', marginTop: '10px' }}>Invalid username or password.</p>
            )}
          </form>
        </div>
      ) : (
        // --- Render the Original HomeScreen Content (If logged in) ---
        // Wrap the original return content here
        <div>
          <h1>Case Management Home</h1>
          <p>Enter a case name to view details or manage existing cases.</p>

          <div style={{ margin: '20px 0' }}>
            <input
              type="search"
              placeholder="Enter case name..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              list="case-suggestions"
              aria-label="Search for case"
            />
            <datalist id="case-suggestions">
              {/* Ensure cases state is available and is an array before mapping */}
              {Array.isArray(cases) && cases.map((c) => (
                <option key={c.id} value={c.display_name} />
              ))}
            </datalist>

            {/* Use the existing loading state */}
            <button onClick={handleGoToCase} disabled={!searchTerm.trim() || loading}>
              Go to Case
            </button>
          </div>

          {/* Use the existing error state for case search/fetch errors */}
          {loading && <p className="loading-message">Loading cases...</p>}
          {error && <p className="error-message">{error}</p>}

          <div style={{ marginTop: '30px' }}>
            <Link to="/manage-cases" className="button-link">
              Manage All Cases
            </Link>
          </div>
        </div>
      )}
    </div>
    // ------------------------------------------------------------------
  );
}

export default HomeScreen;