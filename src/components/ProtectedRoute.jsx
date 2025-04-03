import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Button, Container } from '@mui/material';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { currentUser, userRoles, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !currentUser) {
      router.push('/login?redirect=' + router.asPath);
    }
    
    // If user exists but doesn't have required roles, show unauthorized
    if (currentUser && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      if (!hasRequiredRole) {
        // Don't redirect, we'll show an unauthorized message
        console.log('User does not have required roles');
      }
    }
  }, [currentUser, loading, requiredRoles, router, userRoles]);
  
  // If loading, show nothing
  if (loading) {
    return null;
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