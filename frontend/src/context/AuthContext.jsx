// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

// Create the context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.getAuthStatus();
        if (response.data && response.data.user) {
          setCurrentUser(response.data.user);
        }
      } catch (error) {
        console.log('User is not authenticated');
        // This is normal when not logged in, so we don't set an error
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  useEffect(() => {
    console.log("Authentication state changed:", { 
      isAuthenticated: !!currentUser,
      user: currentUser 
    });
  }, [currentUser]);
  // Login function
  const login = async (credentials) => {
    setIsLoading(true);
    setAuthError(null);
    setPendingApproval(false);
    
    try {

      console.log("Login credentials:", {
        ...credentials, 
        password: "***" // Don't log actual password
      });

      const response = await api.login(credentials);
      
      console.log("Login server response:", response.data);

      if (response.data && response.data.user) {
        console.log("Setting current user state:", response.data.user);
        setCurrentUser(response.data.user);
        return { success: true };
      } else {
        throw new Error('Login response missing user data');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle pending approval error specifically
      if (error.response && error.response.status === 403 && error.response.data.error === "Account pending approval") {
        setPendingApproval(true);
        setAuthError("Your account is pending approval. You'll receive an email when approved.");
        return { success: false, pendingApproval: true, message: error.response.data.message };
      }
      
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setAuthError(errorMessage);
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
      return { success: false };
    }
  };
  
  // Register function (only used to check status, actual registration is in RegistrationPage)
  const checkRegistrationStatus = async (username) => {
    try {
      const user = await api.getUserByUsername(username);
      if (user.data && user.data.pending_approval) {
        setPendingApproval(true);
        return { pendingApproval: true };
      }
      return { pendingApproval: false };
    } catch (error) {
      console.error('Error checking registration status:', error);
      return { error: true };
    }
  };
  
  // Provide the auth context value
  const value = {
    currentUser,
    isLoading,
    authError,
    pendingApproval,
    login,
    logout,
    checkRegistrationStatus
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};