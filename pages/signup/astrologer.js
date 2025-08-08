import React, { useState, useEffect, useRef } from 'react';
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
  useTheme,
  Snackbar,
  InputLabel,
  Select,
  MenuItem,
  FormControl
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import FileUploadSection from '../../src/components/FileUploadSection';
import PhoneIcon from '@mui/icons-material/Phone';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MuiAlert from '@mui/material/Alert';

// Firebase imports
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage, auth } from '../../src/firebase/firebaseConfig'; // Assuming storage is exported alongside db
import { updateProfile } from "firebase/auth"; // Add this import

const TAMIL_NADU_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 
  'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanyakumari', 'Karur', 
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 
  'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 
  'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi (Tuticorin)', 
  'Tiruchirappalli (Trichy)', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 
  'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 
  'Virudhunagar'
];

export default function AstrologerSignup() {
  const theme = useTheme();
  const router = useRouter();
  const { 
    signupWithEmail,
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
  const [experience, setExperience] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneStep, setPhoneStep] = useState(0);
  const [authMethod, setAuthMethod] = useState('email');
  
  // Store credentials temporarily until final submission
  const [tempCredentials, setTempCredentials] = useState({
    email: '',
    password: '',
    phoneNumber: ''
  });
  
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
  
  // Add state for profile picture
  const [profilePicture, setProfilePicture] = useState([]);
  
  // Add state for state and district
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('');
  
  // Redirect if already logged in AND not in the middle of signup
  // Commented out because we handle auth state differently now
  // useEffect(() => {
  //   if (currentUser && activeStep === 0 && !loading) {
  //     router.push('/dashboard');
  //   }
  // }, [currentUser, router, activeStep, loading]);
  
  // The useEffect that previously cleared window.recaptchaVerifier has been removed.
  // AuthContext.js now handles reCAPTCHA verifier lifecycle.
  
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
      
      // Just verify the code without creating an account
      const userCredential = await confirmationResult.confirm(verificationCode);
      
      // Store the verified phone number temporarily
      setTempCredentials({
        ...tempCredentials,
        phoneNumber: userCredential.user.phoneNumber
      });
      
      // Important: Sign out immediately to prevent being logged in
      await auth.signOut();
      
      // Move to the next step
      handleNext();
    } catch (err) {
      console.error('Code verification error:', err);
      
      if (err.code === 'auth/invalid-verification-code') {
        setError('The verification code is invalid. Please check and try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('The verification code has expired. Please request a new code.');
      } else {
        setError('Failed to verify code: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Handle email signup
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !displayName || !district || !phoneNumber) {
      setError('Please fill in all required fields, including Phone Number and District');
      return;
    }

    // Validate phone number format (basic validation here, full verification next step)
    if (!validateIndianPhoneNumber(phoneNumber)) {
      setError('Please enter a valid Indian phone number (10 digits)');
      return;
    }

    // Validate years of experience (optional but if provided must be 0-60)
    if (experience !== '' && (isNaN(experience) || Number(experience) < 0 || Number(experience) > 60)) {
      setError('Please enter a valid number of years of experience (0-60)');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Store credentials temporarily - DO NOT create account yet
      setTempCredentials({
        ...tempCredentials,
        email,
        password
      });
      
      // Just move to the next step without creating the account
      handleNext();
    } catch (err) {
      console.log('[pages/signup/astrologer.js] Error in handleEmailSignup');
      console.error('[pages/signup/astrologer.js] Error:', err);
      
      let errorMessage = 'Failed to proceed. Please try again.';
      
      console.log(`[pages/signup/astrologer.js] Setting error state to: "${errorMessage}"`);
      setError(errorMessage);
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
    if (aadharFiles.length === 0 || profilePicture.length === 0) {
      setError('Please upload required documents (Aadhar Card and Profile Picture)');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // First, create the account using stored credentials
      let user;
      
      if (tempCredentials.email && tempCredentials.password) {
        // Email-based signup
        await signupWithEmail(tempCredentials.email, tempCredentials.password, displayName, ['astrologer']);
        user = auth.currentUser;
      } else if (tempCredentials.phoneNumber) {
        // Phone-based signup (already verified)
        // Since we already verified the phone, we need to create the user document
        // The user was temporarily created during verification, so we need to get the current user
        setError('Phone-only signup is not fully implemented yet. Please use email signup.');
        return;
      } else {
        setError('No valid credentials found. Please start the signup process again.');
        return;
      }
      
      if (!user) {
        setError('Failed to create account. Please try again.');
        return;
      }
      
      // Upload all files and documents
      const uploadTasks = [];
      let uploadedUrls = {};
      
      // Upload profile picture
      if (profilePicture.length > 0) {
        const profilePicRef = ref(storage, `users/${user.uid}/profile-picture/${profilePicture[0].name}`);
        const profilePicUploadTask = uploadBytes(profilePicRef, profilePicture[0]);
        uploadTasks.push(
          profilePicUploadTask.then(async (snapshot) => {
            const downloadURL = await getDownloadURL(snapshot.ref);
            uploadedUrls.profilePicture = downloadURL;
            
            // Also update user profile with this URL
            return updateProfile(user, {
              photoURL: downloadURL
            });
          })
        );
      }
      
      // Upload Aadhar card
      if (aadharFiles.length > 0) {
        const aadharRef = ref(storage, `users/${user.uid}/documents/aadhar/${aadharFiles[0].name}`);
        const aadharUploadTask = uploadBytes(aadharRef, aadharFiles[0]);
        uploadTasks.push(
          aadharUploadTask.then(async (snapshot) => {
            const downloadURL = await getDownloadURL(snapshot.ref);
            uploadedUrls.aadharCard = downloadURL;
          })
        );
      }
      
      // Upload certificates
      if (certificateFiles.length > 0) {
        uploadedUrls.certificates = [];
        certificateFiles.forEach((file, index) => {
          const certRef = ref(storage, `users/${user.uid}/documents/certificates/${file.name}`);
          const certUploadTask = uploadBytes(certRef, file);
          uploadTasks.push(
            certUploadTask.then(async (snapshot) => {
              const downloadURL = await getDownloadURL(snapshot.ref);
              uploadedUrls.certificates.push(downloadURL);
            })
          );
        });
      }
      
      // Upload experience proof
      if (experienceFiles.length > 0) {
        uploadedUrls.experienceProof = [];
        experienceFiles.forEach((file, index) => {
          const expRef = ref(storage, `users/${user.uid}/documents/experience/${file.name}`);
          const expUploadTask = uploadBytes(expRef, file);
          uploadTasks.push(
            expUploadTask.then(async (snapshot) => {
              const downloadURL = await getDownloadURL(snapshot.ref);
              uploadedUrls.experienceProof.push(downloadURL);
            })
          );
        });
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadTasks);
      
      // Update user document with all uploaded documents, state, and district
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        state: state,
        district: district,
        services: services,
        pricing: pricing,
        experience: experience === '' ? null : Number(experience),
        documents: {
          aadharCard: uploadedUrls.aadharCard || null,
          certificates: uploadedUrls.certificates || [],
          experienceProof: uploadedUrls.experienceProof || [],
          profilePicture: uploadedUrls.profilePicture || null
        },
        verificationStatus: 'pending',
        phoneNumber: tempCredentials.phoneNumber || null,
        updatedAt: serverTimestamp()
      });
      
      // Navigate to astrologer dashboard
      router.push('/astrologer/dashboard');
    } catch (error) {
      console.error('Error submitting documents:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please use a different email or log in.');
      } else {
        setError('Failed to complete signup: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Add state for toast notification
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  
  // Add function to handle toast close
  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
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
                      <Button color="inherit" size="small">
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
                    label="Phone Number"
                    variant="outlined"
                    margin="normal"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    placeholder="Enter your 10-digit mobile number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                          <Typography variant="body2" sx={{ ml: 0.5 }}>+91</Typography>
                        </InputAdornment>
                      ),
                    }}
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
                  
                  <TextField
                    fullWidth
                    label="State"
                    variant="outlined"
                    margin="normal"
                    value={state}
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{ backgroundColor: '#f0f0f0' }}
                  />
                  
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel id="district-select-label">District</InputLabel>
                    <Select
                      labelId="district-select-label"
                      id="district-select"
                      value={district}
                      label="District"
                      onChange={(e) => setDistrict(e.target.value)}
                    >
                      <MenuItem value="" disabled><em>Select District</em></MenuItem>
                      {TAMIL_NADU_DISTRICTS.map((dist) => (
                        <MenuItem key={dist} value={dist}>{dist}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Years of Experience"
                    variant="outlined"
                    margin="normal"
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    inputProps={{ min: 0, max: 60 }}
                    helperText="Optional"
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
                      
                      {/* Add the reCAPTCHA container div here */}
                      <div id="recaptcha-container-astrologer" style={{ display: 'none' }}></div>
                      
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
                      Profile Picture (Required)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Please upload a clear, professional photo of yourself that will be visible to clients.
                    </Typography>
                    
                    <FileUploadSection 
                      files={profilePicture}
                      onFilesChange={setProfilePicture}
                      multiple={false}
                      accept="image/*"
                      icon={<AccountCircleIcon fontSize="large" />}
                    />
                  </Box>
                  
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
                      disabled={loading || aadharFiles.length === 0 || profilePicture.length === 0}
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
      </Box>
      
      {/* Toast notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          elevation={6} 
          variant="filled" 
          onClose={handleCloseToast} 
          severity={toast.severity}
        >
          {toast.message}
        </MuiAlert>
      </Snackbar>
    </>
  );
} 