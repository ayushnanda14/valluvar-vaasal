import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';

export default function PaymentSummary({ 
  selectedAstrologers, 
  serviceType, 
  total, 
  onPaymentComplete 
}) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handlePaymentMethodChange = (event) => {
    setPaymentMethod(event.target.value);
  };
  
  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');
      
      // In a real implementation, this would integrate with a payment gateway
      // For now, we'll just simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onPaymentComplete();
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Order Summary
          </Typography>
          
          <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
            <List disablePadding>
              {selectedAstrologers.map(astrologer => (
                <ListItem key={astrologer.id} disablePadding sx={{ py: 1 }}>
                  <ListItemAvatar>
                    <Avatar 
                      src={astrologer.photoURL || '/images/default-avatar.png'}
                      alt={astrologer.displayName}
                    />
                  </ListItemAvatar>
                  <ListItemText 
                    primary={astrologer.displayName}
                    secondary={`${serviceType} Service`}
                  />
                  <Typography variant="body2">
                    ₹{astrologer.serviceCharges?.[serviceType] || 500}
                  </Typography>
                </ListItem>
              ))}
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Subtotal:</Typography>
              <Typography variant="body1">₹{total}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">GST (18%):</Typography>
              <Typography variant="body1">₹{Math.round(total * 0.18)}</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                ₹{total + Math.round(total * 0.18)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Payment Method
          </Typography>
          
          <Paper elevation={1} sx={{ p: 2 }}>
            <FormControl component="fieldset" sx={{ width: '100%' }}>
              <RadioGroup
                aria-label="payment-method"
                name="payment-method"
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
              >
                <FormControlLabel 
                  value="card" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CreditCardIcon sx={{ mr: 1 }} />
                      <Typography>Credit/Debit Card</Typography>
                    </Box>
                  } 
                />
                
                <Divider sx={{ my: 1 }} />
                
                <FormControlLabel 
                  value="upi" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneAndroidIcon sx={{ mr: 1 }} />
                      <Typography>UPI Payment</Typography>
                    </Box>
                  } 
                />
                
                <Divider sx={{ my: 1 }} />
                
                <FormControlLabel 
                  value="netbanking" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccountBalanceIcon sx={{ mr: 1 }} />
                      <Typography>Net Banking</Typography>
                    </Box>
                  } 
                />
              </RadioGroup>
            </FormControl>
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                onClick={handlePayment}
                disabled={loading}
                sx={{ 
                  py: 1.5,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '1.1rem'
                }}
              >
                {loading ? <CircularProgress size={24} /> : `Pay ₹${total + Math.round(total * 0.18)}`}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 