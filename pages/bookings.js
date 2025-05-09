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

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        let bookingsQuery;
        
        if (isClient) {
          bookingsQuery = query(
            collection(db, 'bookings'),
            where('clientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else if (isAstrologer) {
          bookingsQuery = query(
            collection(db, 'bookings'),
            where('astrologerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          return;
        }
        
        const querySnapshot = await getDocs(bookingsQuery);
        const bookingsData = [];
        
        for (const bookingDoc of querySnapshot.docs) {
          const bookingData = bookingDoc.data();
          bookingData.id = bookingDoc.id;
          
          // Fetch related user details (astrologer for client, client for astrologer)
          if (isClient && bookingData.astrologerId) {
            const astrologerDoc = await getDoc(doc(db, 'users', bookingData.astrologerId));
            if (astrologerDoc.exists()) {
              bookingData.astrologer = astrologerDoc.data();
            }
          } else if (isAstrologer && bookingData.clientId) {
            const clientDoc = await getDoc(doc(db, 'users', bookingData.clientId));
            if (clientDoc.exists()) {
              bookingData.client = clientDoc.data();
            }
          }

          // If client is viewing, try to fetch Razorpay payment ID
          if (isClient && bookingData.serviceRequestId) {
            try {
              const paymentsQuery = query(
                collection(db, 'payments'),
                where('serviceRequestId', '==', bookingData.serviceRequestId),
                where('clientId', '==', currentUser.uid),
                orderBy('timestamp', 'desc'), // Get the latest payment if multiple (should ideally be one)
                limit(1)
              );
              const paymentSnapshot = await getDocs(paymentsQuery);
              if (!paymentSnapshot.empty) {
                const paymentData = paymentSnapshot.docs[0].data();
                bookingData.razorpayPaymentId = paymentData.razorpay_payment_id; 
              }
            } catch (paymentError) {
              console.error('Error fetching payment details for booking:', bookingData.id, paymentError);
            }
          }
          
          bookingsData.push(bookingData);
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
              <TableCell>{booking.serviceType}</TableCell>
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
                  {booking.razorpayPaymentId && (
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
              <TableCell>{booking.serviceType}</TableCell>
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
                  {booking.razorpayPaymentId && (
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
              <Typography 
                variant="h5" 
                sx={{ 
                  fontFamily: '"Playfair Display", serif', 
                  mb: 3 
                }}
              >
                {isClient 
                  ? t('bookings.clientBookings')
                  : t('bookings.astrologerBookings')
                }
              </Typography>
              
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