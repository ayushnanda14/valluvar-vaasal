import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ExploreIcon from '@mui/icons-material/Explore';
import StarIcon from '@mui/icons-material/Star';
import { useTranslation } from 'react-i18next';

// Wrap MUI components with motion
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);
const MotionButton = motion(Button);

const Hero = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation('common');
  
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
  
  return (
    <Box 
      sx={{
        background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
        pt: { xs: 4, md: 8 },
        pb: { xs: 6, md: 10 },
        overflow: 'hidden'
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 4, md: 6 }
          }}
        >
          {/* Text Content - Left Side */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
            <MotionBox
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <MotionTypography 
                variant="h1" 
                component="h1"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  fontSize: { xs: '2rem', md: '2.8rem' },
                  mb: 2,
                  color: theme.palette.secondary.dark,
                  lineHeight: 1.2
                }}
              >
                {t('hero.title')}
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
                {t('hero.subtitle')}
              </MotionTypography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
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
                  {t('hero.ctaPrimary')}
                </MotionButton>
                
                <Link href="/about" passHref legacyBehavior>
                  <MotionButton
                    component="a"
                    variant="outlined"
                    color="secondary"
                    size="large"
                    startIcon={<ExploreIcon />}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    sx={{
                      fontFamily: '"Cormorant Garamond", serif',
                      py: 1.5,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 500,
                      borderWidth: 2,
                      textTransform: 'none'
                    }}
                  >
                    {t('hero.ctaSecondary')}
                  </MotionButton>
                </Link>
              </Box>
            </MotionBox>
          </Box>
          
          {/* Image - Right Side */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
            <MotionBox
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: { xs: '300px', md: '500px' },
                position: 'relative'
              }}
            >
              <Box
                component="img"
                src="/images/astrology-illustration.png" 
                alt={t('hero.imageAlt')}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.1))'
                }}
              />
            </MotionBox>
          </Box>
        </Box>
          </Container>
    </Box>
  );
};

export default Hero;
