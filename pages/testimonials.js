import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Rating, 
  Paper,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  useTheme 
} from '@mui/material';
import Head from 'next/head';
import Navbar from '../src/components/navbar';
import Testimonials from '../src/components/testimonials';
import Footer from '../src/components/footer';
import { useAuth } from '../src/context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';

export default function TestimonialsPage() {
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  const [testimonialText, setTestimonialText] = useState('');
  const [service, setService] = useState('');
  const [rating, setRating] = useState(5);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // List of available services
  const services = [
    'Marriage Matching',
    'Jathak Prediction',
    'Jathak Writing',
  ];
  
  const handleSubmitTestimonial = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to submit a testimonial');
      return;
    }
    
    if (!testimonialText.trim()) {
      setError('Please enter your testimonial');
      return;
    }
    
    if (!service) {
      setError('Please select the service you received');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      await addDoc(collection(db, 'testimonials'), {
        userId: currentUser.uid,
        name: isAnonymous ? 'Anonymous' : (currentUser.displayName || 'Anonymous User'),
        text: testimonialText.trim(),
        service: service,
        rating,
        isAnonymous,
        approved: false, // Testimonials need approval before being displayed
        createdAt: serverTimestamp()
      });
      
      setTestimonialText('');
      setService('');
      setRating(5);
      setIsAnonymous(false);
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting testimonial:', err);
      setError('Failed to submit testimonial. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <>
      <Head>
        <title>Testimonials | Valluvar Vaasal</title>
        <meta name="description" content="Read testimonials from clients who have experienced our cosmic guidance and spiritual services. Share your own journey with us." />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        <Navbar />
        
        <Box 
          sx={{
            pt: { xs: 4, md: 6 },
            pb: { xs: 2, md: 3 },
            background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
          }}
        >
          <Container maxWidth="lg">
            <Typography 
              variant="h1" 
              component="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: { xs: '2rem', md: '2.8rem' },
                mb: 2,
                color: theme.palette.secondary.dark,
                textAlign: 'center'
              }}
            >
              Client Testimonials
            </Typography>
            
            <Typography 
              variant="body1"
              sx={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                mb: 4,
                color: theme.palette.secondary.main,
                textAlign: 'center',
                maxWidth: '800px',
                mx: 'auto'
              }}
            >
              The cosmic journey is unique for each soul. Discover how our guidance has 
              illuminated paths for others, and share your own experience.
            </Typography>
          </Container>
        </Box>
        
        {/* Testimonials Component */}
        <Testimonials />
        
        {/* Submit Testimonial Section */}
        <Box 
          sx={{
            py: { xs: 6, md: 8 },
            background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,248,225,0.3) 100%)'
          }}
        >
          <Container maxWidth="md">
            <Typography 
              variant="h2" 
              component="h2"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: { xs: '1.8rem', md: '2.2rem' },
                mb: 3,
                color: theme.palette.secondary.dark,
                textAlign: 'center'
              }}
            >
              Share Your Experience
            </Typography>
            
            <Paper 
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }}
            >
              {!currentUser ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please sign in to share your testimonial.
                </Alert>
              ) : (
                <form onSubmit={handleSubmitTestimonial}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="body1"
                      sx={{
                        fontFamily: '"Cormorant Garamond", serif',
                        fontWeight: 600,
                        mb: 1
                      }}
                    >
                      Your Rating
                    </Typography>
                    <Rating
                      name="testimonial-rating"
                      value={rating}
                      onChange={(event, newValue) => {
                        setRating(newValue);
                      }}
                      size="large"
                      sx={{ color: theme.palette.primary.main }}
                    />
                  </Box>
                  
                  <FormControl 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mb: 3 }}
                    required
                  >
                    <InputLabel 
                      id="service-select-label"
                      sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                    >
                      Which service did you receive?
                    </InputLabel>
                    <Select
                      labelId="service-select-label"
                      id="service-select"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      label="Which service did you receive?"
                      sx={{ 
                        fontFamily: '"Cormorant Garamond", serif',
                        '& .MuiSelect-select': {
                          fontFamily: '"Cormorant Garamond", serif'
                        }
                      }}
                    >
                      {services.map((serviceName) => (
                        <MenuItem 
                          key={serviceName} 
                          value={serviceName}
                          sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                        >
                          {serviceName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <TextField
                    label="Share your experience"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    value={testimonialText}
                    onChange={(e) => setTestimonialText(e.target.value)}
                    sx={{ mb: 3 }}
                    InputProps={{
                      sx: { fontFamily: '"Cormorant Garamond", serif' }
                    }}
                    InputLabelProps={{
                      sx: { fontFamily: '"Cormorant Garamond", serif' }
                    }}
                    required
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        color="secondary"
                      />
                    }
                    label={
                      <Typography 
                        variant="body2"
                        sx={{
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: '1rem'
                        }}
                      >
                        Submit anonymously (your name will not be displayed)
                      </Typography>
                    }
                    sx={{ mb: 3 }}
                  />
                  
                  <Typography 
                    variant="body2"
                    sx={{
                      fontFamily: '"Cormorant Garamond", serif',
                      color: theme.palette.text.secondary,
                      mb: 3,
                      fontSize: '0.9rem'
                    }}
                  >
                    Your testimonial will be reviewed before being published. We appreciate your honest feedback!
                  </Typography>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={submitting}
                    sx={{
                      fontFamily: '"Cinzel", serif',
                      py: 1.5,
                      px: 4,
                      fontSize: '1rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      color: '#FFF8E1',
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Testimonial'}
                  </Button>
                </form>
              )}
            </Paper>
          </Container>
        </Box>
        
        <Footer />
      </Box>
      
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
      >
        <Alert 
          onClose={() => setSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Thank you for sharing your experience! Your testimonial has been submitted for review.
        </Alert>
      </Snackbar>
    </>
  );
} 