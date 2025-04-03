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

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

export default function ResetPassword() {
  const theme = useTheme();
  const { resetPassword } = useAuth();

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
      setMessage('Check your email for further instructions');
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to reset password. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password | Valluvar Vaasal</title>
        <meta name="description" content="Reset your Valluvar Vaasal account password" />
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
                Reset Password
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
                  Enter your email address and we'll send you a link to reset your password.
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
                  Reset Password
                </Button>

                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Link href="/login" passHref legacyBehavior>
                    <MuiLink
                      underline="hover"
                      sx={{
                        color: theme.palette.primary.main,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1rem',
                        fontWeight: 600
                      }}
                    >
                      Back to Login
                    </MuiLink>
                  </Link>
                </Box>
              </Box>
            </MotionPaper>
          </Container>
        </Box>
      </Box>
    </>
  );
} 