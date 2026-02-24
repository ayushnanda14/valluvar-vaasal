import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
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
  Avatar,
  Snackbar,
  Skeleton
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../../src/context/AuthContext';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');

  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [astrologers, setAstrologers] = useState([]);
  const [loadingAstrologers, setLoadingAstrologers] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigningAstrologerId, setAssigningAstrologerId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

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

        // Check if this chat is assigned to the current user (as support or admin)
        const isAssignedSupport = chatData.supportUserId === currentUser.uid;
        const isAssignedAdmin = chatData.adminId === currentUser.uid;
        if (!isAssignedSupport && !isAssignedAdmin) {
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
        setLoadingAstrologers(true);
        setAstrologers([]);
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
        setToast({ open: true, message: t('support.assignLoadError', 'Failed to load astrologers'), severity: 'error' });
      } finally {
        setLoadingAstrologers(false);
      }
    };

    fetchAstrologers();
  }, [assignDialogOpen, chat?.serviceType, t]);

  const handleAssignAstrologer = async (astrologerId) => {
    if (assigning) return;
    try {
      setAssigning(true);
      setAssigningAstrologerId(astrologerId);
      await assignAstrologerToChat(chatId, astrologerId, currentUser.uid);

      // Reload chat to reflect changes
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        setChat({ id: chatDoc.id, ...chatDoc.data() });
      }

      setAssignDialogOpen(false);
      setToast({ open: true, message: t('support.assignSuccess', 'Astrologer assigned successfully'), severity: 'success' });
    } catch (err) {
      console.error('Error assigning astrologer:', err);
      setToast({ open: true, message: t('support.assignError', 'Failed to assign astrologer. Please try again.'), severity: 'error' });
    } finally {
      setAssigning(false);
      setAssigningAstrologerId(null);
    }
  };

  const handleCloseToast = () => setToast((prev) => ({ ...prev, open: false }));



  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['support', 'admin']}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={['support', 'admin']}>
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
    <ProtectedRoute requiredRoles={['support', 'admin']}>
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
      <Dialog
        open={assignDialogOpen}
        onClose={() => !assigning && setAssignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={assigning}
      >
        <DialogTitle>
          {t('support.assignAstrologer', 'Assign Astrologer')}
          {assigning && (
            <CircularProgress size={20} sx={{ ml: 2, verticalAlign: 'middle' }} />
          )}
        </DialogTitle>
        <DialogContent>
          {loadingAstrologers ? (
            <Box sx={{ py: 2 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : astrologers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary" gutterBottom>
                {t('support.noAstrologers', 'No verified astrologers available for this service.')}
              </Typography>
            </Box>
          ) : (
            <List>
              {astrologers.map((astrologer) => {
                const isAssigning = assigningAstrologerId === astrologer.id;
                return (
                  <ListItem
                    key={astrologer.id}
                    button
                    onClick={() => handleAssignAstrologer(astrologer.id)}
                    disabled={assigning}
                    sx={{
                      opacity: assigning && !isAssigning ? 0.6 : 1,
                      bgcolor: isAssigning ? 'action.selected' : 'transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={astrologer.photoURL || '/images/default-avatar.png'} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {astrologer.displayName || 'Astrologer'}
                          {isAssigning && <CircularProgress size={16} />}
                        </Box>
                      }
                      secondary={`${astrologer.experience || 0} years experience`}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
            {t('support.cancel', 'Cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </ProtectedRoute>
  );
} 