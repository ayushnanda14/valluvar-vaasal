import React, { useEffect, useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { Box, Typography, Paper } from '@mui/material';

export default function TestAuth() {
  const { currentUser, userRoles, loading, authInitialized } = useAuth();
  const [authState, setAuthState] = useState('Initializing...');

  useEffect(() => {
    setAuthState(`Loading: ${loading}, AuthInitialized: ${authInitialized}, User: ${currentUser ? currentUser.uid : 'null'}, Roles: ${userRoles.join(', ')}`);
  }, [currentUser, userRoles, loading, authInitialized]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Auth Debug Page
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
          {authState}
        </Typography>
      </Paper>
    </Box>
  );
} 