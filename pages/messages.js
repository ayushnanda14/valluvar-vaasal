import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  useTheme,
  Badge,
  IconButton,
  useMediaQuery
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import ChatBox from '../src/components/ChatBox';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { getUserChats } from '../src/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import { ta, enIN } from 'date-fns/locale';
import { SERVICE_TYPES } from '@/utils/constants';
import { useTranslation } from 'react-i18next';

export default function Messages() {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileChat = useMediaQuery('(max-width:900px)');

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubscribe;

    const fetchChats = async () => {
      if (!currentUser) {
        console.log('MessagesPage: currentUser not available yet.');
        return;
      }
      console.log('MessagesPage: CurrentUser available:', currentUser.uid);
      console.log('MessagesPage: router.query on fetchChats start:', router.query);

      try {
        setLoading(true);

        // Use the real-time listener
        unsubscribe = getUserChats(currentUser.uid, (userChats) => {
          console.log('MessagesPage: getUserChats callback. Chats received:', userChats.length, 'Router query:', router.query);
          setChats(userChats);

          // If chatId is specified in the URL, select that chat
          if (router.query.chatId) {
            console.log('MessagesPage: Attempting to select chat from URL chatId:', router.query.chatId);
            const chat = userChats.find(c => c.id === router.query.chatId);
            if (chat) {
              console.log('MessagesPage: Chat found and selected:', chat.id);
              setSelectedChat(chat);
            } else {
              console.warn('MessagesPage: Chat with ID from URL not found in userChats:', router.query.chatId);
            }
          } else if (userChats.length > 0 && !isMobile) {
            // Auto-select the first chat on desktop
            console.log('MessagesPage: No chatId in URL, auto-selecting first chat for desktop.');
            setSelectedChat(userChats[0]);
          }

          setLoading(false);
        });
      } catch (err) {
        console.error('Error setting up chats listener:', err);
        setError(t('messages.fetchError'));
        setLoading(false);
      }
    };

    fetchChats();

    // Clean up listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, router.query, isMobile, t]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    console.log('MessagesPage: handleSelectChat. Chat selected:', chat.id);

    // Update URL with the selected chat ID for direct linking
    router.push({
      pathname: '/messages',
      query: { chatId: chat.id }
    }, undefined, { shallow: true });

    // On mobile, we might want to hide the chat list
    // This is handled by the UI rendering logic
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    console.log('MessagesPage: handleBackToList. Cleared selected chat.');

    // Remove chatId from URL
    router.push('/messages', undefined, { shallow: true });
  };

  const formatChatDate = (timestamp) => {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate();
      return formatDistanceToNow(date, { addSuffix: true, locale: t('language.code') === 'ta' ? ta : enIN });
    } catch (error) {
      return '';
    }
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>{t('brand')} - {t('messages.title')}</title>
        <meta name="description" content={t('messages.description')} />
      </Head>

      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: { xs: 2, md: 4 }, pb: 6 }}>
        <Container maxWidth="xl">
          {!isMobileChat && (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                mb: 1,
                fontFamily: '"Cormorant Garamond", serif',
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              {t('messages.yourReadings')}
            </Typography>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error">{error}</Typography>
            </Paper>
          ) : chats.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <ChatIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, fontFamily: '"Cormorant Garamond", serif' }}>
                {t('messages.noReadings')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                {t('messages.startReading')}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{
                    cursor: 'pointer',
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1.1rem'
                  }}
                  onClick={() => router.push('/#services-section')}
                >
                  {t('messages.browseServices')}
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: 3,
              flexDirection: { xs: 'column', md: 'row' }
            }}>
              {/* Chat List */}
              {(!isMobile || !selectedChat) && (
                <Paper
                  elevation={1}
                  sx={{
                    width: { xs: '100%', md: '360px' },
                    height: '70vh',
                    overflow: 'auto',
                    borderRadius: 2,
                    order: { xs: 2, md: 1 }
                  }}
                >
                  <List sx={{ p: 0 }}>
                    {chats.map((chat, index) => (
                      <React.Fragment key={chat.id}>
                        <ListItem
                          button
                          selected={selectedChat?.id === chat.id}
                          onClick={() => handleSelectChat(chat)}
                          sx={{
                            px: 2,
                            py: 2,
                            bgcolor: selectedChat?.id === chat.id ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                            '&:hover': {
                              bgcolor: selectedChat?.id === chat.id ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Badge
                              color="primary"
                              variant="dot"
                              invisible={!chat.hasUnread}
                              overlap="circular"
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                              }}
                            >
                              <Avatar
                                src={chat.otherParticipant?.photoURL}
                                alt={chat.otherParticipant?.displayName}
                              >
                                {chat.otherParticipant?.displayName?.[0] || 'A'}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: chat.hasUnread ? 600 : 400,
                                  fontFamily: '"Cormorant Garamond", serif',
                                  fontSize: '1.05rem',
                                  color: 'text.primary'
                                }}
                              >
                                {chat.otherParticipant?.displayName || 'Astrologer'}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography
                                  variant="caption"
                                  component="span"
                                  sx={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    color: 'primary.main',
                                    mb: 0.5
                                  }}
                                >
                                  {t(`services.${chat.serviceType}.title`) || 'Consultation'}
                                </Typography>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                  <Typography
                                    noWrap
                                    variant="body2"
                                    component="span"
                                    sx={{
                                      maxWidth: '140px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      color: chat.hasUnread ? 'text.primary' : 'text.secondary',
                                      fontSize: '0.85rem',
                                      fontWeight: chat.hasUnread ? 500 : 400
                                    }}
                                  >
                                    {chat.lastMessage?.text || t('messages.noMessages')}
                                  </Typography>

                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: '0.75rem',
                                      color: 'text.secondary'
                                    }}
                                  >
                                    {formatChatDate(chat.updatedAt)}
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < chats.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              )}

              {/* Chat View Area */}
              <Box sx={{
                flex: 1,
                width: { xs: '100%', md: '600px' },
                order: { xs: 1, md: 2 }
              }}>
                {selectedChat ? (
                  <Box>
                    {/* Chat Header */}
                    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          {/* Back Button for Mobile */}
                          {isMobileChat && (
                            <IconButton
                              onClick={handleBackToList}
                              sx={{
                                mr: 2,
                                bgcolor: 'background.paper',
                                boxShadow: 1,
                                '&:hover': { bgcolor: 'background.paper' }
                              }}
                              size="small"
                            >
                              <ArrowBackIcon />
                            </IconButton>
                          )}

                          <Avatar
                            src={selectedChat.otherParticipant?.photoURL}
                            alt={selectedChat.otherParticipant?.displayName}
                            sx={{ width: 40, height: 40, mr: 2 }}
                          >
                            {selectedChat.otherParticipant?.displayName?.[0] || 'A'}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontFamily: '"Cormorant Garamond", serif',
                                fontWeight: 600,
                                fontSize: isMobileChat ? '1.1rem' : '1.25rem'
                              }}
                            >
                              {selectedChat.otherParticipant?.displayName || t('chat.astrologer')}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: isMobileChat ? '0.8rem' : '0.875rem' }}
                            >
                              {t('chat.serviceLabel')} {t(`services.${selectedChat.serviceType}.title`) || t('chat.consultation')}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Title for Mobile */}
                        {isMobileChat && (
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: '"Cormorant Garamond", serif',
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                color: 'text.secondary'
                              }}
                            >
                              {t('messages.yourReadings')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>

                    {/* Chat Messages */}
                    <ChatBox
                      chatId={selectedChat.id}
                      otherUser={selectedChat.otherParticipant}
                    />
                  </Box>
                ) : (
                  // Show this on larger screens when no chat is selected
                  !isMobile && (
                    <Box
                      sx={{
                        height: '70vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        p: 4
                      }}
                    >
                      <ChatIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.6, mb: 2 }} />
                      <Typography variant="h6" sx={{ mb: 2, fontFamily: '"Cormorant Garamond", serif' }}>
                        Select a conversation
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center">
                        Choose a reading from the list to view your conversation with the astrologer
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </Box>
          )}
        </Container>
      </Box>
    </ProtectedRoute>
  );
} 