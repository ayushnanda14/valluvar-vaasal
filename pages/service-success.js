import React, { useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button,
  useTheme
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../src/components/navbar';
import Footer from '../src/components/footer';
import { useAuth } from '../src/context/AuthContext';

export default function ServiceSuccess() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);
  
  return (
    <>
      <Head>
        <title>Service Request Successful | Valluvar Vaasal</title>
        <meta name="description" content="Your service request has been successfully submitted." />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        {/* <Navbar  /> */}
        
        <Box 
          sx={{
            py: { xs: 4, md: 6 },
            backgroundColor: theme.palette.background.default,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Container maxWidth="md">
            <Paper 
              elevation={3}
              sx={{ 
                p: { xs: 3, md: 5 },
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              <CheckCircleOutlineIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'success.main',
                  mb: 2
                }} 
              />
              
              <Typography 
                variant="h4" 
                component="h1"
                sx={{
                  mb: 2,
                  fontFamily: '"Cormorant Garamond", serif',
                  color: theme.palette.secondary.dark
                }}
              >
                Service Request Successful!
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 4 }}>
                Your service request has been successfully submitted and payment has been processed.
                Our astrologers will review your documents and provide their insights soon.
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => router.push('/dashboard')}
                  sx={{ 
                    py: 1.5,
                    px: 4,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1.1rem'
                  }}
                >
                  Go to Dashboard
                </Button>
                
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() => router.push('/messages')}
                  sx={{ 
                    py: 1.5,
                    px: 4,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1.1rem'
                  }}
                >
                  View Messages
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
        
        {/* <Footer /> */}
      </Box>
    </>
  );
} 