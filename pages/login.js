import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
  Alert,
  Link as MuiLink,
  useTheme,
  Tabs,
  Tab,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import Head from 'next/head';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, sendVerificationCode, verifyCodeAndSignUp } = useAuth();

  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone login state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneStep, setPhoneStep] = useState(0); // 0: enter phone, 1: enter code

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Ref for reCAPTCHA container
  const recaptchaContainerRef = useRef(null);

  const handleAuthMethodChange = (event, newValue) => {
    setAuthMethod(newValue);
    setError('');
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await loginWithEmail(email, password);
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const validateIndianPhoneNumber = (phone) => {
    // Remove any non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Check if it's a valid Indian phone number (10 digits, optionally with +91 prefix)
    if (digitsOnly.length === 10) {
      return true;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return true;
    } else if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
      return true;
    }

    return false;
  };

  const formatIndianPhoneNumber = (phone) => {
    // Remove any non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // If it's just 10 digits, add the +91 prefix
    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }

    // If it already has 91 prefix but no +, add it
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return `+${digitsOnly}`;
    }

    // If it has 091 prefix, convert to +91
    if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
      return `+91${digitsOnly.substring(3)}`;
    }

    // Otherwise, just add + if it's missing
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  // Make sure the reCAPTCHA container is always in the DOM
  useEffect(() => {
    // Create the reCAPTCHA container if it doesn't exist
    if (!document.getElementById('recaptcha-container-login')) {
      const recaptchaContainer = document.createElement('div');
      recaptchaContainer.id = 'recaptcha-container-login';
      document.body.appendChild(recaptchaContainer);
    }

    // Cleanup function
    return () => {
      // Don't remove the container on component unmount
      // Just clear the reCAPTCHA if it exists
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.error('Error clearing reCAPTCHA:', error);
        }
      }
    };
  }, []);

  const handleSendVerificationCode = async (e) => {
    e.preventDefault();

    if (!phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    // Validate Indian phone number
    if (!validateIndianPhoneNumber(phoneNumber)) {
      setError('Please enter a valid Indian phone number (10 digits)');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // Format to E.164 format with Indian country code
      const formattedPhoneNumber = formatIndianPhoneNumber(phoneNumber);

      const result = await sendVerificationCode(formattedPhoneNumber, 'recaptcha-container-login');
      setConfirmationResult(result);
      setPhoneStep(1);
    } catch (err) {
      console.error('Phone verification error:', err);

      // Display user-friendly error message
      setError(err.message || 'Failed to send verification code. Please try again.');

      // If it's the "not enabled" error, show additional guidance
      if (err.message && err.message.includes('not enabled')) {
        setError(`${err.message} 
        
Note for developers: You need to enable Phone Authentication in the Firebase Console:
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable "Phone" provider
3. Add your app's domain to the authorized domains`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // For login, we don't need a display name, so we'll use a placeholder
      // The user document should already exist if they've signed up before
      await verifyCodeAndSignUp(confirmationResult, verificationCode, "");
      router.push('/');
    } catch (err) {
      console.error('Code verification error:', err);
      setError('Failed to verify code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      router.push('/');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Clear any existing reCAPTCHA
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (error) {
        console.error('Error clearing reCAPTCHA:', error);
      }
    }

    // Reset state
    setError('');
    setPhoneStep(0);
    setConfirmationResult(null);

    // Reload the page to get fresh Firebase configuration
    window.location.reload();
  };

  return (
    <>
      <Head>
        <title>Login | Valluvar Vaasal</title>
        <meta name="description" content="Sign in to your Valluvar Vaasal account" />
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
                Welcome Back
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    whiteSpace: 'pre-line' // This will preserve line breaks in the error message
                  }}
                  action={
                    error.includes('Invalid app credential') || error.includes('billing') ? (
                      <Button color="inherit" size="small" onClick={handleRefresh}>
                        Refresh
                      </Button>
                    ) : null
                  }
                >
                  {error}
                </Alert>
              )}

              <Tabs
                value={authMethod}
                onChange={handleAuthMethodChange}
                variant="fullWidth"
                sx={{ mb: 3 }}
              >
                <Tab
                  icon={<EmailIcon />}
                  label="Email"
                  value="email"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem'
                  }}
                />
                <Tab
                  icon={<PhoneIcon />}
                  label="Phone"
                  value="phone"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1rem'
                  }}
                />
              </Tabs>

              {authMethod === 'email' ? (
                <form onSubmit={handleEmailLogin} autoComplete="off">
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="new-email"
                    inputProps={{ autoComplete: 'new-email' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    inputProps={{ autoComplete: 'new-password' }}
                  />

                  <Box sx={{ textAlign: 'right', mt: 1, mb: 2 }}>
                    <Link href="/reset-password" passHref sx={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}>
                      Forgot password?
                    </Link>
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: '1.1rem'
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Sign In'}
                  </Button>
                </form>
              ) : (
                <>
                  {/* Hidden div for reCAPTCHA */}
                  <div id="recaptcha-container-login" ref={recaptchaContainerRef}></div>

                  {phoneStep === 0 ? (
                    <form onSubmit={handleSendVerificationCode} autoComplete="off">
                      <TextField
                        label="Phone Number"
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        placeholder="Enter 10-digit mobile number"
                        helperText="Indian mobile number only (e.g., 9876543210)"
                        autoComplete="off"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon color="action" />
                              <Typography variant="body2" sx={{ ml: 0.5 }}>+91</Typography>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="large"
                        disabled={loading}
                        sx={{
                          mt: 3,
                          py: 1.5,
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: '1.1rem'
                        }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Send Verification Code'}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyCode} autoComplete="off">
                      <TextField
                        label="Verification Code"
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        required
                        autoComplete="off"
                      />

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="large"
                        disabled={loading}
                        sx={{
                          mt: 3,
                          py: 1.5,
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: '1.1rem'
                        }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Verify & Sign In'}
                      </Button>

                      <Button
                        fullWidth
                        variant="text"
                        color="secondary"
                        onClick={() => setPhoneStep(0)}
                        sx={{ mt: 1 }}
                      >
                        Back to Phone Number
                      </Button>
                    </form>
                  )}
                </>
              )}

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  OR
                </Typography>
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1.1rem'
                }}
              >
                Sign in with Google
              </Button>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2">
                  Don't have an account?{' '}
                  <Link href="/signup" passHref sx={{
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}>
                    Sign up
                  </Link>
                </Typography>
              </Box>
            </MotionPaper>
          </Container>
        </Box>

      </Box>

      {/* Add a visible reCAPTCHA container */}
      <Box
        id="recaptcha-container-login"
        sx={{
          mt: 2,
          display: authMethod === 'phone' && phoneStep === 0 ? 'block' : 'none',
          '& div': { margin: '0 auto' }
        }}
      />
    </>
  );
} 