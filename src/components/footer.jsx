import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Divider, 
  Link as MuiLink,
  useTheme
} from '@mui/material';
import Link from 'next/link';

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  
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
      component="footer" 
      sx={{ 
        backgroundColor: 'rgba(139, 69, 19, 0.1)', // Slightly darker than the theme
        color: theme.palette.secondary.dark,
        mt: 'auto', // This helps it stick to the bottom when used with flexbox
        pt: 6,
        pb: 4
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand/Logo Section */}
          <Grid item xs={12} md={6}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: '"Cinzel", serif',
                fontWeight: 600,
                letterSpacing: '1px',
                mb: 2,
                color: theme.palette.primary.dark
              }}
            >
              Valluvar Vaasal
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 3,
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1rem',
                maxWidth: '90%'
              }}
            >
              Guiding souls through the cosmic wisdom of ancient Tamil astrology. 
              Discover your path written in the stars.
            </Typography>
          </Grid>
          
          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: '"Cinzel", serif',
                fontSize: '1.1rem',
                mb: 2,
                color: theme.palette.secondary.dark
              }}
            >
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/about" passHref legacyBehavior>
                <MuiLink 
                  underline="true" 
                  sx={{ 
                    color: theme.palette.secondary.main,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem',
                    '&:hover': { color: theme.palette.primary.main }

                  }}
                >
                  About Us
                </MuiLink>
              </Link>
              <MuiLink 
                component="button"
                underline="true" 
                onClick={scrollToServices}
                sx={{ 
                  color: theme.palette.secondary.main,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1rem',
                  textAlign: 'left',
                  '&:hover': { color: theme.palette.primary.main },
                  textDecoration: 'underline'
                }}
              >
                Services
              </MuiLink>
            </Box>
          </Grid>
          
          {/* Contact */}
          <Grid item xs={12} md={4}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: '"Cinzel", serif',
                fontSize: '1.1rem',
                mb: 2,
                color: theme.palette.secondary.dark
              }}
            >
              Contact Us
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1rem'
                }}
              >
                123 Cosmic Avenue
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1rem'
                }}
              >
                Chennai, Tamil Nadu 600001
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1rem'
                }}
              >
                Email: info@valluvarvaasal.com
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1rem'
                }}
              >
                Phone: +91 98765 43210
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ mt: 4, mb: 3, borderColor: 'rgba(139, 69, 19, 0.2)' }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '0.9rem',
              color: theme.palette.secondary.main
            }}
          >
            © {currentYear} Valluvar Vaasal. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Link href="/privacy" passHref legacyBehavior>
              <MuiLink 
                underline="hover" 
                sx={{ 
                  color: theme.palette.secondary.main,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '0.9rem',
                  '&:hover': { color: theme.palette.primary.main }
                }}
              >
                Privacy Policy
              </MuiLink>
            </Link>
            <Link href="/terms" passHref legacyBehavior>
              <MuiLink 
                underline="hover" 
                sx={{ 
                  color: theme.palette.secondary.main,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '0.9rem',
                  '&:hover': { color: theme.palette.primary.main }
                }}
              >
                Terms of Service
              </MuiLink>
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
