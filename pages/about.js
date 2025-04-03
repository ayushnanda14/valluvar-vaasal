import React from 'react';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Paper,
  useTheme,
  Button
} from '@mui/material';
import { motion } from 'framer-motion';
import Navbar from '../src/components/navbar';
import Footer from '../src/components/footer';

// Define motion components outside the component function
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);

export default function About() {
  const theme = useTheme();
  
  return (
    <>
      <Head>
        <title>About Us | Valluvar Vaasal</title>
        <meta name="description" content="Learn about our mission to preserve and share the ancient Tamil astrological wisdom" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        <Navbar />
        
        {/* Hero Section with Background Image */}
        <Box 
          sx={{
            position: 'relative',
            height: { xs: '50vh', md: '60vh' },
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '30%',
              background: `linear-gradient(to bottom, rgba(255,248,225,0) 0%, ${theme.palette.background.default} 100%)`,
              zIndex: 1
            }
          }}
        >
          {/* Background Image */}
          <Box 
            component="img"
            src="/images/about-background.jpg" 
            alt="Ancient Tamil Astrology"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              filter: 'brightness(0.8)'
            }}
          />
          
          {/* Overlay */}
          <Box 
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 1
            }}
          />
          
          {/* Title */}
          <MotionTypography
            variant="h1"
            component="h1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            sx={{
              color: '#fff',
              textAlign: 'center',
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              letterSpacing: '2px',
              position: 'relative',
              zIndex: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            Our Mission
          </MotionTypography>
        </Box>
        
        {/* Content Section */}
        <Box 
          sx={{ 
            py: { xs: 6, md: 10 },
            backgroundColor: theme.palette.background.default,
            position: 'relative',
            zIndex: 2
          }}
        >
          <Container maxWidth="md">
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Typography
                    variant="h4"
                    component="h2"
                    gutterBottom
                    sx={{
                      fontFamily: '"Playfair Display", serif',
                      color: theme.palette.secondary.dark,
                      mb: 3,
                      textAlign: 'center'
                    }}
                  >
                    Preserving Ancient Wisdom for Modern Seekers
                  </Typography>
                  
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 3, md: 5 },
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      boxShadow: '0 4px 20px rgba(139, 69, 19, 0.08)'
                    }}
                  >
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.2rem',
                        color: theme.palette.secondary.main,
                        lineHeight: 1.8,
                        mb: 3
                      }}
                    >
                      At Valluvar Vaasal, our mission is to preserve and share the profound wisdom of ancient Tamil astrology—a tradition that has guided countless souls for millennia. In a world of rapid technological advancement and constant change, we believe that the timeless insights of our ancestors offer invaluable guidance for navigating life's journey.
                    </Typography>
                    
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.2rem',
                        color: theme.palette.secondary.main,
                        lineHeight: 1.8,
                        mb: 3
                      }}
                    >
                      Our name, "Valluvar Vaasal," translates to "The Gateway of Valluvar"—honoring the legendary Tamil poet and philosopher Thiruvalluvar, whose wisdom continues to illuminate paths across generations. Like a gateway, we aim to be the bridge connecting the ancient knowledge of Tamil astrology with those seeking clarity in the modern world.
                    </Typography>
                    
                    <Typography
                      variant="h5"
                      component="h3"
                      gutterBottom
                      sx={{
                        fontFamily: '"Cinzel", serif',
                        color: theme.palette.primary.dark,
                        mt: 5,
                        mb: 3
                      }}
                    >
                      Our Core Values
                    </Typography>
                    
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.2rem',
                        color: theme.palette.secondary.main,
                        lineHeight: 1.8,
                        mb: 3
                      }}
                    >
                      <strong>Authenticity:</strong> We remain true to the traditional methods and principles of Tamil astrology, ensuring that our guidance is rooted in authentic practices passed down through generations.
                    </Typography>
                    
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.2rem',
                        color: theme.palette.secondary.main,
                        lineHeight: 1.8,
                        mb: 3
                      }}
                    >
                      <strong>Compassion:</strong> We approach each reading with deep empathy, understanding that every individual's journey is unique and deserving of respectful guidance.
                    </Typography>
                    
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.2rem',
                        color: theme.palette.secondary.main,
                        lineHeight: 1.8,
                        mb: 3
                      }}
                    >
                      <strong>Wisdom:</strong> We believe that true astrological guidance empowers individuals to make informed decisions, not to dictate their paths. Our readings offer insights while honoring your free will.
                    </Typography>
                    
                    <Typography
                      variant="h5"
                      component="h3"
                      gutterBottom
                      sx={{
                        fontFamily: '"Cinzel", serif',
                        color: theme.palette.primary.dark,
                        mt: 5,
                        mb: 3
                      }}
                    >
                      Our Journey
                    </Typography>
                    
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.2rem',
                        color: theme.palette.secondary.main,
                        lineHeight: 1.8
                      }}
                    >
                      Founded by a collective of astrologers, scholars, and spiritual practitioners dedicated to Tamil cultural heritage, Valluvar Vaasal began as a humble effort to digitize ancient astrological texts that were at risk of being lost to time. What started as a preservation project evolved into a mission to make this wisdom accessible to seekers worldwide.
                    </Typography>
                    
                    <Typography
                      variant="body1"
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.2rem',
                        color: theme.palette.secondary.main,
                        lineHeight: 1.8,
                        mt: 3,
                        fontStyle: 'italic'
                      }}
                    >
                      "The stars guide, but do not compel. Through understanding the cosmic patterns that influence us, we gain the wisdom to navigate our destinies with greater awareness."
                    </Typography>
                  </Paper>
                </MotionBox>
              </Grid>
            </Grid>
          </Container>
        </Box>
        
        <Footer />
      </Box>
    </>
  );
}
