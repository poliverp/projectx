// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api'; // Or wherever your api functions are exported

// Create the context
const AuthContext = createContext(null);

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until initial check is done

  // Function to check auth status (e.g., on initial load)
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use the getAuthStatus function from api.js
      const response = await api.getAuthStatus();
      if (response.data && response.data.user) {
        setCurrentUser(response.data.user);
        console.log("Auth Status Check: User is logged in.", response.data.user);
      } else {
        setCurrentUser(null);
        console.log("Auth Status Check: User is not logged in.");
      }
    } catch (error) {
      // Likely a 401 if not logged in, which is expected
      if (error.response && error.response.status === 401) {
          console.log("Auth Status Check: No active session (401).");
      } else {
          console.error("Auth Status Check: Error fetching auth status", error);
      }
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check status when the provider mounts
  useEffect(() => {
    console.log("AuthProvider mounted. Checking auth status...");
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login function (to be called by LoginPage)
  const login = (userData) => {
    // This function doesn't perform the API call,
    // it just updates the state *after* a successful API login
    console.log("AuthContext: Setting current user.", userData);
    setCurrentUser(userData);
  };

  // Logout function (to be called anywhere)
  const logout = async () => {
    try {
      await api.logout(); // Call backend logout endpoint
      console.log("AuthContext: Logout successful on backend.");
    } catch (error) {
      console.error("AuthContext: Logout API call failed", error);
      // Still clear frontend state even if backend call fails
    } finally {
      console.log("AuthContext: Clearing current user.");
      setCurrentUser(null);
      // Optionally redirect here or handle in component
    }
  };

  // Value provided to consuming components
  const value = {
    currentUser,
    isLoading,
    login, // Provide login state updater
    logout, // Provide logout function
    checkAuthStatus // Provide function to re-check if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Don't render children until initial auth check is complete */}
      {!isLoading ? children : <div>Loading Application...</div>}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};