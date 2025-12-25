import React, { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface PrivateRouteProps {
  children: ReactNode;
  requirePasswordChange?: boolean;
  requireBusiness?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requirePasswordChange = false, requireBusiness = false }) => {
  const { isAuthenticated, isLoading, mustChangePassword, currentBusiness } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // If user must change password, redirect to change-password page (unless already there)
      if (mustChangePassword && location.pathname !== '/change-password') {
        navigate('/change-password', { replace: true });
      }
      // If business is required but not selected (and not going to business selection page)
      else if (requireBusiness && !currentBusiness && location.pathname !== '/business/select') {
        navigate('/business/select', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, mustChangePassword, currentBusiness, location.pathname, navigate, requireBusiness]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
