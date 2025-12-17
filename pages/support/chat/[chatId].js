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
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../../src/context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { SERVICE_TYPES } from '../../../src/utils/constants';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ProtectedRoute from '../../../src/components/ProtectedRoute';
import { db } from '../../../src/firebase/firebaseConfig';
import SupportChatBox from '../../../src/components/SupportChatBox';
import { assignAstrologerToChat } from '../../../src/services/chatService';

export default function SupportChat() {
  const theme = useTheme();
  const router = useRouter();
  const { chatId } = router.query;
  const { currentUser } = useAuth();

  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [astrologers, setAstrologers] = useState([]);
  const [assigning, setAssigning] = useState(false);

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

  // Fetch available astrologers when dialog opens
  useEffect(() => {
    if (!assignDialogOpen || !chat?.serviceType) return;

    const fetchAstrologers = async () => {
      try {
        const astrologersQuery = query(
          collection(db, 'users'),
          where('roles', 'array-contains', 'astrologer'),
          where('state', '==', 'Tamil Nadu')
        );

        const querySnapshot = await getDocs(astrologersQuery);
        const filteredAstrologers = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(astrologer => 
            astrologer.services && 
            astrologer.services.includes(chat.serviceType) &&
            astrologer.verificationStatus === 'verified' && 
            !astrologer.disabled
          );

        setAstrologers(filteredAstrologers);
      } catch (err) {
        console.error('Error fetching astrologers:', err);
        setError('Failed to load astrologers');
      }
    };

    fetchAstrologers();
  }, [assignDialogOpen, chat?.serviceType]);

  const handleAssignAstrologer = async (astrologerId) => {
    try {
      setAssigning(true);
      await assignAstrologerToChat(chatId, astrologerId, currentUser.uid);
      
      // Reload chat to reflect changes
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        setChat({ id: chatDoc.id, ...chatDoc.data() });
      }
      
      setAssignDialogOpen(false);
    } catch (err) {
      console.error('Error assigning astrologer:', err);
      setError('Failed to assign astrologer');
    } finally {
      setAssigning(false);
    }
  };



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
                    {chat?.clientName || 'Client'} {chat?.astrologerName ? `& ${chat.astrologerName}` : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Service: {SERVICE_TYPES[chat?.serviceType] || 'General consultation'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {!chat?.astrologerId && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setAssignDialogOpen(true)}
                    size="small"
                  >
                    Assign Astrologer
                  </Button>
                )}
                <Chip
                  label={chat?.status || 'Active'}
                  color={chat?.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </Box>
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

      {/* Assign Astrologer Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Astrologer</DialogTitle>
        <DialogContent>
          {astrologers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {astrologers.map((astrologer) => (
                <ListItem
                  key={astrologer.id}
                  button
                  onClick={() => handleAssignAstrologer(astrologer.id)}
                  disabled={assigning}
                >
                  <ListItemAvatar>
                    <Avatar src={astrologer.photoURL || '/images/default-avatar.png'} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={astrologer.displayName || 'Astrologer'}
                    secondary={`${astrologer.experience || 0} years experience`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
} 