import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  FormHelperText
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import { validateSupportSignupLink, markSignupLinkAsUsed } from '../../src/services/adminService';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BadgeIcon from '@mui/icons-material/Badge';
import UploadIcon from '@mui/icons-material/Upload';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../src/firebase/firebaseConfig';

export default function SupportSignup() {
  const theme = useTheme();
  const router = useRouter();
  const { signupWithEmail } = useAuth();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [linkValid, setLinkValid] = useState(false);
  const [linkData, setLinkData] = useState(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idDocument, setIdDocument] = useState(null);
  const [idDocumentUrl, setIdDocumentUrl] = useState('');

  // Validation states
  const [errors, setErrors] = useState({});

  // Validate signup link on component mount
  useEffect(() => {
    const validateLink = async () => {
      if (!token) {
        setError('No signup token provided');
        setLoading(false);
        return;
      }

      try {
        setValidating(true);
        const link = await validateSupportSignupLink(token);
        setLinkValid(true);
        setLinkData(link);
      } catch (err) {
        setError(err.message);
        setLinkValid(false);
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    if (token) {
      validateLink();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateAadhar = (aadhar) => {
    // Remove all spaces and dashes
    const cleanAadhar = aadhar.replace(/[\s-]/g, '');
    // Check if it's exactly 12 digits
    if (!/^\d{12}$/.test(cleanAadhar)) {
      return false;
    }
    // Check if it doesn't start with 0 or 1
    if (cleanAadhar.startsWith('0') || cleanAadhar.startsWith('1')) {
      return false;
    }
    return true;
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!displayName.trim()) newErrors.displayName = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Please enter a valid email address';
    
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!validatePhone(phoneNumber)) newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
    
    if (!gender) newErrors.gender = 'Gender is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    
    if (!aadharNumber.trim()) newErrors.aadharNumber = 'Aadhar number is required';
    else if (!validateAadhar(aadharNumber)) newErrors.aadharNumber = 'Please enter a valid 12-digit Aadhar number (should not start with 0 or 1)';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters long';
    
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (!idDocument) newErrors.idDocument = 'Please upload your ID document';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, idDocument: 'Please upload a valid file (JPEG, PNG, or PDF)' }));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, idDocument: 'File size must be less than 5MB' }));
        return;
      }
      
      setIdDocument(file);
      setErrors(prev => ({ ...prev, idDocument: '' }));
    }
  };

  const formatAadharNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Format as XXXX XXXX XXXX
    if (digits.length <= 4) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
  };

  const uploadDocument = async (file, userId) => {
    const fileExtension = file.name.split('.').pop();
    const fileName = `support_users/${userId}/id_document.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setError('');
      setLoading(true);

      // Create support user account
      const user = await signupWithEmail(email, password, displayName, ['support']);

      // Upload ID document
      const documentUrl = await uploadDocument(idDocument, user.uid);

      // Update user profile with additional information
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        gender,
        address,
        dateOfBirth,
        aadharNumber,
        phoneNumber,
        idDocumentUrl: documentUrl,
        updatedAt: serverTimestamp()
      });

      // Mark signup link as used
      await markSignupLinkAsUsed(token);

      // Redirect to support dashboard
      router.push('/support/dashboard');
    } catch (err) {
      console.error('Support signup error:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use. Please try a different email or log in.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password is too weak. Please choose a stronger password (at least 6 characters).');
      } else {
        setError('Failed to create account: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!linkValid) {
    return (
      <>
        <Head>
          <title>Invalid Signup Link | Valluvar Vaasal</title>
        </Head>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Container maxWidth="sm">
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
              <Button variant="contained" onClick={() => router.push('/login')}>
                Go to Login
              </Button>
            </Paper>
          </Container>
        </Box>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Support User Signup | Valluvar Vaasal</title>
        <meta name="description" content="Create your support account" />
      </Head>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <Box
          sx={{
            flexGrow: 1,
            py: { xs: 4, md: 8 },
            background: 'linear-gradient(135deg, rgba(255,248,225,0.6) 0%, rgba(255,236,179,0.3) 100%)'
          }}
        >
          <Container maxWidth="lg">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 5 },
                borderRadius: 3,
                boxShadow: '0px 8px 32px rgba(0,0,0,0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(230, 126, 34, 0.1)'
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
                Support User Registration
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                You have been invited to join our support team. Please complete your registration below.
              </Alert>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                {/* Personal Information Section */}
                <Box sx={{ 
                  mb: 4,
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 248, 225, 0.3)',
                  border: '1px solid rgba(230, 126, 34, 0.2)'
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3, 
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      pb: 1
                    }}
                  >
                    Personal Information
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Full Name"
                        variant="outlined"
                        fullWidth
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        error={!!errors.displayName}
                        helperText={errors.displayName}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Email Address"
                        variant="outlined"
                        fullWidth
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        error={!!errors.email}
                        helperText={errors.email}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Phone Number"
                        variant="outlined"
                        fullWidth
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        placeholder="9876543210"
                        error={!!errors.phoneNumber}
                        helperText={errors.phoneNumber}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth error={!!errors.gender} sx={{
                        '& .MuiSelect-select': {
                          minWidth: '200px'
                        }
                      }}>
                        <InputLabel>Gender</InputLabel>
                        <Select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          label="Gender"
                          required
                        >
                          <MenuItem value="male">Male</MenuItem>
                          <MenuItem value="female">Female</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                        {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        label="Address"
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        error={!!errors.address}
                        helperText={errors.address}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <HomeIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Date of Birth"
                        variant="outlined"
                        fullWidth
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        error={!!errors.dateOfBirth}
                        helperText={errors.dateOfBirth}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarTodayIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Aadhar Number"
                        variant="outlined"
                        fullWidth
                        value={aadharNumber}
                        onChange={(e) => setAadharNumber(formatAadharNumber(e.target.value))}
                        required
                        placeholder="1234 5678 9012"
                        error={!!errors.aadharNumber}
                        helperText={errors.aadharNumber}
                        inputProps={{ maxLength: 14 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <BadgeIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Identity Verification Section */}
                <Box sx={{ 
                  mb: 4,
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 248, 225, 0.3)',
                  border: '1px solid rgba(230, 126, 34, 0.2)'
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3, 
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      pb: 1
                    }}
                  >
                    Identity Verification
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControl fullWidth error={!!errors.idDocument}>
                        <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                          Upload ID Document (Aadhar Card, PAN Card, or any Government ID)
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          sx={{ 
                            border: '2px dashed',
                            borderColor: errors.idDocument ? 'error.main' : 'primary.main',
                            color: errors.idDocument ? 'error.main' : 'primary.main',
                            py: 2,
                            px: 3,
                            '&:hover': {
                              borderColor: errors.idDocument ? 'error.dark' : 'primary.dark',
                              color: errors.idDocument ? 'error.dark' : 'primary.dark',
                            }
                          }}
                        >
                          {idDocument ? idDocument.name : 'Choose File'}
                          <input
                            type="file"
                            hidden
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileChange}
                          />
                        </Button>
                        {errors.idDocument && (
                          <FormHelperText error>{errors.idDocument}</FormHelperText>
                        )}
                        {idDocument && (
                          <FormHelperText>
                            Selected: {idDocument.name} ({(idDocument.size / 1024 / 1024).toFixed(2)} MB)
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>

                {/* Account Security Section */}
                <Box sx={{ 
                  mb: 4,
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 248, 225, 0.3)',
                  border: '1px solid rgba(230, 126, 34, 0.2)'
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3, 
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                      pb: 1
                    }}
                  >
                    Account Security
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Password"
                        variant="outlined"
                        fullWidth
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        error={!!errors.password}
                        helperText={errors.password || 'Minimum 6 characters'}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Confirm Password"
                        variant="outlined"
                        fullWidth
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                      />
                    </Grid>
                  </Grid>
                </Box>
                
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    py: 2,
                    fontFamily: '"Cinzel", serif',
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Create Support Account'}
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </>
  );
} 