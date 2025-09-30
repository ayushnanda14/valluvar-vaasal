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
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  useTheme,
  CircularProgress,
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import ProtectedRoute from '../src/components/ProtectedRoute';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { collection, query, where, getDocs, orderBy, getDoc, doc, limit } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';
import { useTranslation } from 'react-i18next';
import { getRefundHistory } from '../src/services/refundService';

// Helper to generate Razorpay payment link
const getRazorpayPaymentLink = (paymentId) => {
  if (!paymentId) return '#';
  return `https://dashboard.razorpay.com/app/payments/${paymentId}`;
};

export default function Bookings() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, hasRole } = useAuth();
  const { t } = useTranslation('common');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isAstrologer, setIsAstrologer] = useState(false);
  const [openInvoice, setOpenInvoice] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // (removed) phone registry migration snippet
  // Check user roles
  useEffect(() => {
    const checkRoles = async () => {
      if (currentUser) {
        const clientCheck = await hasRole('client');
        const astrologerCheck = await hasRole('astrologer');

        setIsClient(clientCheck && !astrologerCheck);
        setIsAstrologer(astrologerCheck);
      }
    };

    checkRoles();
  }, [currentUser, hasRole]);

  // Fetch bookings (derived from chats/serviceRequests instead of a non-existent 'bookings' collection)
  useEffect(() => {
    const fetchBookings = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);

        const bookingsData = [];

        if (isClient) {
          // For clients: one booking per chat with selected astrologers
          const chatsQuery = query(
            collection(db, 'chats'),
            where('clientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          const chatsSnap = await getDocs(chatsQuery);
          for (const chatDoc of chatsSnap.docs) {
            const chat = { id: chatDoc.id, ...chatDoc.data() };
            const bookingData = {
              id: chat.id,
              chatId: chat.id,
              serviceType: chat.serviceType,
              date: chat.createdAt,
              status: chat.status || 'active',
              astrologerId: chat.astrologerId,
              astrologer: {
                displayName: chat.astrologerName,
                photoURL: chat.participantAvatars?.[chat.astrologerId] || ''
              },
              serviceRequestId: chat.serviceRequestId,
              razorpayPaymentId: chat.razorpay_payment_id,
            };

            // Fetch latest payment for this service request for the client
            if (bookingData.serviceRequestId) {
              try {
                const paymentsQuery = query(
                  collection(db, 'payments'),
                  where('serviceRequestId', '==', bookingData.serviceRequestId),
                  where('clientId', '==', currentUser.uid),
                  orderBy('timestamp', 'desc'),
                  limit(1)
                );
                const paymentSnapshot = await getDocs(paymentsQuery);
                if (!paymentSnapshot.empty) {
                  const payment = paymentSnapshot.docs[0].data();
                  bookingData.razorpayPaymentId = payment.razorpay_payment_id || bookingData.razorpayPaymentId;
                  bookingData.paymentAmount = payment.amount;
                  bookingData.amount = payment.amount; // for invoice usage
                  bookingData.paymentTimestamp = payment.timestamp;
                  bookingData.refundStatus = payment.refundStatus;
                  bookingData.refundAmount = payment.refundAmount;
                  bookingData.refundReason = payment.refundReason;

                  if (payment.razorpay_payment_id) {
                    try {
                      const refundHistory = await getRefundHistory(payment.razorpay_payment_id);
                      bookingData.refundHistory = refundHistory;
                    } catch (refundError) {
                      console.error('Error fetching refund history:', refundError);
                    }
                  }
                }
              } catch (paymentError) {
                console.error('Error fetching payment details for booking (client):', chat.id, paymentError);
              }
            }

            bookingsData.push(bookingData);
          }
        } else if (isAstrologer) {
          // For astrologers: one booking per chat assigned to them
          const chatsQuery = query(
            collection(db, 'chats'),
            where('astrologerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          const chatsSnap = await getDocs(chatsQuery);
          for (const chatDoc of chatsSnap.docs) {
            const chat = { id: chatDoc.id, ...chatDoc.data() };
            const bookingData = {
              id: chat.id,
              chatId: chat.id,
              serviceType: chat.serviceType,
              date: chat.createdAt,
              status: chat.status || 'active',
              clientId: chat.clientId,
              client: {
                displayName: chat.clientName,
                photoURL: chat.participantAvatars?.[chat.clientId] || ''
              },
              serviceRequestId: chat.serviceRequestId,
              razorpayPaymentId: chat.razorpay_payment_id,
            };

            // Fetch latest payment for this service request for the client
            if (bookingData.serviceRequestId) {
              try {
                const paymentsQuery = query(
                  collection(db, 'payments'),
                  where('serviceRequestId', '==', bookingData.serviceRequestId),
                  where('astrologerId', '==', currentUser.uid),
                  orderBy('timestamp', 'desc'),
                  limit(1)
                );
                const paymentSnapshot = await getDocs(paymentsQuery);
                if (!paymentSnapshot.empty) {
                  const payment = paymentSnapshot.docs[0].data();
                  bookingData.razorpayPaymentId = payment.razorpay_payment_id || bookingData.razorpayPaymentId;
                  bookingData.paymentAmount = payment.amount;
                  bookingData.amount = payment.amount; // for invoice usage
                  bookingData.paymentTimestamp = payment.timestamp;
                  bookingData.refundStatus = payment.refundStatus;
                  bookingData.refundAmount = payment.refundAmount;
                  bookingData.refundReason = payment.refundReason;
                  // Note: astrologers don't get refund history link via Razorpay
                }
              } catch (paymentError) {
                console.error('Error fetching payment details for booking (astrologer):', chat.id, paymentError);
              }
            }

            bookingsData.push(bookingData);
          }
        } else {
          return;
        }

        setBookings(bookingsData);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentUser, isClient, isAstrologer]);

  const handleViewInvoice = (booking) => {
    setSelectedBooking(booking);
    setOpenInvoice(true);
  };

  const handleCloseInvoice = () => {
    setOpenInvoice(false);
    setSelectedBooking(null);
  };

  const handleChat = (booking) => {
    router.push(`/messages?chatId=${booking.chatId}`);
  };

  const renderClientBookings = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('bookings.astrologer')}</TableCell>
            <TableCell>{t('bookings.service')}</TableCell>
            <TableCell>{t('bookings.price')}</TableCell>
            <TableCell>{t('bookings.date')}</TableCell>
            <TableCell>{t('bookings.status')}</TableCell>
            <TableCell align="right">{t('bookings.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={booking.astrologer?.photoURL}>
                    {booking.astrologer?.displayName?.[0]}
                  </Avatar>
                  <Typography>{booking.astrologer?.displayName}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {booking.serviceType}
                  {booking.razorpayPaymentId && booking.razorpayPaymentId.startsWith('demo_') && (
                    <Chip
                      label="Demo"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  ₹{booking.paymentAmount || 0}
                  {booking.razorpayPaymentId && booking.razorpayPaymentId.startsWith('demo_') && (
                    <Chip
                      label="Demo"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                {new Date(booking.date.toDate()).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Chip
                  label={booking.status}
                  color={
                    booking.status === 'completed' ? 'success' :
                      booking.status === 'cancelled' ? 'error' :
                        'warning'
                  }
                />
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReceiptIcon />}
                    onClick={() => handleViewInvoice(booking)}
                  >
                    {t('bookings.invoice')}
                  </Button>
                  {booking.razorpayPaymentId && !booking.razorpayPaymentId.startsWith('demo_') && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="info"
                      startIcon={<ReceiptIcon />}
                      href={getRazorpayPaymentLink(booking.razorpayPaymentId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('bookings.viewPayment')}
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ChatIcon />}
                    onClick={() => handleChat(booking)}
                  >
                    {t('bookings.chat')}
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderAstrologerBookings = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('bookings.client')}</TableCell>
            <TableCell>{t('bookings.service')}</TableCell>
            <TableCell>{t('bookings.price')}</TableCell>
            <TableCell>{t('bookings.date')}</TableCell>
            <TableCell>{t('bookings.status')}</TableCell>
            <TableCell align="right">{t('bookings.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar src={booking.client?.photoURL}>
                    {booking.client?.displayName?.[0]}
                  </Avatar>
                  <Typography>{booking.client?.displayName}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {booking.serviceType}
                  {booking.razorpayPaymentId && booking.razorpayPaymentId.startsWith('demo_') && (
                    <Chip
                      label="Demo"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  ₹{booking.paymentAmount || 0}
                  {booking.razorpayPaymentId && booking.razorpayPaymentId.startsWith('demo_') && (
                    <Chip
                      label="Demo"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                {new Date(booking.date.toDate()).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={booking.status}
                    color={
                      booking.status === 'completed' ? 'success' :
                        booking.status === 'cancelled' ? 'error' :
                          'warning'
                    }
                  />
                  {booking.razorpayPaymentId && booking.razorpayPaymentId.startsWith('demo_') && (
                    <Chip
                      label="Demo"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReceiptIcon />}
                    onClick={() => handleViewInvoice(booking)}
                  >
                    {t('bookings.invoice')}
                  </Button>
                  {booking.razorpayPaymentId && !booking.razorpayPaymentId.startsWith('demo_') && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="info"
                      startIcon={<ReceiptIcon />}
                      href={getRazorpayPaymentLink(booking.razorpayPaymentId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('bookings.viewPayment')}
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ChatIcon />}
                    onClick={() => handleChat(booking)}
                  >
                    {t('bookings.chat')}
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <ProtectedRoute>
      <Head>
        <title>{t('brand')} - {t('bookings.title')}</title>
        <meta name="description" content={t('bookings.description')} />
      </Head>

      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : bookings.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                {t('bookings.noBookings')}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {isClient
                  ? t('bookings.clientNoBookings')
                  : t('bookings.astrologerNoBookings')
                }
              </Typography>
              {isClient && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3 }}
                  onClick={() => router.push('/dashboard')}
                >
                  {t('bookings.exploreServices')}
                </Button>
              )}
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: '"Playfair Display", serif'
                  }}
                >
                  {isClient
                    ? t('bookings.clientBookings')
                    : t('bookings.astrologerBookings')
                  }
                </Typography>
                {currentUser?.isDemoUser && (
                  <Chip
                    label="Demo User"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontSize: '0.8rem' }}
                  />
                )}
              </Box>

              {isClient && renderClientBookings()}
              {isAstrologer && renderAstrologerBookings()}
            </Paper>
          )}
        </Container>
      </Box>

      {/* Invoice Dialog */}
      <Dialog
        open={openInvoice}
        onClose={handleCloseInvoice}
        maxWidth="md"
        fullWidth
      >
        {selectedBooking && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon color="primary" />
                <Typography variant="h6">
                  {t('bookings.invoice')} #{selectedBooking.id.slice(0, 8)}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {isClient ? t('bookings.astrologer') : t('bookings.client')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={isClient ? selectedBooking.astrologer?.photoURL : selectedBooking.client?.photoURL}
                      >
                        {isClient
                          ? selectedBooking.astrologer?.displayName?.[0]
                          : selectedBooking.client?.displayName?.[0]
                        }
                      </Avatar>
                      <Typography>
                        {isClient
                          ? selectedBooking.astrologer?.displayName
                          : selectedBooking.client?.displayName
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {t('bookings.bookingDate')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarTodayIcon fontSize="small" color="action" />
                      <Typography>
                        {new Date(selectedBooking.date.toDate()).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {t('bookings.service')}
                    </Typography>
                    <Typography>{selectedBooking.serviceType}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {t('bookings.status')}
                    </Typography>
                    <Chip
                      label={selectedBooking.status}
                      color={
                        selectedBooking.status === 'completed' ? 'success' :
                          selectedBooking.status === 'cancelled' ? 'error' :
                            'warning'
                      }
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      {t('bookings.total')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CurrencyRupeeIcon color="primary" />
                      <Typography variant="h6" color="primary">
                        {selectedBooking.amount}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Refund Information */}
                {selectedBooking.refundStatus && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Refund Information
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2">Refund Amount:</Typography>
                          <Typography variant="body2" color="warning.main" fontWeight="medium">
                            ₹{selectedBooking.refundAmount}
                          </Typography>
                        </Box>
                        {selectedBooking.refundReason && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">Reason:</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedBooking.refundReason}
                            </Typography>
                          </Box>
                        )}
                        {selectedBooking.refundHistory && selectedBooking.refundHistory.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              Refund History:
                            </Typography>
                            {selectedBooking.refundHistory.map((refund, index) => (
                              <Box key={refund.id} sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" fontWeight="medium">
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
                      </Box>
                    </Grid>
                  </>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseInvoice}>
                {t('bookings.close')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ProtectedRoute>
  );
} 