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
import AddIcon from '@mui/icons-material/Add';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Wrap MUI components with motion
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);
const MotionButton = motion(Button);
const MotionCard = motion(Card);

const PersonalizedHero = () => {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };
  
  // Fetch recent chats
  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const chatsRef = collection(db, 'chats');
        const q = query(
          chatsRef,
          where('userId', '==', currentUser.uid),
          orderBy('lastUpdated', 'desc'),
          limit(3)
        );
        
        const querySnapshot = await getDocs(q);
        const chats = [];
        querySnapshot.forEach((doc) => {
          chats.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setRecentChats(chats);
      } catch (error) {
        console.error('Error fetching recent chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentChats();
  }, [currentUser]);
  
  return (
    <Box 
      sx={{
        background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
        pt: { xs: 4, md: 6 },
        pb: { xs: 6, md: 8 },
        overflow: 'hidden'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="flex-start">
          {/* Welcome Message - Left Side */}
          <Grid item xs={12} md={6}>
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <MotionTypography 
                variant="h1" 
                component="h1"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 2,
                  color: theme.palette.secondary.dark,
                  lineHeight: 1.2
                }}
              >
                Welcome back, {getFirstName()}
              </MotionTypography>
              
              <MotionTypography 
                variant="body1"
                sx={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  mb: 4,
                  color: theme.palette.secondary.main,
                  lineHeight: 1.6,
                  maxWidth: '90%'
                }}
              >
                Your cosmic journey continues. What would you like to explore today?
              </MotionTypography>
              
              <MotionButton
                variant="contained"
                color="primary"
                size="large"
                startIcon={<StarIcon sx={{ color: '#FFF8E1' }} />}
                onClick={scrollToServices}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                sx={{
                  fontFamily: '"Cinzel", serif',
                  py: 1.5,
                  px: 3,
                  fontSize: '1rem',
                  fontWeight: 500,
                  boxShadow: '0px 4px 12px rgba(214, 126, 34, 0.2)',
                  textTransform: 'none',
                  color: '#FFF8E1',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  }
                }}
              >
                Explore Services
              </MotionButton>
            </MotionBox>
          </Grid>
          
          {/* Recent Chats - Right Side */}
          <Grid item xs={12} md={6}>
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: 2,
                p: 3,
                boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography 
                  variant="h6" 
                  sx={{
                    fontFamily: '"Cinzel", serif',
                    fontWeight: 600,
                    color: theme.palette.secondary.dark
                  }}
                >
                  Recent Readings
                </Typography>
                
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/new-reading')}
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  New Reading
                </Button>
              </Box>
              
              {loading ? (
                // Loading skeleton
                Array.from(new Array(2)).map((_, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, mb: 1 }} />
                  </Box>
                ))
              ) : recentChats.length > 0 ? (
                // Recent chats list
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
                    <CardActionArea onClick={() => router.push(`/chat/${chat.id}`)}>
                      <CardContent>
                        <Typography 
                          variant="h6" 
                          sx={{
                            fontFamily: '"Cormorant Garamond", serif',
                            fontWeight: 600,
                            fontSize: '1.2rem',
                            color: theme.palette.secondary.dark
                          }}
                        >
                          {chat.title || 'Untitled Reading'}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: '0.9rem', color: theme.palette.text.secondary, mr: 0.5 }} />
                          <Typography 
                            variant="body2" 
                            sx={{
                              fontFamily: '"Cormorant Garamond", serif',
                              color: theme.palette.text.secondary
                            }}
                          >
                            {formatDate(chat.lastUpdated)}
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
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {chat.lastMessage || 'Click to continue your reading...'}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </MotionCard>
                ))
              ) : (
                // No chats yet
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ChatIcon sx={{ fontSize: '3rem', color: 'rgba(0,0,0,0.2)', mb: 2 }} />
                  <Typography 
                    variant="body1"
                    sx={{
                      fontFamily: '"Cormorant Garamond", serif',
                      color: theme.palette.text.secondary
                    }}
                  >
                    You haven't had any readings yet.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    size="medium"
                    onClick={() => router.push('/new-reading')}
                    sx={{
                      mt: 2,
                      fontFamily: '"Cinzel", serif',
                      textTransform: 'none'
                    }}
                  >
                    Start Your First Reading
                  </Button>
                </Box>
              )}
              
              {recentChats.length > 0 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={() => router.push('/my-readings')}
                    sx={{
                      fontFamily: '"Cormorant Garamond", serif',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    View All Readings
                  </Button>
                </Box>
              )}
            </MotionBox>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default PersonalizedHero; 