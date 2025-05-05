import React, { useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { createOrder } from '../services/paymentService';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

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

      // Create order
      const order = await createOrder(amount);

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Valluvar Vaasal',
        description: description,
        order_id: order.id,
        handler: async (response) => {
          try {
            // Verify payment on your server
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const data = await verifyResponse.json();

            if (data.success) {
              onSuccess?.(response);
            } else {
              onError?.('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            onError?.('Payment verification failed');
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

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
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