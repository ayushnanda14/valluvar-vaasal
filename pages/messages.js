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
  useMediaQuery,
  Button,
  Skeleton,
  Chip
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import ChatBox from '../src/components/ChatBox';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { listenUserChatsPage, fetchMoreUserChats } from '../src/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import { ta, enIN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

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
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Hydrate chats from localStorage immediately to avoid layout shifts on navigation
  useEffect(() => {
    try {
      const cached = localStorage.getItem('vv_messages_chats');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      // ignore cache errors
    }
  }, []);

  // Real-time listener – initial load only, independent of router.query to prevent reloads on chat switch
  useEffect(() => {
    let unsubscribe;
    const fetchChats = async () => {
      if (!currentUser) return;
      try {
        setLoading(prev => (chats.length === 0 ? true : prev));
        unsubscribe = listenUserChatsPage(currentUser.uid, 10, ({ chats: pageChats, lastDoc }) => {
          setChats(prev => {
            const map = new Map();
            [...pageChats, ...prev.filter(c => !pageChats.find(pc => pc.id === c.id))].forEach(c => map.set(c.id, c));
            return Array.from(map.values());
          });
          setLastDoc(lastDoc);
          setHasMore(!!lastDoc);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error setting up chats listener:', err);
        setError(t('messages.fetchError'));
        setLoading(false);
      }
    };
    fetchChats();
    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, t]);

  // Persist chats to cache whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('vv_messages_chats', JSON.stringify(chats));
    } catch (e) {
      // ignore
    }
  }, [chats]);

  // Select chat based on URL or default to first on desktop – does not toggle loading
  useEffect(() => {
    if (!chats || chats.length === 0) return;
    const urlChatId = router.query?.chatId;
    if (urlChatId) {
      const chat = chats.find(c => c.id === urlChatId);
      if (chat) setSelectedChat(chat);
    } else if (!isMobile && !selectedChat) {
      setSelectedChat(chats[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.chatId, chats, isMobile]);

  const handleLoadMore = async () => {
    if (!currentUser || !lastDoc || loadingMore) return;
    try {
      setLoadingMore(true);
      const { chats: moreChats, lastDoc: newLastDoc, hasMore } = await fetchMoreUserChats(currentUser.uid, lastDoc, 10);
      setChats(prev => {
        const map = new Map();
        [...prev, ...moreChats].forEach(c => map.set(c.id, c));
        return Array.from(map.values());
      });
      setLastDoc(newLastDoc);
      setHasMore(hasMore);
    } catch (err) {
      console.error('Error loading more chats:', err);
    } finally {
      setLoadingMore(false);
    }
  };

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
    setChatLoading(false);
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  textAlign: { xs: 'center', md: 'left' }
                }}
              >
                {t('messages.yourReadings')}
              </Typography>
              {currentUser?.isDemoUser && (
                <Chip
                  label="Demo User"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: '0.8rem' }}
                />
              )}
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              {/* Left list skeleton (show only on desktop like real list) */}
              {chats && chats.length > 0 ? (
                (!isMobile) && (
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
                      {hasMore && (
                        <ListItem sx={{ justifyContent: 'center' }}>
                          <Button variant="text" onClick={handleLoadMore} disabled={loadingMore}>
                            {loadingMore ? 'Loading…' : 'Load more'}
                          </Button>
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                )
              ) : (
                (!isMobile || !selectedChat) && (

                  <Paper
                    elevation={1}
                    sx={{
                      width: { xs: '100%', md: '360px' },
                      height: '70vh',
                      overflow: 'auto',
                      borderRadius: 2,
                    }}
                  >
                    <List sx={{ p: 0 }}>
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <ListItem key={idx} sx={{ px: 2, py: 2 }}>
                          <ListItemAvatar>
                            <Skeleton variant="circular" width={40} height={40} />
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Skeleton variant="text" width="60%" />}
                            secondary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                <Skeleton variant="text" width="50%" />
                                <Skeleton variant="text" width={60} />
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )
              )}

              {/* Right chat area skeleton */}
              <Box sx={{ flex: 1, width: { xs: '100%', md: '600px' }, order: { xs: 1, md: 2 } }}>
                {/* Header skeleton */}
                <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="40%" height={28} />
                      <Skeleton variant="text" width="30%" />
                    </Box>
                  </Box>
                </Paper>

                {/* Messages skeleton */}
                <Paper sx={{ p: 2, borderRadius: 2, height: '60vh', overflow: 'hidden' }}>
                  <List sx={{ height: '100%' }}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <ListItem key={idx} sx={{ alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                          <Skeleton variant="circular" width={40} height={40} />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="rectangular" height={22} sx={{ mb: 1, maxWidth: 300 }} />
                            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                          </Box>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
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
              justifyContent: 'flex-start',
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Typography
                                    variant="caption"
                                    component="span"
                                    sx={{
                                      fontSize: '0.8rem',
                                      color: 'primary.main'
                                    }}
                                  >
                                    {t(`services.${chat.serviceType}.title`) || 'Consultation'}
                                  </Typography>
                                  {chat.isDemoUser && (
                                    <Chip
                                      label="Demo"
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                      sx={{ fontSize: '0.6rem', height: '20px' }}
                                    />
                                  )}
                                </Box>

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
                    {hasMore && (
                      <ListItem sx={{ justifyContent: 'center' }}>
                        <Button variant="text" onClick={handleLoadMore} disabled={loadingMore}>
                          {loadingMore ? 'Loading…' : 'Load more'}
                        </Button>
                      </ListItem>
                    )}
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
                      {chatLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Skeleton variant="circular" width={40} height={40} />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="40%" height={28} />
                            <Skeleton variant="text" width="30%" />
                          </Box>
                        </Box>
                      ) : (
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
                              {currentUser?.isDemoUser && (
                                <Chip
                                  label="Demo User"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ ml: 1, fontSize: '0.7rem' }}
                                />
                              )}
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
                      )}
                    </Paper>

                    {/* Chat Messages */}
                    <ChatBox
                      chatId={selectedChat.id}
                      otherUser={selectedChat.otherParticipant}
                      onLoadingChange={setChatLoading}
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