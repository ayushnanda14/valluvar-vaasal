import React, { useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { createOrder } from '../services/paymentService';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getFunctions, httpsCallable } from 'firebase/functions';

const PaymentButton = ({ amount, description, onSuccess, onError }) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const order = await createOrder(amount);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Valluvar Vaasal',
        description: description,
        order_id: order.id,
        handler: async (response) => {
          try {
            const functions = getFunctions();
            const verifyPaymentFunc = httpsCallable(functions, 'verifyRazorpayPayment');
            
            const verificationResult = await verifyPaymentFunc({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verificationResult.data.success) {
              onSuccess?.(response);
            } else {
              console.error('Payment verification failed:', verificationResult.data.message);
              onError?.(verificationResult.data.message || 'Payment verification failed');
            }
          } catch (funcError) {
            console.error('Payment verification function error:', funcError);
            const errorMessage = funcError.message || 'Payment verification failed on server.';
            setError(errorMessage);
            onError?.(errorMessage);
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
          razorpay.open();
      } else {
          console.error('Razorpay SDK not loaded');
          setError('Payment gateway is not available. Please refresh.');
          onError?.('Razorpay SDK not loaded');
      }

    } catch (error) {
      console.error('Payment initiation error:', error);
      setError(t('payment.error'));
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

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
        disabled={loading}
        sx={{
          py: 1.5,
          px: 4,
          fontFamily: '"Cinzel", serif',
          fontSize: '1.1rem',
          minWidth: '200px',
        }}
      >
        {loading ? <CircularProgress size={24} /> : t('payment.payNow')}
      </Button>
    </>
  );
};

export default PaymentButton; 