import React, { useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import AstrologerVerificationManager from '../../src/components/admin/AstrologerVerificationManager.jsx';

export default function AdminAstrologersPage() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, hasRole, loading, authInitialized } = useAuth();
  
  // Check if user is logged in and is an admin
  useEffect(() => {
    // Only check if auth is initialized
    if (authInitialized) {
      if (!currentUser) {
        router.push('/login?redirect=/admin/astrologers');
        return;
      }
      
      const checkRole = async () => {
        const isAdmin = await hasRole('admin');
        if (!isAdmin) {
          router.push('/dashboard');
        }
      };
      
      checkRole();
    }
  }, [currentUser, hasRole, router, authInitialized]);
  
  // If loading or auth not initialized, show nothing
  if (loading || !authInitialized) {
    return null;
  }
  
  if (!currentUser) {
    return null; // Don't render anything until we check authentication
  }
  
  return (
    <>
      <Head>
        <title>Manage Astrologers | Admin Dashboard</title>
        <meta name="description" content="Admin dashboard for managing astrologers." />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        <Box 
          sx={{
            py: { xs: 4, md: 6 },
            backgroundColor: theme.palette.background.default,
            flexGrow: 1
          }}
        >
          <Container maxWidth="lg">
            <Typography 
              variant="h4" 
              component="h1"
              sx={{
                mb: 4,
                fontFamily: '"Cormorant Garamond", serif',
                color: theme.palette.secondary.dark
              }}
            >
              Manage Astrologers
            </Typography>
            
            <AstrologerVerificationManager />
          </Container>
        </Box>
      </Box>
    </>
  );
} 