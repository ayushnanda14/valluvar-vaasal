import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  updateAstrologerServices,
  getAstrologerVerificationStatus,
  updateAstrologerProfileDetails
} from '../services/astrologerService';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useTranslation } from 'react-i18next';
import ProfilePhotoUploader from './ProfilePhotoUploader';

// Define the list of districts (reuse from signup)
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

export default function AstrologerProfileManager() {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { t } = useTranslation();

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

  // State for verification status
  const [verificationStatus, setVerificationStatus] = useState('not_submitted');

  // State for form submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Add state for location
  const [state, setState] = useState('Tamil Nadu'); // Fixed state
  const [district, setDistrict] = useState('');
  const [profileLoading, setProfileLoading] = useState(true); // Separate loading for profile fields

  // Fetch astrologer profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!currentUser) return;

      setInitialLoading(true); // Keep this for overall loading indicator
      setProfileLoading(true);
      try {
        // Fetch verification status (as before)
        const verificationData = await getAstrologerVerificationStatus(currentUser.uid);
        setVerificationStatus(verificationData.verificationStatus || 'not_submitted');

        // Fetch full user document for profile details
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          // Set services from user data
          const userServices = userData.services || [];
          setServices({
            marriageMatching: userServices.includes('marriageMatching'),
            jathakPrediction: userServices.includes('jathakPrediction'),
            jathakWriting: userServices.includes('jathakWriting')
          });

          // Set pricing from user data
          const userPricing = userData.serviceCharges || {};
          setPricing({
            marriageMatching: userPricing.marriageMatching || 500,
            jathakPrediction: userPricing.jathakPrediction || 500,
            jathakWriting: userPricing.jathakWriting || 500
          });
          
          // Set district from user data
          setState(userData.state || 'Tamil Nadu'); // Default to TN if not set
          setDistrict(userData.district || '');

        } else {
          // Handle case where user doc might not exist (shouldn't happen for logged-in astrologer)
          console.warn('User document not found for astrologer.');
          setError('Failed to load complete profile data.');
        }

      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please refresh the page.');
      } finally {
        setInitialLoading(false);
        setProfileLoading(false);
      }
    };

    fetchProfileData();
  }, [currentUser]);

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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) { /* ... error handling ... */ return; }
    if (!services.marriageMatching && !services.jathakPrediction && !services.jathakWriting) { /* ... error handling ... */ return; }
    if (!district) { // Add district validation
        setError('Please select your district.');
        return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Combine updates: Could be two separate calls or one if service adjusted
      // Using two calls for clarity with existing structure
      
      // 1. Update Services & Pricing
      await updateAstrologerServices(currentUser.uid, services, pricing);
      
      // 2. Update Profile Details (State is fixed, only district changes)
      await updateAstrologerProfileDetails(currentUser.uid, { district, state }); 

      setSuccess('Your profile details, services, and pricing have been updated successfully.'); // Updated success message
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render verification status message
  const renderVerificationStatus = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your account is verified. You can now provide astrology services.
          </Alert>
        );
      case 'pending':
        return (
          <Alert severity="info" sx={{ mb: 3 }}>
            Your verification is pending. Our team is reviewing your documents.
          </Alert>
        );
      case 'rejected':
        return (
          <Alert severity="error" sx={{ mb: 3 }}>
            Your verification was rejected. Please contact support for more information.
          </Alert>
        );
      default:
        return (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Your account is not verified. Please submit your verification documents.
          </Alert>
        );
    }
  };

  if (initialLoading || profileLoading) { // Check both loading flags
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          fontFamily: '"Cormorant Garamond", serif',
          color: theme.palette.primary.main,
          mb: 2
        }}
      >
        {t('astrologerProfile.title', 'Astrologer Profile')}
      </Typography>

      {renderVerificationStatus()}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Add Profile Photo Uploader */}
      <Box sx={{ mb: 4 }}>
        <ProfilePhotoUploader 
          onPhotoUpdate={(newPhotoUrl) => {
            setSuccess('Profile photo updated successfully.');
          }} 
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      <form onSubmit={handleSubmit}>
        {/* Section for Location */}
        <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
          Your Location
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
           <Grid item xs={12} sm={6}>
               <TextField
                 fullWidth
                 label="State"
                 value={state}
                 InputProps={{ readOnly: true }}
                 disabled // Visually indicate it's not changeable here
                 sx={{ backgroundColor: '#f0f0f0' }} 
               />
           </Grid>
           <Grid item xs={12} sm={6}>
             <FormControl sx={{ width: '100%' }} required>
               <InputLabel id="district-select-label">District</InputLabel>
               <Select
                 labelId="district-select-label"
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
           </Grid>
        </Grid>
         
        <Divider sx={{ my: 3 }} />

        <FormGroup>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Services You Provide
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={services.marriageMatching}
                    onChange={handleServiceChange}
                    name="marriageMatching"
                    color="primary"
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
                    color="primary"
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
                    color="primary"
                  />
                }
                label="Jathak Writing"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Set Your Pricing
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
            {loading ? <CircularProgress size={24} /> : 'Update Profile & Services'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
} 
