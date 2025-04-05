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
  useTheme
} from '@mui/material';
import {
  updateAstrologerServices,
  getAstrologerVerificationStatus
} from '../services/astrologerService';
import { useAuth } from '../context/AuthContext';

export default function AstrologerProfileManager() {
  const theme = useTheme();
  const { currentUser } = useAuth();

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

  // Fetch astrologer profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!currentUser) return;

      try {
        setInitialLoading(true);

        const verificationData = await getAstrologerVerificationStatus(currentUser.uid);

        console.log('verificationData', verificationData, verificationData.verificationStatus);
        // Set verification status
        setVerificationStatus(verificationData.verificationStatus);

        // Set services
        const servicesData = {
          marriageMatching: verificationData.services.includes('marriageMatching'),
          jathakPrediction: verificationData.services.includes('jathakPrediction'),
          jathakWriting: verificationData.services.includes('jathakWriting')
        };
        setServices(servicesData);

        // Set pricing
        const pricingData = {
          marriageMatching: verificationData.serviceCharges.marriageMatching || 500,
          jathakPrediction: verificationData.serviceCharges.jathakPrediction || 500,
          jathakWriting: verificationData.serviceCharges.jathakWriting || 500
        };
        setPricing(pricingData);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data. Please refresh the page.');
      } finally {
        setInitialLoading(false);
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

    if (!currentUser) {
      setError('You must be logged in to update your profile');
      return;
    }

    // Validate that at least one service is selected
    if (!services.marriageMatching && !services.jathakPrediction && !services.jathakWriting) {
      setError('Please select at least one service that you provide');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await updateAstrologerServices(currentUser.uid, services, pricing);

      setSuccess('Your services and pricing have been uploaded successfully, please wait for verification.');
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

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
      <Typography
        variant="h5"
        component="h2"
        sx={{
          mb: 3,
          fontFamily: '"Cormorant Garamond", serif',
          color: theme.palette.secondary.dark
        }}
      >
        Manage Your Services
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

      <form onSubmit={handleSubmit}>
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
            {loading ? <CircularProgress size={24} /> : 'Update Services'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
} 
