import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Divider, 
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  CircularProgress,
  Alert
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';

export default function PaymentSummary({ 
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
  
  // Calculate total with GST
  const totalWithGST = total + Math.round(total * 0.18);
  
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
          
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
            {loading ? <CircularProgress size={24} /> : `Pay ₹${totalWithGST}`}
              </Button>
            </Box>
          </Paper>
    </Box>
  );
} 