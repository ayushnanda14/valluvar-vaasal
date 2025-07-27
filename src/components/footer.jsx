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
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
          width: '100%',
          textAlign: { xs: 'left', md: 'left' },
          justifyContent: { xs: 'flex-start', md: 'space-between' }
        }}>
          {/* Quick Links - Left Side */}
          <Grid item xs={12} md={6} sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'flex-start', md: 'flex-start' },
            width: {xs: '100%', md: 'auto'}
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
              flexDirection: { xs: 'row', md: 'column' },
              alignItems: { xs: 'flex-start', md: 'flex-start' },
              gap: { xs: 2, md: 0 }
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
                    width: 'max-content',
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
                    width: 'max-content',
                    padding: '0px'
                  }}
                >
                  <ListItemText primary={t('navbar.services')} />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/testimonials"
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
                    width: 'max-content',
                    padding: '0px'
                  }}
                >
                  <ListItemText primary={t('footer.feedback')} />
                </ListItemButton>
              </ListItem>
            </List>
          </Grid>

          {/* Contact Us - Right Side */}
          <Grid item xs={12} md={6} sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'flex-start', md: 'flex-start' },
            width: { xs: '100%', md: 'auto' }
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
              flexDirection: { xs: 'row' },
              gap: { xs: 2, md: 3 },
              alignItems: { xs: 'flex-start', md: 'flex-start' },
              width: '100%'
            }}>
              {/* Cultural Hub Address */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                alignItems: { xs: 'flex-start', md: 'flex-start' },
                flex: 1
              }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: theme.palette.primary.dark
                  }}
                >
                  Cultural Hub Address
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '0.9rem'
                  }}
                >
                  Shri Kamba Kamatchi Amman Kovil, <br />
                  Pachaikoppanpatti, Thirali, <br />
                  Thirumangalam, Madurai, <br />
                  Tamil Nadu 625704
                </Typography>
              </Box>

              {/* Office Address */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                alignItems: { xs: 'flex-start', md: 'flex-start' },
                flex: 1
              }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: theme.palette.primary.dark
                  }}
                >
                  Office Address
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '0.9rem'
                  }}
                >
                  Valluvar Vaasal, <br />
                  Kamba Kamatchi Jothida Nilaiyam, <br />
                  5/35/16A, Kamaraj Nagar West, Ward 15, <br />
                  Palaiyampatti (Post), Aruppukottai (Tk), <br />
                  Viruthunagar (Dt) - 626101
                </Typography>
              </Box>

              {/* Contact Information */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                alignItems: { xs: 'flex-start', md: 'flex-start' },
                flex: 1
              }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem'
                  }}
                >
                  Email: valluvarvaasal@gmail.com
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: '1rem'
                    }}
                  >
                    Phone:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '0.9rem' }}>
                      +91 94887 31792
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '0.9rem' }}>
                      +91 94887 36192
                    </Typography>
                  </Box>
                </Box>
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
