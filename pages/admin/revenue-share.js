import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  useTheme,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Revenue split configuration for matrimony referrals
const MATRIMONY_SPLITS = {
  pothigai: {
    base: 85,
    gst: 15,
    total: 100,
    matrimony: 40,
    astrologer: 40,
    vvip: 5
  },
  ganga: {
    base: 424,
    gst: 76,
    total: 500,
    matrimony: 200,
    astrologer: 200,
    vvip: 24
  },
  himalaya: {
    base: 1695,
    gst: 305,
    total: 2000,
    matrimony: 800,
    astrologer: 800,
    vvip: 95
  }
};

export default function RevenueShare() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, hasRole } = useAuth();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [referralFilter, setReferralFilter] = useState('all'); // 'all', 'matrimony', 'non-referral'
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      if (currentUser) {
        const isAdmin = await hasRole('admin');
        if (!isAdmin) {
          router.push('/dashboard');
        }
      }
    };
    checkAdmin();
  }, [currentUser, hasRole, router]);

  // Generate month options (last 12 months)
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push({ value: monthStr, label: monthLabel });
    }
    return months;
  };

  // Set default month to current month
  useEffect(() => {
    if (!selectedMonth) {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(monthStr);
    }
  }, []);

  // Fetch payments
  useEffect(() => {
    const fetchPayments = async () => {
      if (!selectedMonth) return;

      setLoading(true);
      setError('');

      try {
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

        // Fetch all payments for the selected month
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(
          paymentsRef,
          where('timestamp', '>=', startDate),
          where('timestamp', '<=', endDate),
          orderBy('timestamp', 'desc')
        );

        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = [];

        for (const paymentDoc of paymentsSnapshot.docs) {
          const payment = { id: paymentDoc.id, ...paymentDoc.data() };

          // Skip demo payments
          if (payment.isDemoPayment) continue;

          // Filter by plan if selected
          if (selectedPlan !== 'all' && payment.pricingCategory !== selectedPlan) continue;

          // Filter by referral status - use isMatrimonyReferral field if available, fallback to checking partnerReferralCode
          const isMatrimonyReferral = payment.isMatrimonyReferral === true || 
            (payment.isMatrimonyReferral === undefined && payment.partnerReferralCode && payment.partnerReferralCode.trim() !== '');
          if (referralFilter === 'matrimony' && !isMatrimonyReferral) continue;
          if (referralFilter === 'non-referral' && isMatrimonyReferral) continue;

          // Fetch client and astrologer names
          let clientName = payment.clientName || 'Unknown';
          let astrologerName = payment.astrologerName || 'Unknown';

          try {
            if (payment.clientId) {
              const clientDoc = await getDoc(doc(db, 'users', payment.clientId));
              if (clientDoc.exists()) {
                clientName = clientDoc.data().displayName || clientName;
              }
            }
            if (payment.astrologerId) {
              const astroDoc = await getDoc(doc(db, 'users', payment.astrologerId));
              if (astroDoc.exists()) {
                astrologerName = astroDoc.data().displayName || astrologerName;
              }
            }
          } catch (err) {
            console.error('Error fetching user names:', err);
          }

          // Calculate revenue splits
          const plan = payment.pricingCategory || 'pothigai';
          const isReferral = isMatrimonyReferral;
          
          let baseAmount = payment.baseAmount || 0;
          let gstAmount = payment.gstAmount || 0;
          let totalAmount = payment.amount || 0;

          // If payment doesn't have baseAmount/gstAmount, calculate from total
          if (!payment.baseAmount && totalAmount > 0) {
            // Estimate base and GST (18% GST)
            baseAmount = Math.round(totalAmount / 1.18);
            gstAmount = totalAmount - baseAmount;
          }

          let matrimonyShare = 0;
          let astrologerShare = 0;
          let vvipShare = 0;

          if (payment.isMatrimonyReferral === true && MATRIMONY_SPLITS[plan]) {
            // Matrimony referral - use fixed splits
            const split = MATRIMONY_SPLITS[plan];
            matrimonyShare = split.matrimony;
            astrologerShare = split.astrologer;
            vvipShare = split.vvip;
          } else {
            // Non-referral - astrologer decides share
            // Check if custom payout was recorded
            if (payment.customAstrologerShare !== undefined && payment.customAstrologerShare !== null) {
              astrologerShare = payment.customAstrologerShare;
              vvipShare = baseAmount - astrologerShare;
            } else {
              // Default: show base amount, admin can record payout
              astrologerShare = 0; // Not yet recorded
              vvipShare = baseAmount;
            }
          }

          paymentsData.push({
            ...payment,
            clientName,
            astrologerName,
            isMatrimonyReferral: isReferral,
            baseAmount,
            gstAmount,
            totalAmount,
            matrimonyShare,
            astrologerShare,
            vvipShare,
            timestamp: payment.timestamp?.toDate ? payment.timestamp.toDate() : payment.timestamp
          });
        }

        setPayments(paymentsData);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError('Failed to load payments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [selectedMonth, selectedPlan, referralFilter]);

  const handleOpenPayoutDialog = (payment) => {
    setSelectedPayment(payment);
    setPayoutAmount(payment.customAstrologerShare?.toString() || '');
    setPayoutDialogOpen(true);
  };

  const handleSavePayout = async () => {
    if (!selectedPayment || !payoutAmount) {
      setError('Please enter a payout amount');
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > selectedPayment.baseAmount) {
      setError('Payout amount cannot exceed base amount');
      return;
    }

    setSavingPayout(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'payments', selectedPayment.id), {
        customAstrologerShare: amount,
        payoutRecordedAt: serverTimestamp(),
        payoutRecordedBy: currentUser.uid
      });

      setSuccess('Payout recorded successfully');
      setPayoutDialogOpen(false);
      
      // Refresh payments
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(
        paymentsRef,
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = [];

      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = { id: paymentDoc.id, ...paymentDoc.data() };
        if (payment.isDemoPayment) continue;
        if (selectedPlan !== 'all' && payment.pricingCategory !== selectedPlan) continue;
        
        const isMatrimonyReferral = payment.isMatrimonyReferral === true || 
          (payment.isMatrimonyReferral === undefined && payment.partnerReferralCode && payment.partnerReferralCode.trim() !== '');
        if (referralFilter === 'matrimony' && !isMatrimonyReferral) continue;
        if (referralFilter === 'non-referral' && isMatrimonyReferral) continue;

        let clientName = payment.clientName || 'Unknown';
        let astrologerName = payment.astrologerName || 'Unknown';

        try {
          if (payment.clientId) {
            const clientDoc = await getDoc(doc(db, 'users', payment.clientId));
            if (clientDoc.exists()) {
              clientName = clientDoc.data().displayName || clientName;
            }
          }
          if (payment.astrologerId) {
            const astroDoc = await getDoc(doc(db, 'users', payment.astrologerId));
            if (astroDoc.exists()) {
              astrologerName = astroDoc.data().displayName || astrologerName;
            }
          }
        } catch (err) {
          console.error('Error fetching user names:', err);
        }

        const plan = payment.pricingCategory || 'pothigai';
        const isReferral = isMatrimonyReferral;
        
        let baseAmount = payment.baseAmount || 0;
        let gstAmount = payment.gstAmount || 0;
        let totalAmount = payment.amount || 0;

        if (!payment.baseAmount && totalAmount > 0) {
          baseAmount = Math.round(totalAmount / 1.18);
          gstAmount = totalAmount - baseAmount;
        }

        let matrimonyShare = 0;
        let astrologerShare = 0;
        let vvipShare = 0;

        if (payment.isMatrimonyReferral === true && MATRIMONY_SPLITS[plan]) {
          const split = MATRIMONY_SPLITS[plan];
          matrimonyShare = split.matrimony;
          astrologerShare = split.astrologer;
          vvipShare = split.vvip;
        } else {
          if (payment.customAstrologerShare !== undefined && payment.customAstrologerShare !== null) {
            astrologerShare = payment.customAstrologerShare;
            vvipShare = baseAmount - astrologerShare;
          } else {
            astrologerShare = 0;
            vvipShare = baseAmount;
          }
        }

        paymentsData.push({
          ...payment,
          clientName,
          astrologerName,
          isMatrimonyReferral: isReferral,
          baseAmount,
          gstAmount,
          totalAmount,
          matrimonyShare,
          astrologerShare,
          vvipShare,
          timestamp: payment.timestamp?.toDate ? payment.timestamp.toDate() : payment.timestamp
        });
      }

      setPayments(paymentsData);
    } catch (err) {
      console.error('Error saving payout:', err);
      setError('Failed to save payout. Please try again.');
    } finally {
      setSavingPayout(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Client',
      'Astrologer',
      'Plan',
      'Referral',
      'Base',
      'GST',
      'Total',
      'Matrimony Share',
      'Astrologer Share',
      'Vvip Share',
      'Payment ID',
      'Order ID',
      'Refund Status',
      'Status'
    ];

    const rows = payments.map(payment => [
      payment.timestamp ? payment.timestamp.toLocaleDateString() : '',
      payment.clientName || '',
      payment.astrologerName || '',
      payment.pricingCategory || '',
      payment.isMatrimonyReferral ? 'Yes' : 'No',
      payment.baseAmount || 0,
      payment.gstAmount || 0,
      payment.totalAmount || 0,
      payment.matrimonyShare || 0,
      payment.astrologerShare || 0,
      payment.vvipShare || 0,
      payment.razorpay_payment_id || '',
      payment.razorpay_order_id || '',
      payment.refundStatus || '',
      payment.customAstrologerShare !== undefined ? 'Recorded' : 'Pending'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-share-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentUser) {
    return null;
  }

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Head>
        <title>Revenue Share | Admin</title>
        <meta name="description" content="Revenue share dashboard" />
      </Head>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <Box
          sx={{
            pt: { xs: 4, md: 6 },
            pb: { xs: 2, md: 3 },
            background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
          }}
        >
          <Container maxWidth="lg">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/admin/dashboard')}
              sx={{ mb: 2 }}
            >
              Back to Dashboard
            </Button>
            
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: { xs: '2rem', md: '2.8rem' },
                mb: 2,
                color: theme.palette.secondary.dark
              }}
            >
              Revenue Share Dashboard
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="Month"
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {getMonthOptions().map(month => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Plan</InputLabel>
                  <Select
                    value={selectedPlan}
                    label="Plan"
                    onChange={(e) => setSelectedPlan(e.target.value)}
                  >
                    <MenuItem value="all">All Plans</MenuItem>
                    <MenuItem value="pothigai">Pothigai</MenuItem>
                    <MenuItem value="ganga">Ganga</MenuItem>
                    <MenuItem value="himalaya">Himalaya</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Referral</InputLabel>
                  <Select
                    value={referralFilter}
                    label="Referral"
                    onChange={(e) => setReferralFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="matrimony">Matrimony Referrals</MenuItem>
                    <MenuItem value="non-referral">Non-Referrals</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCSV}
                  fullWidth
                  disabled={payments.length === 0}
                >
                  Export CSV
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={3}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Astrologer</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Referral</TableCell>
                    <TableCell align="right">Base</TableCell>
                    <TableCell align="right">GST</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Matrimony</TableCell>
                    <TableCell align="right">Astrologer</TableCell>
                    <TableCell align="right">Vvip</TableCell>
                    <TableCell>Payment ID</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No payments found for the selected filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.timestamp ? payment.timestamp.toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>{payment.clientName}</TableCell>
                        <TableCell>{payment.astrologerName}</TableCell>
                        <TableCell>
                          <Chip
                            label={payment.pricingCategory || 'N/A'}
                            size="small"
                            color={
                              payment.pricingCategory === 'himalaya' ? 'primary' :
                              payment.pricingCategory === 'ganga' ? 'secondary' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {payment.isMatrimonyReferral ? (
                            <Chip label="Yes" size="small" color="success" />
                          ) : (
                            <Chip label="No" size="small" />
                          )}
                        </TableCell>
                        <TableCell align="right">₹{payment.baseAmount}</TableCell>
                        <TableCell align="right">₹{payment.gstAmount}</TableCell>
                        <TableCell align="right">₹{payment.totalAmount}</TableCell>
                        <TableCell align="right">₹{payment.matrimonyShare}</TableCell>
                        <TableCell align="right">
                          ₹{payment.astrologerShare}
                          {payment.customAstrologerShare !== undefined && (
                            <Chip label="Recorded" size="small" color="success" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell align="right">₹{payment.vvipShare}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {payment.razorpay_payment_id?.substring(0, 12) || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {!payment.isMatrimonyReferral && (
                            <Tooltip title="Record Astrologer Payout">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenPayoutDialog(payment)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>

        {/* Payout Dialog */}
        <Dialog open={payoutDialogOpen} onClose={() => setPayoutDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Record Astrologer Payout</DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Plan: {selectedPayment.pricingCategory || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Base Amount: ₹{selectedPayment.baseAmount}
                </Typography>
                <TextField
                  fullWidth
                  label="Astrologer Payout Amount"
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  margin="normal"
                  helperText={`Maximum: ₹${selectedPayment.baseAmount}`}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSavePayout}
              variant="contained"
              disabled={savingPayout}
            >
              {savingPayout ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
}


