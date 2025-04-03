import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Alert,
  Link as MuiLink,
  CircularProgress,
  useTheme,
  Tabs,
  Tab,
  InputAdornment,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../../src/components/navbar';
import Footer from '../../src/components/footer';
import { useAuth } from '../../src/context/AuthContext';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

export default function AstrologerSignup() {
  const theme = useTheme();
  const router = useRouter();
  const { signupWithEmail, sendVerificationCode, verifyCodeAndSignUp } = useAuth();
  
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'
  
  // Email signup state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Phone signup state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneStep, setPhoneStep] = useState(0); // 0: enter phone, 1: enter code
  
  // Common state
  const [displayName, setDisplayName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Ref for reCAPTCHA container
  const recaptchaContainerRef = useRef(null);
  
  // Make sure the reCAPTCHA container is always in the DOM
  useEffect(() => {
    // Create the reCAPTCHA container if it doesn't exist
    if (!document.getElementById('recaptcha-container-astrologer')) {
      const recaptchaContainer = document.createElement('div');
      recaptchaContainer.id = 'recaptcha-container-astrologer';
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
  
  const handleAuthMethodChange = (event, newValue) => {
    setAuthMethod(newValue);
    setError('');
  };
  
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password || !confirmPassword || !displayName || !specialization || !experience) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Create user with astrologer role
      const user = await signupWithEmail(email, password, displayName, ['astrologer', 'client']);
      
      // Add astrologer-specific information
      await updateAstrologerProfile(user.uid, {
        specialization,
        experience,
        available: true,
        rating: 0,
        reviewCount: 0
      });
      
      router.push('/astrologer/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to create an account: ' + err.message);
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
      
      const result = await sendVerificationCode(formattedPhoneNumber, 'recaptcha-container-astrologer');
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
    
    if (!verificationCode || !displayName || !specialization || !experience) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Create user with astrologer role
      const user = await verifyCodeAndSignUp(confirmationResult, verificationCode, displayName, ['astrologer', 'client']);
      
      // Add astrologer-specific information
      await updateAstrologerProfile(user.uid, {
        specialization,
        experience,
        available: true,
        rating: 0,
        reviewCount: 0
      });
      
      router.push('/astrologer/dashboard');
    } catch (err) {
      console.error('Code verification error:', err);
      setError('Failed to verify code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to update astrologer profile
  const updateAstrologerProfile = async (uid, profileData) => {
    const { db } = await import('../../src/firebase/firebaseConfig');
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    await updateDoc(doc(db, 'users', uid), {
      astrologerProfile: profileData,
      updatedAt: serverTimestamp()
    });
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
        <title>Astrologer Signup | Valluvar Vaasal</title>
        <meta name="description" content="Join our team of astrologers at Valluvar Vaasal" />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        <Navbar />
        
        <Box 
          sx={{
            flexGrow: 1,
            py: { xs: 4, md: 8 },
            background: 'linear-gradient(135deg, rgba(255,248,225,0.6) 0%, rgba(255,236,179,0.3) 100%)'
          }}
        >
          <Container maxWidth="sm">
            <Paper 
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }}
            >
              <Typography 
                variant="h4" 
                component="h1"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  mb: 3,
                  color: theme.palette.secondary.dark,
                  textAlign: 'center'
                }}
              >
                Astrologer Signup
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
                <form onSubmit={handleEmailSignup} autoComplete="off">
                  {/* Hidden fields to prevent autofill */}
                  <input type="text" style={{ display: 'none' }} />
                  <input type="password" style={{ display: 'none' }} />
                  
                  <TextField
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    autoComplete="new-name"
                    inputProps={{ autoComplete: 'new-name' }}
                  />
                  
                  <TextField
                    label="Email Address"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="new-email"
                    inputProps={{ autoComplete: 'new-email' }}
                  />
                  
                  <TextField
                    label="Password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    inputProps={{ autoComplete: 'new-password' }}
                  />
                  
                  <TextField
                    label="Confirm Password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    inputProps={{ autoComplete: 'new-password' }}
                  />
                  
                  <TextField
                    label="Specialization"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    placeholder="e.g., Vedic Astrology, Numerology, Tarot"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                    autoComplete="off"
                  />
                  
                  <TextField
                    label="Years of Experience"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
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
                      mb: 2,
                      py: 1.5,
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: '1.1rem'
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Join as Astrologer'}
                  </Button>
                </form>
              ) : (
                <>
                  {/* Hidden div for reCAPTCHA */}
                  <div id="recaptcha-container-astrologer" ref={recaptchaContainerRef}></div>
                  
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
                          mb: 2,
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
                        label="Full Name"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        autoComplete="new-name"
                        inputProps={{ autoComplete: 'new-name' }}
                      />
                      
                      <TextField
                        label="Verification Code"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        required
                        autoComplete="off"
                      />
                      
                      <TextField
                        label="Specialization"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        placeholder="e.g., Vedic Astrology, Numerology, Tarot"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        required
                        autoComplete="off"
                      />
                      
                      <TextField
                        label="Years of Experience"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        type="number"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
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
                          mb: 2,
                          py: 1.5,
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: '1.1rem'
                        }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Verify & Join as Astrologer'}
                      </Button>
                      
                      <Button
                        fullWidth
                        variant="text"
                        color="secondary"
                        onClick={() => setPhoneStep(0)}
                        sx={{ mb: 2 }}
                      >
                        Back to Phone Number
                      </Button>
                    </form>
                  )}
                </>
              )}
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link href="/login" passHref>
                  <MuiLink 
                    variant="body2"
                    sx={{ 
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Already have an account? Sign in
                  </MuiLink>
                </Link>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link href="/signup" passHref>
                  <MuiLink 
                    variant="body2"
                    sx={{ 
                      color: theme.palette.secondary.main,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    ← Back to regular signup
                  </MuiLink>
                </Link>
              </Box>
            </Paper>
          </Container>
        </Box>
        
        <Footer />
      </Box>
      
      {/* Add a visible reCAPTCHA container */}
      <Box 
        id="recaptcha-container-astrologer" 
        sx={{ 
          mt: 2, 
          display: authMethod === 'phone' && phoneStep === 0 ? 'block' : 'none',
          '& div': { margin: '0 auto' }
        }}
      />
    </>
  );
} 