import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  useTheme,
  useMediaQuery,
  Skeleton
} from '@mui/material';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import StarIcon from '@mui/icons-material/Star';
import ChatIcon from '@mui/icons-material/Chat';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import FilePreviewModal from './FilePreviewModal';
import { SERVICE_TYPES } from '@/utils/constants';
import { useTranslation } from 'react-i18next';

// Wrap MUI components with motion
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);
const MotionButton = motion(Button);
const MotionCard = motion(Card);

const PersonalizedHero = () => {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { t } = useTranslation('common');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Function to handle smooth scroll to services section
  const scrollToServices = () => {
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Get user's first name
  const getFirstName = () => {
    if (!currentUser || !currentUser.displayName) return '';
    return currentUser.displayName.split(' ')[0];
  };

  // Format date to relative time (today, yesterday, or date)
  const formatDate = (timestamp) => {
    if (!timestamp) return '';

    const date = timestamp.toDate();
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('date.today');
    } else if (diffDays === 1) {
      return t('date.yesterday');
    } else if (diffDays < 7) {
      return t('date.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString(router.locale || 'en', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Fetch recent chats
  useEffect(() => {
    let unsubscribe;

    const fetchRecentChats = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const chatsRef = collection(db, 'chats');
        const q = query(
          chatsRef,
          where('participants', 'array-contains', currentUser.uid),
          orderBy('updatedAt', 'desc'),
          limit(3)
        );

        // Use onSnapshot for real-time updates
        unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const chats = [];

          for (const dc of querySnapshot.docs) {
            const chatData = dc.data();

            // Get other participant details
            const otherParticipantId = chatData.participants.find(id => id !== currentUser.uid);
            if (otherParticipantId) {
              const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                chatData.otherParticipant = {
                  id: otherParticipantId,
                  displayName: userData.displayName || 'User',
                  photoURL: userData.photoURL || null
                };
              }
            }

            chats.push({
              id: dc.id,
              ...chatData
            });
            console.log(chats);
          }

          setRecentChats(chats);
          setLoading(false);
        }, (error) => {
          console.error('Error in recent chats listener:', error);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up recent chats listener:', error);
        setLoading(false);
      }
    };

    fetchRecentChats();

    // Clean up listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  const openFilePreview = (fileData) => {
    setPreviewFile(fileData);
    setModalOpen(true);
  };

  const closeFilePreview = () => {
    setModalOpen(false);
  };

  return (
    <Box
      sx={{
        py: { xs: 4, md: 10 },
        background: `linear-gradient(180deg, ${theme.palette.background.default} 20%, ${theme.palette.background.paper} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 -10px 10px -10px rgba(0,0,0,0.1)'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 0,
          opacity: 0.04,
          background: `url('/images/celestial-pattern.png')`,
          backgroundSize: 'cover',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: { xs: 3, md: 4 }
          }}
        >
          {/* Left side: Welcome Message */}
          <Box sx={{ 
            flex: { xs: '1 1 100%', sm: '3 1 0%' },
            textAlign: { xs: 'center', sm: 'left' }, // Center text on mobile
            mx: { xs: 'auto', sm: 0 } // Center horizontally on mobile
          }}>
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'center', sm: 'flex-start' } // Center content on mobile
              }}
            >
              <MotionTypography
                variant="h2"
                component="h1"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontSize: { xs: '2.5rem', sm: '2.2rem', md: '3.5rem' },
                  fontWeight: 700,
                  mb: 2
                }}
              >
                {currentUser ? (
                  <>
                    {t('personalizedHero.greeting')}, <span style={{ color: theme.palette.primary.main }}>{getFirstName()}</span>
                  </>
                ) : (
                  t('personalizedHero.titleGuest')
                )}
              </MotionTypography>

              <MotionTypography
                variant="h6"
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: { xs: '1.2rem', sm: '1.2rem', md: '1.4rem' },
                  fontWeight: 400,
                  color: theme.palette.text.secondary,
                  mb: 2,
                  maxWidth: { xs: '100%', sm: '60%' }
                }}
              >
                {currentUser
                  ? t('personalizedHero.subtitleUser')
                  : t('personalizedHero.subtitleGuest')}
              </MotionTypography>

              {/* New line for favourite astrologers */}
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  color: theme.palette.primary.main,
                  mb: 4,
                  fontWeight: 500
                }}
              >
                {t('personalizedHero.chooseFavourite', 'Choose your favourite among the best astrologers from your favourite district.')}
              </Typography>

              {!currentUser && (
                <MotionButton
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => router.push('/signup')}
                  sx={{
                    py: { xs: 1, md: 1.5 },
                    px: { xs: 2, md: 4 },
                    fontFamily: '"Cinzel", serif',
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 500,
                    textTransform: 'none',
                    boxShadow: '0px 8px 24px rgba(149, 157, 165, 0.2)'
                  }}
                >
                  {t('personalizedHero.ctaGuest')}
                </MotionButton>
              )}
            </MotionBox>
          </Box>

          {/* Right side: Recent Readings or Testimonials */}
          <Box sx={{ 
            flex: { xs: '1 1 100%', sm: '2 1 0%' },
            width: { xs: '95%', sm: 'auto' },
            mx: { xs: 'auto', sm: 0 }
          }}>
            <MotionBox
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              sx={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                p: { xs: 2, md: 3 },
                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontWeight: 600,
                    color: theme.palette.secondary.dark,
                    fontSize: { xs: '1.2rem', sm: '1.3rem', md: '1.5rem' }
                  }}
                >
                  {currentUser ? t('personalizedHero.readingsTitle') : t('personalizedHero.testimonialsTitle')}
                </Typography>
                
                {currentUser && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={scrollToServices}
                    sx={{
                      fontFamily: '"Cinzel", serif',
                      textTransform: 'none',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: 0.5,
                      px: 1.5
                    }}
                  >
                    {t('personalizedHero.newReadingButton')}
                  </Button>
                )}
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Show skeleton loading state */}
              {loading && (
                <>
                  {[1, 2, 3].map((item) => (
                    <Box key={item} sx={{ mb: 2 }}>
                      <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
                    </Box>
                  ))}
                </>
              )}

              {/* Show recent chats for logged-in users */}
              {!loading && currentUser && recentChats.length > 0 ? (
                recentChats.map((chat) => (
                  <MotionCard
                    key={chat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    sx={{
                      mb: 2,
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0px 2px 8px rgba(0,0,0,0.05)'
                    }}
                  >
                    <CardActionArea onClick={() => {
                      if (chat.fileReferences && chat.fileReferences.length > 0) {
                        openFilePreview(chat.fileReferences[0]);
                      } else {
                        router.push(`/messages?chatId=${chat.id}`);
                      }
                    }}>
                      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontFamily: '"Cormorant Garamond", serif',
                              fontWeight: 600,
                              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
                              color: theme.palette.secondary.dark
                            }}
                          >
                            {SERVICE_TYPES[chat.serviceType] || t('personalizedHero.defaultReadingTitle')}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: '"Cormorant Garamond", serif',
                              color: theme.palette.primary.main,
                              fontSize: { xs: '0.75rem', md: '0.875rem' },
                              fontWeight: 800,
                              textAlign: 'right'
                            }}
                          >
                            {chat.astrologerName || chat.otherParticipant.displayName || t('personalizedHero.defaultAstrologerName')}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' }, color: theme.palette.text.secondary, mr: 0.5 }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: '"Cormorant Garamond", serif',
                              color: theme.palette.text.secondary,
                              fontSize: { xs: '0.75rem', md: '0.875rem' }
                            }}
                          >
                            {formatDate(chat.updatedAt)}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            fontFamily: '"Cormorant Garamond", serif',
                            color: theme.palette.text.secondary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            fontSize: { xs: '0.75rem', md: '0.875rem' }
                          }}
                        >
                          {chat.lastMessage?.text || t('personalizedHero.viewReadingPrompt')}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </MotionCard>
                ))
              ) : (
                // No chats yet
                !loading && currentUser && (
                  <Box sx={{ textAlign: 'center', py: { xs: 2, md: 4 } }}>
                    <ChatIcon sx={{ fontSize: { xs: '2rem', md: '3rem' }, color: 'rgba(0,0,0,0.2)', mb: 1 }} />
                    <Typography
                      variant="body1"
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        color: theme.palette.text.secondary,
                        fontSize: { xs: '0.875rem', md: '1rem' }
                      }}
                    >
                      {t('personalizedHero.noReadings')}
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={scrollToServices}
                      sx={{
                        mt: 1,
                        fontFamily: '"Cinzel", serif',
                        textTransform: 'none',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}
                    >
                      {t('personalizedHero.startReadingButton')}
                    </Button>
                  </Box>
                )
              )}

              {/* Placeholder for guest content if needed */}
              {!loading && !currentUser && (
                <Box sx={{ textAlign: 'center', py: { xs: 2, md: 4 } }}>
                   <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif', color: theme.palette.text.secondary }}>
                     {t('personalizedHero.guestPlaceholder')}
                   </Typography>
                 </Box>
              )}

              {!loading && currentUser && recentChats.length > 0 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={scrollToServices}
                    sx={{
                      fontFamily: '"Cinzel", serif',
                      textTransform: 'none',
                      fontSize: { xs: '0.75rem', md: '0.875rem' }
                    }}
                  >
                    {t('personalizedHero.newReadingButton')}
                  </Button>
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="text"
                      color="secondary"
                      onClick={() => router.push('/messages')}
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}
                    >
                      {t('personalizedHero.seeAllChatsButton')}
                    </Button>
                  </Box>
                </Box>
              )}
            </MotionBox>
          </Box>
        </Box>
      </Container>

      <FilePreviewModal
        open={modalOpen}
        onClose={closeFilePreview}
        file={previewFile}
      />
    </Box>
  );
};

export default PersonalizedHero; 