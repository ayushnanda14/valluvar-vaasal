import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  useTheme,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Badge
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import { getSupportUserAssignedChats } from '../../src/services/chatService';
import { SERVICE_TYPES } from '../../src/utils/constants';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import SupportIcon from '@mui/icons-material/Support';
import MessageIcon from '@mui/icons-material/Message';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ProtectedRoute from '../../src/components/ProtectedRoute';

export default function SupportDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();

  const [assignedChats, setAssignedChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAssignedChats = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const chats = await getSupportUserAssignedChats(currentUser.uid);
        setAssignedChats(chats);
      } catch (err) {
        console.error('Error loading assigned chats:', err);
        setError('Failed to load assigned chats');
      } finally {
        setLoading(false);
      }
    };

    loadAssignedChats();
  }, [currentUser?.uid]);

  const handleViewChat = (chatId) => {
    router.push(`/support/chat/${chatId}`);
  };

  const getChatStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return timestamp.toDate().toLocaleString();
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

  return (
    <ProtectedRoute requiredRoles={['support']}>
      <Head>
        <title>Support Dashboard | Valluvar Vaasal</title>
        <meta name="description" content="Support user dashboard" />
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SupportIcon sx={{ mr: 2, fontSize: 40, color: theme.palette.secondary.dark }} />
              <Box>
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 600,
                    fontSize: { xs: '2rem', md: '2.8rem' },
                    color: theme.palette.secondary.dark
                  }}
                >
                  Support Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Welcome back, {currentUser?.displayName || 'Support User'}
                </Typography>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ChatIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4" component="div">
                        {assignedChats.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Assigned Chats
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MessageIcon sx={{ mr: 2, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h4" component="div">
                        {assignedChats.filter(chat => chat.status === 'active').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Chats
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ mr: 2, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="h4" component="div">
                        {assignedChats.filter(chat => chat.status === 'expired').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expired Chats
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 2, color: 'info.main' }} />
                    <Box>
                      <Typography variant="h4" component="div">
                        {new Set(assignedChats.map(chat => chat.astrologerId)).size}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unique Astrologers
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Assigned Chats */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
            <Typography variant="h5" sx={{ mb: 3, fontFamily: '"Playfair Display", serif' }}>
              Your Assigned Chats
            </Typography>

            {assignedChats.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <SupportIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No chats assigned yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You will see chats here once they are assigned to you by an admin.
                </Typography>
              </Box>
            ) : (
              <List>
                {assignedChats.map((chat, index) => (
                  <React.Fragment key={chat.id}>
                    <ListItem
                      sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': {
                          bgcolor: 'action.hover',
                          cursor: 'pointer'
                        }
                      }}
                      onClick={() => handleViewChat(chat.id)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ChatIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {chat.clientName || 'Client'} & {chat.astrologerName || 'Astrologer'}
                            </Typography>
                            <Chip
                              label={chat.status || 'Active'}
                              color={getChatStatusColor(chat.status)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Service: {SERVICE_TYPES[chat.serviceType] || 'General consultation'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Last updated: {formatDate(chat.updatedAt)}
                            </Typography>
                            {chat.lastMessage && (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                &quot;{typeof chat.lastMessage === 'string' ? chat.lastMessage : chat.lastMessage.text || 'Message'}&quot;
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewChat(chat.id);
                          }}
                        >
                          View Chat
                        </Button>
                      </Box>
                    </ListItem>
                    {index < assignedChats.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Container>
      </Box>
    </ProtectedRoute>
  );
} 