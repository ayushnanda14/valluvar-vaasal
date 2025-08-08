import React, { useState, useRef } from 'react';
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
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import { getOrCreateRecaptcha } from '../src/context/AuthContext';
import { auth } from '../src/firebase/firebaseConfig';
import { signInWithPhoneNumber } from 'firebase/auth';
import GoogleIcon from '@mui/icons-material/Google';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import Head from 'next/head';
import { httpsCallable } from 'firebase/functions';
import { functions as fbFunctions } from '../src/firebase/firebaseConfig';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, verifyCodeAndSignUp } = useAuth();

  const [authMethod, setAuthMethod] = useState('phone'); // Changed default to 'phone'

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

  // Add new ref for reCAPTCHA
  const recaptchaRef = useRef(null);

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

  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true); // Start loading early

    if (!phoneNumber) {
      setError('Please enter your phone number');
      setLoading(false);
      return;
    }

    const formatted = formatIndianPhoneNumber(phoneNumber);
    if (!validateIndianPhoneNumber(phoneNumber)) {
      setError('Enter valid 10-digit Indian number');
      setLoading(false);
      return;
    }

    try {
      // 1️⃣ check with Cloud Function
      const checkPhone = httpsCallable(fbFunctions, 'checkPhone');
      const resultCheck = await checkPhone({ phone: formatted });
      const data = resultCheck.data; // Access the data property

      if (!data.exists) {
        setError('No account found for this number. Please sign up first.');
        setLoading(false);
        return;
      }

      // 2️⃣ send OTP if number exists
      const verifier = getOrCreateRecaptcha('recaptcha-container-login'); // Use the singleton verifier
      const result = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmationResult(result);
      setPhoneStep(1);

    } catch (err) {
      console.error('Error during phone check or OTP send:', err);
      if (err.code === 'functions/internal' || err.code === 'auth/internal-error') {
        setError('An internal server error occurred. Please try again later.');
      } else if (err.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded. Please try again later.');
      } else if (err.code === 'auth/app-not-authorized' || err.code === 'auth/invalid-app-credential') {
        setError('Domain not authorised or invalid app credential. Check Firebase setup.');
      } else if (err.code === 'functions/invalid-argument') {
        setError('Invalid phone number format sent to server.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
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
        minHeight: '100vh',
        position: 'relative'
      }}>
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <MotionPaper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                textAlign: 'center',
                fontFamily: '"Cinzel", serif',
                color: theme.palette.primary.main,
                mb: 4
              }}
            >
              Sign In
            </Typography>

            <Tabs
              value={authMethod}
              onChange={handleAuthMethodChange}
              centered
              sx={{ mb: 3 }}
            >
              <Tab
                value="phone"
                label="Mobile Number"
                icon={<PhoneIcon />}
                iconPosition="start"
                sx={{ fontFamily: '"Cinzel", serif' }}
              />
              <Tab
                value="email"
                label="Email"
                icon={<EmailIcon />}
                iconPosition="start"
                sx={{ fontFamily: '"Cinzel", serif' }}
              />
            </Tabs>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Invisible reCAPTCHA container rendered once */}
            <div id="recaptcha-container-login" />

            {authMethod === 'phone' ? (
              <Box>
                {phoneStep === 0 ? (
                  <form onSubmit={handleSendVerificationCode}>
                    <TextField
                      fullWidth
                      label="Mobile Number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      margin="normal"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      placeholder="Enter 10-digit mobile number"
                      sx={{ mb: 3 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        fontFamily: '"Cinzel", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Send OTP'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode}>
                    <TextField
                      fullWidth
                      label="Verification Code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      margin="normal"
                      placeholder="Enter 6-digit code"
                      sx={{ mb: 3 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        fontFamily: '"Cinzel", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
                    </Button>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={handleRefresh}
                      sx={{ mt: 2 }}
                    >
                      Resend OTP
                    </Button>
                  </form>
                )}
              </Box>
            ) : (
              <form onSubmit={handleEmailLogin}>
                <TextField
                  fullWidth
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  sx={{ mb: 3 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontFamily: '"Cinzel", serif',
                    fontSize: '1.1rem'
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>
              </form>
            )}

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{
                py: 1.5,
                fontFamily: '"Cinzel", serif',
                fontSize: '1.1rem'
              }}
            >
              Continue with Google
            </Button>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2">
                Don&apos;t have an account?{' '}
                <MuiLink href="/signup" color="primary">Sign up</MuiLink>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <MuiLink href="/reset-password" color="primary">Forgot password?</MuiLink>
              </Typography>
            </Box>
          </MotionPaper>
        </Container>
      </Box>
    </>
  );
} 