import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Button, Container, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { currentUser, userRoles, loading, authInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if auth is initialized and no user
    if (authInitialized && !currentUser) {
      console.log('ProtectedRoute: Redirecting to login - no user found');
      router.push('/login?redirect=' + router.asPath);
    }
    
    // If user exists but doesn't have required roles, show unauthorized
    if (currentUser && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      if (!hasRequiredRole) {
        console.log('User does not have required roles:', userRoles, 'Required:', requiredRoles);
      }
    }
  }, [currentUser, authInitialized, requiredRoles, router, userRoles]);
  
  // If loading or auth not initialized, show loading spinner
  if (loading || !authInitialized) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If no user, show nothing (will redirect)
  if (!currentUser) {
    return null;
  }
  
  // If user exists but doesn't have required roles, show unauthorized
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    if (!hasRequiredRole) {
      return (
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Unauthorized Access
          </Typography>
          <Typography variant="body1" paragraph>
            You don't have permission to access this page. This area requires one of the following roles: {requiredRoles.join(', ')}.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => router.push('/')}
            sx={{ mt: 2 }}
          >
            Return to Home
          </Button>
        </Container>
      );
    }
  }
  
  // If all checks pass, render the children
  return children;
};

export default ProtectedRoute; 