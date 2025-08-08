import React, { useState } from 'react';
import { Button, CircularProgress, Alert, Box, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { functions as fbFunctions } from '../firebase/firebaseConfig';

const PaymentButton = ({ amount, description, onSuccess, onError, onProcessingStateChange }) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const handlePayment = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');
    setPaymentInitiated(true);

    console.log('Current user for prefill:', currentUser);
    console.log('Phone number for prefill:', currentUser?.phoneNumber);

    try {
      const createOrderFunc = httpsCallable(fbFunctions, 'createRazorpayOrder');
      const orderResult = await createOrderFunc({
        amount: amount * 100,
        currency: 'INR'
      });

      const { orderId, amount: orderAmount, currency: orderCurrency } = orderResult.data;

      if (!orderId) {
        throw new Error('Failed to create payment order ID on server.');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency: orderCurrency,
        name: 'Valluvar Vaasal',
        description: description,
        order_id: orderId,
        handler: async (response) => {
          try {
            setPaymentProcessing(false);
            onProcessingStateChange?.(false);
            if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
              // Payment failed - re-enable button
              setPaymentInitiated(false);
              onError?.('Missing Razorpay payment details.');
            } else {
              // Payment successful - keep button disabled, user will be redirected
              onSuccess?.(response);
              // need to verify the payment on the server
            }

          } catch (funcError) {
            console.error('Payment verification function error:', funcError);
            const errorMessage = funcError.message || 'Payment verification failed on server.';
            setError(errorMessage);
            setPaymentInitiated(false); // Re-enable button on error
            onError?.(errorMessage);
          } finally {
            setPaymentProcessing(false);
            onProcessingStateChange?.(false);
          }
        },
        prefill: {
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          contact: currentUser.phoneNumber || '',
        },
        theme: {
          color: '#1976d2',
        },
      };

      if (typeof window !== 'undefined' && window.Razorpay) {
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response) {
          setPaymentProcessing(false);
          onProcessingStateChange?.(false);
          setPaymentInitiated(false); // Re-enable button on payment failure
          console.error('Razorpay Payment Failed:', response.error);
          setError(`Payment Failed: ${response.error.description || response.error.reason}`);
          onError?.(`Payment Failed: ${response.error.reason}`);
        });
        setPaymentProcessing(true);
        onProcessingStateChange?.(true);
        razorpay.open();
      } else {
        console.error('Razorpay SDK not loaded');
        setError('Payment gateway is not available. Please refresh.');
        onError?.('Razorpay SDK not loaded');
      }

    } catch (error) {
      console.error('Payment initiation error:', error);
      setError(error.message || t('payment.error'));
      setPaymentInitiated(false); // Re-enable button on error
      onError?.(error.message);
    } finally {
      setLoading(false);
      setPaymentProcessing(false);
      onProcessingStateChange?.(false);
    }
  };

  if (paymentProcessing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 2 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          {t('payment.processing', 'Processing payment... Please wait.')}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        color="primary"
        onClick={handlePayment}
        disabled={loading || paymentInitiated}
        sx={{
          py: { xs: 1.5, md: 2 },
          px: { xs: 2, md: 4 },
          fontFamily: '"Cinzel", serif',
          fontSize: { xs: '1rem', md: '1.1rem' },
          minWidth: { xs: 'auto', md: '200px' },
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {loading ? <CircularProgress size={24} /> : paymentInitiated ? t('payment.processing', 'Processing...') : t('payment.payNow')}
      </Button>
    </>
  );
};

export default PaymentButton; 