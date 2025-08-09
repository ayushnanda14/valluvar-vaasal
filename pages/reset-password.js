import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link as MuiLink,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../src/context/AuthContext';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

export default function ResetPassword() {
  const theme = useTheme();
  const { resetPassword } = useAuth();
  const { t } = useTranslation('common');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);
      await resetPassword(email);
      setMessage(t('resetPassword.successMessage'));
    } catch (error) {
      console.error('Password reset error:', error);
      setError(t('resetPassword.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('resetPassword.title')} | {t('brand')}</title>
        <meta name="description" content={t('resetPassword.description')} />
      </Head>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>

        <Box
          sx={{
            py: { xs: 6, md: 10 },
            backgroundColor: theme.palette.background.default,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Container maxWidth="sm">
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              elevation={3}
              sx={{
                p: { xs: 3, md: 5 },
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.95)'
              }}
            >
              <Typography
                variant="h4"
                component="h1"
                align="center"
                sx={{
                  mb: 4,
                  fontFamily: '"Cinzel", serif',
                  color: theme.palette.secondary.dark
                }}
              >
                {t('resetPassword.heading')}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {message && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {message}
                </Alert>
              )}

              <Box component="form" onSubmit={handleResetPassword} noValidate>
                <Typography
                  variant="body1"
                  sx={{
                    mb: 3,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1.1rem',
                    color: theme.palette.secondary.main
                  }}
                >
                  {t('resetPassword.instructions')}
                </Typography>

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontFamily: '"Cinzel", serif',
                    textTransform: 'none',
                    fontSize: '1rem'
                  }}
                >
                  {t('resetPassword.button')}
                </Button>

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <MuiLink
                    href="/login"
                    underline="hover"
                    sx={{
                      color: theme.palette.primary.main,
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    {t('resetPassword.backToLogin')}
                  </MuiLink>
                </Box>
              </Box>
            </MotionPaper>
          </Container>
        </Box>
      </Box>
    </>
  );
} 