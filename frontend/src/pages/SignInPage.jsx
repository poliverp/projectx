// src/pages/LoginPage2.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function SigninPage() {
  console.log("NEW LOGIN PAGE RENDERED - THIS SHOULD APPEAR IN CONSOLE");
  
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Skip rendering login form if user is already logged in
  React.useEffect(() => {
    if (currentUser) {
      console.log("User already logged in, redirecting...");
      navigate('/manage-cases');
    }
  }, [currentUser, navigate]);
  
  if (currentUser) {
    return <div>Redirecting...</div>;
  }

  // Test function to verify event handling
  const testButtonClick = () => {
    console.log("Test button clicked!");
    alert("Test button clicked! This confirms event handling works.");
  };

  // Direct login function that bypasses form submission
  const attemptDirectLogin = async () => {
    console.log("Direct login attempt with:", { username, password });
    
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.login({ username, password, remember });
      console.log("Login response:", response.data);
      
      if (response.data && response.data.user) {
        login(response.data.user);
        navigate('/manage-cases');
      } else {
        setError("Login succeeded but received invalid user data");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Regular form submission handler
  const handleFormSubmit = (event) => {
    console.log("Form submitted!");
    event.preventDefault();
    attemptDirectLogin();
  };

  return (
    <div style={{padding: '20px', border: '2px solid blue'}}>
      <h1>New Login Page</h1>
      <p>This is a completely new component to test login functionality.</p>
      
      {/* Test button outside the form */}
      <button 
        onClick={testButtonClick}
        style={{background: 'red', color: 'white', padding: '10px', margin: '10px 0'}}
      >
        Test Button (Click Me!)
      </button>
      
      <form onSubmit={handleFormSubmit}>
        {error && <p style={{color: 'red'}}>{error}</p>}
        
        <div style={{margin: '10px 0'}}>
          <label htmlFor="username">Username: </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div style={{margin: '10px 0'}}>
          <label htmlFor="password">Password: </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div style={{margin: '10px 0'}}>
          <label>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember Me
          </label>
        </div>
        
        <button 
          type="submit"
          disabled={isLoading}
          style={{background: 'blue', color: 'white', padding: '8px 15px'}}
        >
          {isLoading ? 'Logging In...' : 'Login (Form Submit)'}
        </button>
        
        <button 
          type="button"
          onClick={attemptDirectLogin}
          style={{background: 'green', color: 'white', padding: '8px 15px', marginLeft: '10px'}}
        >
          Login (Direct)
        </button>
      </form>
      
      <p style={{marginTop: '20px'}}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
      
      <p>
        <Link to="/login-test">Go to test route</Link>
      </p>
    </div>
  );
}

export default SigninPage;