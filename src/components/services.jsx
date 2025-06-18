import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from 'react-i18next';

// Wrap MUI components with motion
const MotionCard = motion(Card);
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);

const ServiceCard = ({ title, destinationUrl, description, imageSrc, delay }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { t } = useTranslation('common');

  // Determine the optimal object position based on screen size
  let imagePosition;
  if (isMobile) {
    imagePosition = 'center 30%'; // Lower focus point for mobile
  } else if (isTablet) {
    imagePosition = 'center 18%'; // Slightly lower focus for tablets
  } else {
    imagePosition = 'center 20%'; // Lower focus point for desktop
  }

  // Responsive image height
  const imageHeight = isMobile ? 200 : isTablet ? 240 : 280;

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Link href={destinationUrl || '/'} passHref legacyBehavior>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          height: '100%',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-7px)',
            transition: 'all 0.3s ease'
          },
          '&:not(:hover)': {
            transform: 'translateY(0)',
            transition: 'all 0.4s ease-out'
          },
          transition: 'all 0.3s ease'
        }}>
          <MotionCard
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: delay, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(139, 69, 19, 0.1)',
              position: 'relative',
              width: '100%',
              minHeight: { xs: '400px', sm: '450px', md: '500px' }, // Responsive min height
              '&:hover': {
                boxShadow: '0 12px 28px rgba(139, 69, 19, 0.15)',
                transform: 'translateY(-5px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                height={imageHeight}
                image={imageSrc}
                alt={title}
                sx={{
                  objectFit: 'cover',
                  objectPosition: imagePosition,
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '40%',
                    background: 'linear-gradient(to bottom, rgba(255,248,225,0) 0%, rgba(255,248,225,1) 100%)',
                    zIndex: 1
                  }
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '40%',
                  background: 'linear-gradient(to bottom, rgba(255,248,225,0) 0%, rgba(255,248,225,1) 100%)',
                  zIndex: 1
                }}
              />
              <Typography
                variant={isMobile ? "h6" : "h5"}
                component="h3"
                sx={{
                  position: 'absolute',
                  bottom: { xs: -5, sm: -8, md: -10 },
                  left: 0,
                  width: '100%',
                  px: { xs: 2, sm: 2.5, md: 3 },
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 600,
                  color: theme.palette.secondary.dark,
                  zIndex: 2,
                  textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                  fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
                  lineHeight: 1.2
                }}
              >
                {title}
              </Typography>
            </Box>

            <CardContent sx={{
              flexGrow: 1,
              pt: { xs: 3, sm: 3.5, md: 4 },
              pb: 2,
              px: { xs: 2, sm: 2.5, md: 3 },
              background: theme.palette.background.paper,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: { xs: '180px', sm: '200px', md: '220px' } // Responsive content height
            }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 2,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.1rem' },
                  color: theme.palette.secondary.main,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: { xs: 3, sm: 4, md: 4 },
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4
                }}
              >
                {description}
              </Typography>
              <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-start' }}>
                <Link href={destinationUrl || '/'} passHref legacyBehavior>
                  <Button
                    endIcon={<ArrowForwardIcon sx={{ fontSize: { xs: '1rem', md: '1.2rem' } }} />}
                    component="span"
                    sx={{
                      textTransform: 'none',
                      fontFamily: '"Cormorant Garamond", serif',
                      fontWeight: 600,
                      fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                      color: theme.palette.primary.main,
                      px: { xs: 1, sm: 1.5, md: 2 },
                      py: { xs: 0.5, sm: 0.75, md: 1 },
                      minHeight: { xs: '36px', sm: '40px', md: '44px' },
                      '&:hover': {
                        backgroundColor: 'transparent',
                        color: theme.palette.primary.dark,
                      }
                    }}
                  >
                    {t('services.checkOut')}
                  </Button>
                </Link>
              </Box>
            </CardContent>
          </MotionCard>
        </Box>
      </Link>
    </Grid>
  );
};

const Services = () => {
  const theme = useTheme();
  const { t } = useTranslation('common');

  const servicesList = [
    {
      title: t('services.marriageMatching.title'),
      description: t('services.marriageMatching.description'),
      destinationUrl: "/services/marriage-matching",
      imageSrc: "/images/marriage-matching.png",
      delay: 0
    },
    {
      title: t('services.jathakPrediction.title'),
      description: t('services.jathakPrediction.description'),
      destinationUrl: "/services/jathak-prediction",
      imageSrc: "/images/jathak-prediction.png",
      delay: 0.2
    },
    {
      title: t('services.jathakWriting.title'),
      description: t('services.jathakWriting.description'),
      destinationUrl: "/services/jathak-writing",
      imageSrc: "/images/jathak-writing.png",
      delay: 0.4
    }
  ];

  return (
    <Box
      id="services-section"
      component="section"
      sx={{
        py: { xs: 6, md: 10 },
        background: 'linear-gradient(180deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.4) 100%)'
      }}
    >
      <Container maxWidth="lg">
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          sx={{ mb: 6, textAlign: 'center' }}
        >
          <MotionTypography
            variant="h2"
            component="h2"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: theme.palette.secondary.dark,
              mb: 2
            }}
          >
            {t('services.ourServices')}
          </MotionTypography>

          <MotionTypography
            variant="body1"
            sx={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '1.2rem',
              color: theme.palette.secondary.main,
              maxWidth: '800px',
              mx: 'auto'
            }}
          >
            {t('services.servicesDescription')}
          </MotionTypography>
        </MotionBox>

        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} justifyContent="center" wrap="nowrap" sx={{ overflowX: 'auto' }}>
          {servicesList.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              destinationUrl={service.destinationUrl}
              description={service.description}
              imageSrc={service.imageSrc}
              delay={service.delay}
            />
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Services;
