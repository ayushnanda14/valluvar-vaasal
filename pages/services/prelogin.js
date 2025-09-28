import React, { useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import EmailIcon from '@mui/icons-material/Email';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import VerifiedIcon from '@mui/icons-material/Verified';
import LockIcon from '@mui/icons-material/Lock';

const SERVICE_LABELS = {
  marriageMatching: 'Marriage Matching',
  jathakPrediction: 'Jathak Prediction',
  jathakWriting: 'Jathak Writing'
};

export default function ServicePrelogin() {
  const router = useRouter();
  const { service, redirect } = router.query;
  const { t } = useTranslation('common');

  const serviceLabel = useMemo(() => {
    if (!service) return t('services.ourServices');
    switch (service) {
      case 'marriageMatching':
        return t('services.marriageMatching.title');
      case 'jathakPrediction':
        return t('services.jathakPrediction.title');
      case 'jathakWriting':
        return t('services.jathakWriting.title');
      default:
        return t('services.ourServices');
    }
  }, [service, t]);

  const loginHref = useMemo(() => {
    const target = typeof redirect === 'string' && redirect.length > 0
      ? redirect
      : `/${service === 'marriageMatching' ? 'services/marriage-matching' : service === 'jathakPrediction' ? 'services/jathak-prediction' : service === 'jathakWriting' ? 'services/jathak-writing' : ''}`;
    const encoded = encodeURIComponent(target);
    return `/login?redirect=${encoded}`;
  }, [redirect, service]);

  return (
    <>
      <Head>
        <title>{serviceLabel} — Please Login | Valluvar Vaasal</title>
        <meta name="description" content={t('prelogin.subtitle')} />
      </Head>
      <Box sx={{ 
        position: 'relative', 
        overflow: 'hidden', 
        py: { xs: 6, md: 10 }, 
        background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.6) 50%, rgba(255,248,225,0.8) 100%)'
      }}>
        {/* Subtle decorative elements */}
        <Box sx={{ position: 'absolute', top: '10%', left: '5%', width: 120, height: 120, bgcolor: 'primary.light', opacity: 0.15, filter: 'blur(30px)', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', right: '8%', width: 180, height: 180, bgcolor: 'secondary.light', opacity: 0.15, filter: 'blur(35px)', borderRadius: '50%' }} />

        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h2" component="h1" sx={{ 
              mb: 2, 
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              color: 'secondary.dark',
              fontSize: { xs: '2rem', md: '2.5rem' }
            }}>
              {serviceLabel}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ 
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              maxWidth: 600,
              mx: 'auto'
            }}>
              {t('prelogin.subtitle')}
            </Typography>
          </Box>

          {/* Login Methods Section */}
          <Paper elevation={4} sx={{ 
            p: { xs: 3, md: 4 }, 
            borderRadius: '16px', 
            background: 'rgba(255,255,255,0.95)',
            mb: 4,
            backdropFilter: 'blur(10px)'
          }}>
            <Typography variant="h6" sx={{ 
              mb: 3, 
              fontFamily: '"Cormorant Garamond", serif',
              color: 'secondary.dark',
              textAlign: 'center'
            }}>
              {t('prelogin.loginMethods.title')}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  p: 3, 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(25,118,210,0.1) 100%)',
                  border: '1px solid rgba(25,118,210,0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(25,118,210,0.15)' }
                }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <PhoneIphoneIcon color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={600}>{t('prelogin.loginMethods.phoneOtp')}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t('prelogin.loginMethods.phoneOtpDesc')}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  p: 3, 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(25,118,210,0.1) 100%)',
                  border: '1px solid rgba(25,118,210,0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(25,118,210,0.15)' }
                }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <EmailIcon color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={600}>{t('prelogin.loginMethods.email')}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t('prelogin.loginMethods.emailDesc')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 3 }}>
              <LockIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">{t('prelogin.loginMethods.secure')}</Typography>
            </Stack>
          </Paper>

          {/* Benefits Section */}
          <Paper elevation={4} sx={{ 
            p: { xs: 3, md: 4 }, 
            borderRadius: '16px', 
            background: 'rgba(255,255,255,0.95)',
            mb: 4,
            backdropFilter: 'blur(10px)'
          }}>
            <Typography variant="h6" sx={{ 
              mb: 3, 
              fontFamily: '"Cormorant Garamond", serif',
              color: 'secondary.dark',
              textAlign: 'center'
            }}>
              {t('prelogin.benefits.title')}
            </Typography>
            
            <Grid container spacing={3}>
              {[
                { icon: <FlashOnIcon sx={{ fontSize: 32 }} />, color: 'warning', title: t('prelogin.benefits.instant.title'), desc: t('prelogin.benefits.instant.desc') },
                { icon: <HeadsetMicIcon sx={{ fontSize: 32 }} />, color: 'success', title: t('prelogin.benefits.experts.title'), desc: t('prelogin.benefits.experts.desc') },
                { icon: <VerifiedIcon sx={{ fontSize: 32 }} />, color: 'primary', title: t('prelogin.benefits.satisfaction.title'), desc: t('prelogin.benefits.satisfaction.desc') },
                { icon: <LockIcon sx={{ fontSize: 32 }} />, color: 'action', title: t('prelogin.benefits.privacy.title'), desc: t('prelogin.benefits.privacy.desc') }
              ].map((benefit, idx) => (
                <Grid item xs={12} sm={6} key={benefit.title}>
                  <Box component={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: idx * 0.1, ease: 'easeOut' }}
                  >
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, rgba(139,69,19,0.03) 0%, rgba(139,69,19,0.08) 100%)',
                      border: '1px solid rgba(139,69,19,0.1)',
                      height: '100%',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(139,69,19,0.1)' }
                    }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                        <Box sx={{ color: `${benefit.color}.main` }}>
                          {benefit.icon}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                            {benefit.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {benefit.desc}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* CTA Section */}
          <Box sx={{ textAlign: 'center' }}>
            <Link href={loginHref} legacyBehavior>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1.1rem',
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 600,
                  borderRadius: 3,
                  boxShadow: '0 8px 25px rgba(25,118,210,0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 35px rgba(25,118,210,0.4)'
                  }
                }}
              >
                {t('prelogin.cta')}
              </Button>
            </Link>
          </Box>
        </Container>
      </Box>
    </>
  );
}



