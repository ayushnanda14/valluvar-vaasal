import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Divider,
  Link as MuiLink,
  useTheme,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const theme = useTheme();
  const { t } = useTranslation('common');
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
      <Container maxWidth="lg" >
        <Grid container spacing={4} sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
          width: '100%',
          textAlign: { xs: 'center', md: 'left' },
          justifyContent: { xs: 'center', md: 'space-between' }
        }}>
          {/* Brand/Logo Section */}
          <Grid item xs={12} md={6} sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: { xs: 'center', md: 'flex-start' }
          }}>
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
              {t('brand')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mb: 3,
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1rem',
                maxWidth: { xs: '100%', md: '90%' }
              }}
            >
              {t('footer.description')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6} sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'center', sm: 'space-between' },
            alignItems: { xs: 'center', sm: 'flex-start' },
            width: { xs: '100%', md: 'auto' },
            gap: 4
          }}>
            {/* Quick Links */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' }
            }}>
              <Typography 
                variant="h6" 
                sx={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: '1.1rem',
                  mb: 2,
                  color: theme.palette.secondary.dark
                }}
              >
                {t('footer.quickLinks')}
              </Typography>
              <List sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: { xs: 'center', md: 'flex-start' } 
              }}>
                <ListItem disablePadding>
                  <ListItemButton 
                    component={Link} 
                    href="/about" 
                    sx={{ 
                      color: theme.palette.secondary.main,
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: '0.7rem',
                      textDecoration: 'underline',
                      '&:hover': { 
                        color: theme.palette.primary.main,
                        backgroundColor: 'transparent'
                      },
                      '&:visited': { 
                        color: theme.palette.secondary.main 
                      },
                      padding: '0px'
                    }}
                  >
                    <ListItemText primary={t('navbar.about')} />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton 
                    component={MuiLink} 
                    onClick={scrollToServices} 
                    sx={{ 
                      color: theme.palette.secondary.main,
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: '0.7rem',
                      textDecoration: 'underline',
                      '&:hover': { 
                        color: theme.palette.primary.main,
                        backgroundColor: 'transparent'
                      },
                      '&:visited': { 
                        color: theme.palette.secondary.main 
                      },
                      padding: '0px'
                    }}
                  >
                    <ListItemText primary={t('navbar.services')} />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton 
                    component={Link} 
                    href="/feedback" 
                    sx={{ 
                      color: theme.palette.secondary.main,
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: '0.7rem',
                      textDecoration: 'underline',
                      '&:hover': { 
                        color: theme.palette.primary.main,
                        backgroundColor: 'transparent'
                      },
                      '&:visited': { 
                        color: theme.palette.secondary.main 
                      },
                      padding: '0px'
                    }}
                  >
                    <ListItemText primary={t('footer.feedback')} />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>

            {/* Contact */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' }
            }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: '1.1rem',
                  mb: 2,
                  color: theme.palette.secondary.dark
                }}
              >
                {t('footer.contact')}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1,
                alignItems: { xs: 'center', md: 'flex-start' }
              }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem'
                  }}
                >
                  Shri Kamba Kamatchi Amman Kovil, <br />
                  Pachaikoppanpatti, Thirali,
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem'
                  }}
                >
                  Thirumangalam, Madurai, <br />
                  Tamil nadu 625704
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
                  Phone: +91 94887 36192
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ mt: 4, mb: 3, borderColor: 'rgba(139, 69, 19, 0.2)' }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'center', md: 'space-between' },
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            width: '100%'
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '0.9rem',
              color: theme.palette.secondary.main
            }}
          >
            {t('footer.copyright')}
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
                {t('footer.privacy')}
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
                {t('footer.terms')}
              </MuiLink>
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
