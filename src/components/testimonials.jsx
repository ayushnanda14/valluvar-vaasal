import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Avatar, 
  Rating,
  Skeleton,
  useTheme 
} from '@mui/material';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

// Wrap MUI components with motion
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);
const MotionCard = motion(Card);

const Testimonials = () => {
  const theme = useTheme();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        const testimonialsRef = collection(db, 'testimonials');
        const q = query(
          testimonialsRef,
          where('approved', '==', true),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        
        const querySnapshot = await getDocs(q);
        const testimonialsList = [];
        querySnapshot.forEach((doc) => {
          testimonialsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setTestimonials(testimonialsList);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTestimonials();
  }, []);
  
  // Function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Function to get random pastel color based on name
  const getAvatarColor = (name) => {
    if (!name) return '#B39DDB';
    
    const colors = [
      '#FFCCBC', // Peach
      '#FFECB3', // Light Amber
      '#C8E6C9', // Light Green
      '#B3E5FC', // Light Blue
      '#D1C4E9', // Light Purple
      '#F8BBD0', // Light Pink
      '#B2DFDB', // Light Teal
      '#DCEDC8', // Light Lime
    ];
    
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  };
  
  return (
    <Box 
      id="testimonials-section"
      sx={{
        py: { xs: 6, md: 10 },
        background: 'linear-gradient(180deg, rgba(255,248,225,0.5) 0%, rgba(255,255,255,1) 100%)'
      }}
    >
      <Container maxWidth="lg">
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          sx={{ textAlign: 'center', mb: 6 }}
        >
          <MotionTypography 
            variant="h2" 
            component="h2"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              fontSize: { xs: '1.8rem', md: '2.5rem' },
              mb: 2,
              color: theme.palette.secondary.dark
            }}
          >
            Voices of Transformation
          </MotionTypography>
          
          <MotionTypography 
            variant="body1"
            sx={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              color: theme.palette.secondary.main,
              maxWidth: '800px',
              mx: 'auto'
            }}
          >
            Discover how our cosmic guidance has illuminated paths and transformed lives.
            These are the experiences shared by those who have journeyed with us.
          </MotionTypography>
        </MotionBox>
        
        <Grid container spacing={3}>
          {loading ? (
            // Loading skeletons
            Array.from(new Array(6)).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={`skeleton-${index}`}>
                <Card sx={{ height: '100%', boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={50} height={50} sx={{ mr: 2 }} />
                      <Box>
                        <Skeleton variant="text" width={120} />
                        <Skeleton variant="text" width={80} />
                      </Box>
                    </Box>
                    <Skeleton variant="text" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : testimonials.length > 0 ? (
            // Testimonial cards
            testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={6} lg={4} key={testimonial.id}>
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  sx={{ 
                    height: '100%',
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.05)',
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: -15,
                      left: 20,
                      color: theme.palette.primary.main,
                      opacity: 0.2,
                      fontSize: '4rem'
                    }}
                  >
                    <FormatQuoteIcon fontSize="inherit" />
                  </Box>
                  
                  <CardContent sx={{ pt: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: getAvatarColor(testimonial.name),
                          color: theme.palette.getContrastText(getAvatarColor(testimonial.name)),
                          mr: 2,
                          width: 50,
                          height: 50,
                          fontFamily: '"Cinzel", serif',
                          fontWeight: 600
                        }}
                      >
                        {getInitials(testimonial.name)}
                      </Avatar>
                      
                      <Box>
                        <Typography 
                          variant="h6"
                          sx={{
                            fontFamily: '"Cormorant Garamond", serif',
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            color: theme.palette.secondary.dark
                          }}
                        >
                          {testimonial.name}
                        </Typography>
                        
                        <Rating 
                          value={testimonial.rating || 5} 
                          readOnly 
                          size="small"
                          sx={{ color: theme.palette.primary.main }}
                        />
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="body1"
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.05rem',
                        fontStyle: 'italic',
                        color: theme.palette.text.secondary,
                        mb: 2
                      }}
                    >
                      "{testimonial.text}"
                    </Typography>
                    
                    <Typography 
                      variant="body2"
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        color: theme.palette.text.secondary,
                        fontSize: '0.9rem'
                      }}
                    >
                      {testimonial.service}
                    </Typography>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))
          ) : (
            // No testimonials yet
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography 
                  variant="body1"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    color: theme.palette.text.secondary,
                    fontSize: '1.1rem'
                  }}
                >
                  No testimonials available yet. Be the first to share your experience!
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default Testimonials; 