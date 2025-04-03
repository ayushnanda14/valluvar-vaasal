import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Grid,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../src/components/navbar';
import Footer from '../../src/components/footer';
import { useAuth } from '../../src/context/AuthContext';
import FileUploadSection from '../../src/components/FileUploadSection';
import PhoneIcon from '@mui/icons-material/Phone';

export default function AstrologerSignup() {
  const theme = useTheme();
  const router = useRouter();
  const { 
    signUpWithEmailAndPassword, 
    sendVerificationCode, 
    verifyCodeAndSignUp,
    currentUser
  } = useAuth();
  
  // State for multi-step form
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Basic Information', 'Verification', 'Services & Pricing', 'Document Upload'];
  
  // State for form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneStep, setPhoneStep] = useState(0);
  const [authMethod, setAuthMethod] = useState('email');
  
  // State for services and pricing
  const [services, setServices] = useState({
    marriageMatching: false,
    jathakPrediction: false,
    jathakWriting: false
  });
  
  const [pricing, setPricing] = useState({
    marriageMatching: 500,
    jathakPrediction: 500,
    jathakWriting: 500
  });
  
  // State for document uploads
  const [aadharFiles, setAadharFiles] = useState([]);
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [experienceFiles, setExperienceFiles] = useState([]);
  
  // State for form submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);
  
  // Validate Indian phone number
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
  
  // Format Indian phone number to E.164 format
  const formatIndianPhoneNumber = (phone) => {
    // Remove any non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If it's already a 10-digit number, add +91 prefix
    if (digitsOnly.length === 10) {
      return `+91${digitsOnly}`;
    }
    
    // If it has 91 prefix but no +, add the +
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return `+${digitsOnly}`;
    }
    
    // If it has 091 prefix, convert to +91
    if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
      return `+${digitsOnly.substring(1)}`;
    }
    
    // Return as is if none of the above
    return phone;
  };
  
  // Handle service selection
  const handleServiceChange = (event) => {
    setServices({
      ...services,
      [event.target.name]: event.target.checked
    });
  };
  
  // Handle pricing changes
  const handlePricingChange = (service, value) => {
    setPricing({
      ...pricing,
      [service]: value
    });
  };
  
  // Handle sending verification code
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
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle verification code submission
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // For phone auth, we'll create the user after verifying the code
      if (authMethod === 'phone') {
        await verifyCodeAndSignUp(confirmationResult, verificationCode, displayName, ['astrologer']);
        // Move to the next step after successful verification
        handleNext();
      }
    } catch (err) {
      console.error('Code verification error:', err);
      setError('Failed to verify code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle email signup
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !displayName) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      await signUpWithEmailAndPassword(email, password, displayName, ['astrologer']);
      // Move to the next step after successful signup
      handleNext();
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to sign up: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form navigation
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Handle final submission
  const handleSubmit = async () => {
    try {
      setError('');
      setLoading(true);
      
      // Validate that at least one service is selected
      if (!services.marriageMatching && !services.jathakPrediction && !services.jathakWriting) {
        setError('Please select at least one service to provide');
        setLoading(false);
        return;
      }
      
      // Validate document uploads
      if (aadharFiles.length === 0) {
        setError('Please upload your Aadhar card');
        setLoading(false);
        return;
      }
      
      // Create service charges object
      const serviceCharges = {};
      if (services.marriageMatching) {
        serviceCharges.marriageMatching = parseInt(pricing.marriageMatching);
      }
      if (services.jathakPrediction) {
        serviceCharges.jathakPrediction = parseInt(pricing.jathakPrediction);
      }
      if (services.jathakWriting) {
        serviceCharges.jathakWriting = parseInt(pricing.jathakWriting);
      }
      
      // Upload documents and update user profile
      // This will be implemented in the next steps
      
      // For now, just redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to complete signup: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  // Handle refresh for reCAPTCHA errors
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
        <meta name="description" content="Join our platform as an astrologer and offer your services to clients worldwide." />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        <Navbar />
        
        <Box 
          sx={{
            py: { xs: 4, md: 6 },
            backgroundColor: theme.palette.background.default,
            flexGrow: 1
          }}
        >
          <Container maxWidth="md">
            <Paper 
              elevation={3}
              sx={{ 
                p: { xs: 3, md: 5 },
                borderRadius: '12px'
              }}
            >
              <Typography 
                variant="h4" 
                component="h1"
                sx={{
                  mb: 4,
                  textAlign: 'center',
                  fontFamily: '"Cormorant Garamond", serif',
                  color: theme.palette.secondary.dark
                }}
              >
                Join as an Astrologer
              </Typography>
              
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              
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
              
              {/* Step 1: Basic Information */}
              {activeStep === 0 && (
                <Box component="form" onSubmit={handleEmailSignup}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Create Your Account
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Full Name"
                    variant="outlined"
                    margin="normal"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    label="Email Address"
                    variant="outlined"
                    margin="normal"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    label="Password"
                    variant="outlined"
                    margin="normal"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                      disabled={loading}
                      sx={{ 
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Next'}
                    </Button>
                  </Box>
                </Box>
              )}
              
              {/* Step 2: Verification */}
              {activeStep === 1 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Phone Verification
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    We need to verify your phone number to complete the signup process.
                  </Typography>
                  
                  {phoneStep === 0 ? (
                    <Box component="form" onSubmit={handleSendVerificationCode}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        variant="outlined"
                        margin="normal"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        placeholder="Enter your 10-digit mobile number"
                        helperText="We'll send a verification code to this number"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon color="action" />
                              <Typography variant="body2" sx={{ ml: 0.5 }}>+91</Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      <Box 
                        id="recaptcha-container-astrologer" 
                        sx={{ 
                          mt: 2, 
                          display: 'block',
                          '& div': { margin: '0 auto' }
                        }}
                      />
                      
                      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="large"
                          onClick={handleBack}
                          sx={{ 
                            py: 1.5,
                            px: 4,
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: '1.1rem'
                          }}
                        >
                          Back
                        </Button>
                        
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          size="large"
                          disabled={loading}
                          sx={{ 
                            py: 1.5,
                            px: 4,
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: '1.1rem'
                          }}
                        >
                          {loading ? <CircularProgress size={24} /> : 'Send Code'}
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box component="form" onSubmit={handleVerifyCode}>
                      <TextField
                        fullWidth
                        label="Verification Code"
                        variant="outlined"
                        margin="normal"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        required
                        placeholder="Enter the 6-digit code"
                        helperText="Enter the verification code sent to your phone"
                      />
                      
                      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                          variant="text"
                          color="primary"
                          onClick={() => setPhoneStep(0)}
                          sx={{ 
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: '1rem'
                          }}
                        >
                          Change Phone Number
                        </Button>
                        
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          size="large"
                          disabled={loading}
                          sx={{ 
                            py: 1.5,
                            px: 4,
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: '1.1rem'
                          }}
                        >
                          {loading ? <CircularProgress size={24} /> : 'Verify & Continue'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Step 3: Services & Pricing */}
              {activeStep === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Services & Pricing
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Select the services you want to offer and set your pricing.
                  </Typography>
                  
                  <FormGroup sx={{ mb: 4 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                          Available Services
                        </Typography>
                        
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={services.marriageMatching}
                              onChange={handleServiceChange}
                              name="marriageMatching"
                            />
                          }
                          label="Marriage Matching"
                        />
                        
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={services.jathakPrediction}
                              onChange={handleServiceChange}
                              name="jathakPrediction"
                            />
                          }
                          label="Jathak Prediction"
                        />
                        
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={services.jathakWriting}
                              onChange={handleServiceChange}
                              name="jathakWriting"
                            />
                          }
                          label="Jathak Writing"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                          Service Pricing (₹)
                        </Typography>
                        
                        <TextField
                          label="Marriage Matching Price"
                          variant="outlined"
                          margin="normal"
                          fullWidth
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          value={pricing.marriageMatching}
                          onChange={(e) => handlePricingChange('marriageMatching', e.target.value)}
                          disabled={!services.marriageMatching}
                        />
                        
                        <TextField
                          label="Jathak Prediction Price"
                          variant="outlined"
                          margin="normal"
                          fullWidth
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          value={pricing.jathakPrediction}
                          onChange={(e) => handlePricingChange('jathakPrediction', e.target.value)}
                          disabled={!services.jathakPrediction}
                        />
                        
                        <TextField
                          label="Jathak Writing Price"
                          variant="outlined"
                          margin="normal"
                          fullWidth
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          value={pricing.jathakWriting}
                          onChange={(e) => handlePricingChange('jathakWriting', e.target.value)}
                          disabled={!services.jathakWriting}
                        />
                      </Grid>
                    </Grid>
                  </FormGroup>
                  
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={handleBack}
                      sx={{ 
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Back
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleNext}
                      disabled={!services.marriageMatching && !services.jathakPrediction && !services.jathakWriting}
                      sx={{ 
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}
              
              {/* Step 4: Document Upload */}
              {activeStep === 3 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Document Verification
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    Please upload the required documents for verification. Your account will be reviewed by our team.
                  </Typography>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Aadhar Card (Required)
                    </Typography>
                    
                    <FileUploadSection 
                      files={aadharFiles}
                      onFilesChange={setAadharFiles}
                      multiple={false}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Astrology Certificates (Optional)
                    </Typography>
                    
                    <FileUploadSection 
                      files={certificateFiles}
                      onFilesChange={setCertificateFiles}
                      multiple={true}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Experience Proof (Optional)
                    </Typography>
                    
                    <FileUploadSection 
                      files={experienceFiles}
                      onFilesChange={setExperienceFiles}
                      multiple={true}
                    />
                  </Box>
                  
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={handleBack}
                      sx={{ 
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Back
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleSubmit}
                      disabled={loading || aadharFiles.length === 0}
                      sx={{ 
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Complete Signup'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Container>
        </Box>
        
        <Footer />
      </Box>
    </>
  );
} 