import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, loading, authInitialized, refreshUser } = useAuth();
  const location = useLocation();
  const [checkedLocalToken, setCheckedLocalToken] = useState(false);
  
  // Add effect to check local token when component mounts
  useEffect(() => {
    const checkLocalToken = async () => {
      // If we're authenticated, we don't need to check
      if (isAuthenticated) {
        setCheckedLocalToken(true);
        return;
      }
      
      // If auth is initialized but we're not authenticated, try refreshing once
      if (authInitialized && !isAuthenticated) {
        const hasToken = localStorage.getItem('token');
        if (hasToken) {
          // Try to refresh user data with the token
          const success = await refreshUser();
          // If refresh failed, token is invalid
          if (!success) {
            localStorage.removeItem('token');
          }
        }
      }
      setCheckedLocalToken(true);
    };
    
    checkLocalToken();
  }, [isAuthenticated, authInitialized, refreshUser]);

  // Only show loading if auth isn't initialized or we haven't checked local token
  if (!authInitialized || !checkedLocalToken || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not loading, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If authenticated and not loading, render the outlet
  return <Outlet />;
};

export default ProtectedRoute;