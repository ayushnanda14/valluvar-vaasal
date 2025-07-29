import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../src/context/AuthContext';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import ChatMonitor from '../../src/components/admin/ChatMonitor';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';

export default function AdminChats() {
  const theme = useTheme();
  const router = useRouter();
  const { userId } = router.query;
  const { currentUser } = useAuth();
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    const fetchUserName = async () => {
      if (!userId) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserName(userDoc.data().displayName || 'User');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    
    fetchUserName();
  }, [userId]);
  
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Head>
        <title>User Chats | Admin</title>
        <meta name="description" content="View user chats" />
      </Head>
      
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <Box
          sx={{
            pt: { xs: 4, md: 6 },
            pb: { xs: 2, md: 3 },
            background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
          }}
        >
          <Container maxWidth="lg">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/admin/dashboard?tab=0', undefined, { shallow: true })}
              sx={{ mb: 2 }}
            >
              Back to Dashboard
            </Button>
            
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: { xs: '2rem', md: '2.8rem' },
                mb: 2,
                color: theme.palette.secondary.dark
              }}
            >
              {userName ? `${userName}'s Chats` : 'User Chats'}
            </Typography>
          </Container>
        </Box>
        
        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          <Paper elevation={0} sx={{ p: 3 }}>
            <ChatMonitor userId={userId} />
          </Paper>
        </Container>
      </Box>
    </ProtectedRoute>
  );
} 