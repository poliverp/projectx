// frontend/src/pages/RegistrationPage.jsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth hook
import api from '../services/api';

function RegistrationPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Get currentUser from context
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // Optional
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- ADDED: Redirect if already logged in ---
  useEffect(() => {
    // If the user is already logged in (currentUser exists), redirect them
    if (currentUser) {
      console.log('User already logged in, redirecting from Register page...');
      navigate('/manage-cases'); // Or redirect to '/' or another default page
    }
  }, [currentUser, navigate]); // Re-run if currentUser or navigate changes
  // --- END ADDED ---

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!username || !password) {
        setError("Username and password are required.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await api.register({ username, password, email });
      console.log('Registration successful:', response.data);
      // Maybe show a success message before redirecting?
      alert('Registration successful! Please log in.'); // Simple alert for now
      navigate('/login'); // Redirect to login page on successful registration
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
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
      <h2>Register New Account</h2>
      <form onSubmit={handleRegister}>
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
          <label htmlFor="email" style={{ marginRight: '5px' }}>Email (Optional):</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p style={{ marginTop: '20px' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default RegistrationPage;