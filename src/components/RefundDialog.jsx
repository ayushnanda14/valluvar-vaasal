import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  getPaymentForChat, 
  getRefundHistory, 
  processRefund, 
  isRefundEligible,
  getRemainingRefundableAmount 
} from '../services/refundService';

const RefundDialog = ({ open, onClose, chatId, clientId }) => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [refundHistory, setRefundHistory] = useState([]);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundType, setRefundType] = useState('full');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load payment details when dialog opens
  useEffect(() => {
    if (open && chatId) {
      loadPaymentDetails();
    }
  }, [open, chatId]);

  const loadPaymentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const paymentData = await getPaymentForChat(chatId);
      setPayment(paymentData);
      
      if (paymentData?.razorpay_payment_id) {
        const history = await getRefundHistory(paymentData.razorpay_payment_id);
        setRefundHistory(history);
        
        // Set initial refund amount to remaining amount
        const remaining = getRemainingRefundableAmount(paymentData.amount, history);
        setRefundAmount(remaining.toString());
      }
    } catch (error) {
      console.error('Error loading payment details:', error);
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefundTypeChange = (event) => {
    const type = event.target.value;
    setRefundType(type);
    
    if (type === 'full' && payment) {
      const remaining = getRemainingRefundableAmount(payment.amount, refundHistory);
      setRefundAmount(remaining.toString());
    }
  };

  const handleSubmit = async () => {
    if (!payment || !refundAmount || !reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    const remaining = getRemainingRefundableAmount(payment.amount, refundHistory);
    if (amount > remaining) {
      setError(`Refund amount cannot exceed remaining amount (₹${remaining})`);
      return;
    }

    if (!isRefundEligible(payment.timestamp)) {
      setError('Refunds can only be processed within 7 days of payment');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const refundData = {
        paymentId: payment.razorpay_payment_id,
        amount: amount,
        reason: reason.trim(),
        chatId: chatId,
        clientId: clientId,
        refundType: refundType
      };

      const result = await processRefund(refundData);
      
      setSuccess(result.message);
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess('');
        setRefundAmount('');
        setReason('');
        setRefundType('full');
      }, 2000);
      
    } catch (error) {
      console.error('Refund processing error:', error);
      setError(error.message || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError('');
    setSuccess('');
    setRefundAmount('');
    setReason('');
    setRefundType('full');
  };

  const getRefundEligibilityStatus = () => {
    if (!payment) return null;
    
    const eligible = isRefundEligible(payment.timestamp);
    const remaining = getRemainingRefundableAmount(payment.amount, refundHistory);
    
    return { eligible, remaining };
  };

  const eligibilityStatus = getRefundEligibilityStatus();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontFamily: '"Cinzel", serif' }}>
          Process Refund
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {loading && !payment ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !payment ? (
          <Alert severity="warning">
            No payment found for this chat
          </Alert>
        ) : (
          <Box sx={{ mt: 1 }}>
            {/* Payment Details */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Payment Details
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Original Amount:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  ₹{payment.amount}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Payment Date:</Typography>
                <Typography variant="body2">
                  {payment.timestamp?.toDate().toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Payment ID:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {payment.razorpay_payment_id}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Refund History */}
            {refundHistory.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Previous Refunds
                </Typography>
                {refundHistory.map((refund, index) => (
                  <Box key={refund.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium">
                        ₹{refund.refundAmount || refund.amount}
                      </Typography>
                      <Chip 
                        label={refund.status} 
                        size="small" 
                        color={refund.status === 'processed' ? 'success' : 'warning'}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {refund.reason} • {refund.processedAt?.toDate().toLocaleDateString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Eligibility Status */}
            {eligibilityStatus && (
              <Alert 
                severity={eligibilityStatus.eligible ? 'info' : 'warning'} 
                sx={{ mb: 2 }}
              >
                {eligibilityStatus.eligible 
                  ? `Refund eligible. Remaining amount: ₹${eligibilityStatus.remaining}`
                  : 'Refund period expired (7 days limit)'
                }
              </Alert>
            )}

            {/* Refund Form */}
            {eligibilityStatus?.eligible && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Refund Type</InputLabel>
                  <Select
                    value={refundType}
                    onChange={handleRefundTypeChange}
                    label="Refund Type"
                  >
                    <MenuItem value="full">Full Refund</MenuItem>
                    <MenuItem value="partial">Partial Refund</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Refund Amount (₹)"
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  disabled={refundType === 'full'}
                  sx={{ mb: 2 }}
                  helperText={`Maximum: ₹${eligibilityStatus.remaining}`}
                />

                <TextField
                  fullWidth
                  label="Refund Reason"
                  multiline
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for the refund..."
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {/* Error/Success Messages */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {eligibilityStatus?.eligible && (
          <Button 
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading || !refundAmount || !reason.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Process Refund'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RefundDialog; 