// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth hook
import api from '../services/api';
import { toast } from 'react-toastify'; // <-- Import toast

function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth(); // Get login function AND currentUser from context
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- ADDED: Redirect if already logged in ---
  useEffect(() => {
    // If the user is already logged in (currentUser exists), redirect them
    if (currentUser) {
      console.log('User already logged in, redirecting from Login page...');
      navigate('/manage-cases'); // Or redirect to '/' or another default page
    }
  }, [currentUser, navigate]); // Re-run if currentUser or navigate changes
  // --- END ADDED ---

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!username || !password) {
      setError("Username and password are required.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.login({ username, password, remember });
      console.log('Login successful:', response.data);
      if (response.data && response.data.user) {
        login(response.data.user); // Update context state
        toast.success(`Welcome back, ${response.data.user.username}!`); // Success toast
        navigate('/manage-cases');
      } else {
        const errorMsg = 'Login succeeded but no user data received.';
        setError(errorMsg);
        toast.warn(errorMsg); // Use warning toast
      }
    } catch (err) {
      console.error('Login failed:', err);
      const errorMsg = err.response?.data?.error || 'Login failed. Please check credentials.';
      setError(errorMsg); // Keep for inline error
      toast.error(errorMsg); // Show toast error
    } finally {
      setIsLoading(false);
    }
  };

  // Render nothing or a loading indicator while redirecting
  if (currentUser) {
      return <div>Redirecting...</div>;
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="username" style={{ marginRight: '5px' }}>Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password" style={{ marginRight: '5px' }}>Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="remember">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember Me
          </label>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging In...' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: '20px' }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default LoginPage;