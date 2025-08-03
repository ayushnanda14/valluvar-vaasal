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
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// Wrap MUI components with motion
const MotionCard = motion(Card);
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);

const ServiceCard = ({ title, destinationUrl, description, cue, imageSrc, delay, isLoggedIn }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { t } = useTranslation('common');
  const router = useRouter();

  // Determine the optimal object position based on screen size
  let imagePosition;
  if (isMobile) {
    imagePosition = 'center 30%'; // Lower focus point for mobile
  } else if (isTablet) {
    imagePosition = 'center 18%'; // Slightly lower focus for tablets
  } else {
    imagePosition = 'center 20%'; // Lower focus point for desktop
  }

  // Dynamic card dimensions based on viewport
  const cardHeight = {
    xs: '350px',
    md: '400px',
    lg: '500px',
    xl: '500px'
  };

  const cardWidth = {
    xs: '95vw',
    sm: '85vw',
    md: '100%',
    lg: '100%',
    xl: '100%'
  };

  const imageHeight = {
    xs: '200px',
    sm: '220px',
    md: '250px',
    lg: '280px',
    xl: '300px'
  };

  const contentJustify = isLoggedIn ? 'flex-start' : 'space-between';

  return (
    <Grid item xs={12} sm={6} md={4}>

        <Box onClick={() => { if (isLoggedIn) router.push(destinationUrl); }} sx={{
          display: 'flex',
          justifyContent: 'center',
          height: '100%',
          cursor: isLoggedIn ? 'pointer' : 'default',
          '&:hover': {
            transform: isLoggedIn ? 'translateY(-7px)' : 'none',
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
              height: cardHeight,
              width: cardWidth,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(139, 69, 19, 0.1)',
              position: 'relative',
              '&:hover': {
                boxShadow: isLoggedIn ? '0 12px 28px rgba(139, 69, 19, 0.15)' : '0 8px 20px rgba(139, 69, 19, 0.1)',
                transform: isLoggedIn ? 'translateY(-5px)' : 'none',
                transition: 'all 0.3s ease'
              }
            }}
          >
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <CardMedia
              component="img"
              image={imageSrc}
              alt={title}
              sx={{
                height: imageHeight,
                aspectRatio: '1/1',
                objectFit: 'cover',
                objectPosition: imagePosition,
                width: '100%'
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
            justifyContent: contentJustify,
            overflow: 'hidden'
          }}>
            {/* Show description only when logged OUT */}
            {!isLoggedIn ? (
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
                  lineHeight: 1.4,
                  flexGrow: 1
                }}
              >
                {description}
              </Typography>
            ) : (
              <Typography
                variant="body1"
                sx={{
                  mb: 2,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.1rem' },
                  color: theme.palette.secondary.main,
                  textAlign: 'left',
                  flexGrow: 1
                }}
              >
                {cue}
              </Typography>
            )}
          </CardContent>
        </MotionCard>
      </Box>

    </Grid>
  );
};

const Services = () => {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const { currentUser } = useAuth();
  const isLoggedIn = !!currentUser;

  const servicesList = [
    {
      title: t('services.marriageMatching.title'),
      description: t('services.marriageMatching.description'),
      cue: t('services.marriageMatching.cue'),
      destinationUrl: "/services/marriage-matching",
      imageSrc: "/images/marriage-matching.png",
      delay: 0
    },
    {
      title: t('services.jathakPrediction.title'),
      description: t('services.jathakPrediction.description'),
      cue: t('services.jathakPrediction.cue'),
      destinationUrl: "/services/jathak-prediction",
      imageSrc: "/images/jathak-prediction.png",
      delay: 0.2
    },
    {
      title: t('services.jathakWriting.title'),
      description: t('services.jathakWriting.description'),
      cue: t('services.jathakWriting.cue'),
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

        <Grid
          container
          spacing={{ xs: 3, sm: 4, md: 5 }}
          justifyContent="center"
          sx={{
            width: '100%'
          }}
        >
          {servicesList.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              destinationUrl={service.destinationUrl}
              description={service.description}
              cue={service.cue}
              imageSrc={service.imageSrc}
              delay={service.delay}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Services;
