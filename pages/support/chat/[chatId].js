import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../../src/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { SERVICE_TYPES } from '../../../src/utils/constants';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ProtectedRoute from '../../../src/components/ProtectedRoute';
import { db } from '../../../src/firebase/firebaseConfig';
import SupportChatBox from '../../../src/components/SupportChatBox';

export default function SupportChat() {
  const theme = useTheme();
  const router = useRouter();
  const { chatId } = router.query;
  const { currentUser } = useAuth();

  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!chatId || !currentUser?.uid) return;

    const loadChat = async () => {
      try {
        setLoading(true);
        const chatDoc = await getDoc(doc(db, 'chats', chatId));

        if (!chatDoc.exists()) {
          setError('Chat not found');
          return;
        }

        const chatData = { id: chatDoc.id, ...chatDoc.data() };

        // Check if this chat is assigned to the current support user
        if (chatData.supportUserId !== currentUser.uid) {
          setError('You are not assigned to this chat');
          return;
        }

        setChat(chatData);
      } catch (err) {
        console.error('Error loading chat:', err);
        setError('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [chatId, currentUser?.uid]);



  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['support']}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['support']}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/support/dashboard')}>
            Back to Dashboard
          </Button>
        </Container>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['support']}>
      <Head>
        <title>Support Chat | Valluvar Vaasal</title>
        <meta name="description" content="Support chat interface" />
      </Head>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
            borderBottom: '1px solid #e0e0e0',
            flexShrink: 0
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={() => router.push('/support/dashboard')} sx={{ mr: 2 }}>
                  <ArrowBackIcon />
                </IconButton>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {chat?.clientName || 'Client'} & {chat?.astrologerName || 'Astrologer'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Service: {SERVICE_TYPES[chat?.serviceType] || 'General consultation'}
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={chat?.status || 'Active'}
                color={chat?.status === 'active' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Container>
        </Box>

        {/* Chat Interface */}
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', pb: 2 }}>
          <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <SupportChatBox
              chatId={chatId}
              otherUser={{
                displayName: `${chat?.clientName || 'Client'} & ${chat?.astrologerName || 'Astrologer'}`,
                photoURL: null,
                uid: currentUser?.uid
              }}
              chat={chat}
            />
          </Container>
        </Box>
      </Box>
    </ProtectedRoute>
  );
} 