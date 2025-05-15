// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    // Optional: Show a loading spinner while checking auth status
    return <div>Loading authentication...</div>;
  }

  // If not loading and user exists, render the child route
  // <Outlet /> renders the nested child route component
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
  // 'replace' prevents the login page from being added to browser history
};

export default ProtectedRoute;