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
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../src/firebase/firebaseConfig';

export default function Bookings() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, hasRole } = useAuth();
  
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

  // Fetch bookings based on user role
  useEffect(() => {
    const fetchBookings = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        let bookingsQuery;
        
        if (isAstrologer) {
          // Fetch bookings where current user is the astrologer
          bookingsQuery = query(
            collection(db, 'bookings'),
            where('astrologerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          // Fetch bookings where current user is the client
          bookingsQuery = query(
            collection(db, 'bookings'),
            where('clientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        }
        
        const querySnapshot = await getDocs(bookingsQuery);
        const bookingsList = [];
        
        // Process bookings
        for (const bookingDoc of querySnapshot.docs) {
          const bookingData = bookingDoc.data();
          let astrologerData = {};
          let clientData = {};
          
          // Get astrologer details
          if (bookingData.astrologerId) {
            const astrologerDoc = await getDoc(doc(db, 'users', bookingData.astrologerId));
            if (astrologerDoc.exists()) {
              astrologerData = astrologerDoc.data();
            }
          }
          
          // Get client details
          if (bookingData.clientId) {
            const clientDoc = await getDoc(doc(db, 'users', bookingData.clientId));
            if (clientDoc.exists()) {
              clientData = clientDoc.data();
            }
          }
          
          bookingsList.push({
            id: bookingDoc.id,
            ...bookingData,
            astrologer: {
              id: bookingData.astrologerId,
              name: astrologerData.displayName || 'Unknown Astrologer',
              photoURL: astrologerData.photoURL || null
            },
            client: {
              id: bookingData.clientId,
              name: clientData.displayName || 'Unknown Client',
              photoURL: clientData.photoURL || null
            }
          });
        }
        
        setBookings(bookingsList);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isClient || isAstrologer) {
      fetchBookings();
    }
  }, [currentUser, isClient, isAstrologer]);

  const handleViewInvoice = (booking) => {
    setSelectedBooking(booking);
    setOpenInvoice(true);
  };

  const handleCloseInvoice = () => {
    setOpenInvoice(false);
    setSelectedBooking(null);
  };

  const handleGoToChat = (chatId) => {
    router.push(`/chat/${chatId}`);
  };

  // Format date with time
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  // Format date only
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Render the client's bookings view
  const renderClientBookings = () => {
    return (
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Astrologer</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Booking Date
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CurrencyRupeeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Amount
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      src={booking.astrologer.photoURL} 
                      sx={{ mr: 1, width: 32, height: 32 }}
                    >
                      {!booking.astrologer.photoURL && <PersonIcon />}
                    </Avatar>
                    {booking.astrologer.name}
                  </Box>
                </TableCell>
                <TableCell>{booking.service || 'Consultation'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarTodayIcon color="action" fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                    {formatDateTime(booking.createdAt)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CurrencyRupeeIcon color="action" fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                    {formatCurrency(booking.amount).replace('₹', '')}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={booking.status || 'Completed'}
                    color={
                      booking.status === 'completed' ? 'success' :
                      booking.status === 'cancelled' ? 'error' :
                      booking.status === 'refunded' ? 'warning' :
                      'primary'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ReceiptIcon />}
                      onClick={() => handleViewInvoice(booking)}
                    >
                      Receipt
                    </Button>
                    {booking.chatId && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ChatIcon />}
                        onClick={() => handleGoToChat(booking.chatId)}
                      >
                        Chat
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render the astrologer's bookings view
  const renderAstrologerBookings = () => {
    return (
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Booking Date
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CurrencyRupeeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Amount
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      src={booking.client.photoURL} 
                      sx={{ mr: 1, width: 32, height: 32 }}
                    >
                      {!booking.client.photoURL && <PersonIcon />}
                    </Avatar>
                    {booking.client.name}
                  </Box>
                </TableCell>
                <TableCell>{booking.service || 'Consultation'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarTodayIcon color="action" fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                    {formatDateTime(booking.createdAt)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CurrencyRupeeIcon color="action" fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                    {formatCurrency(booking.astrologerAmount || booking.amount * 0.8).replace('₹', '')}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={booking.status || 'Completed'}
                    color={
                      booking.status === 'completed' ? 'success' :
                      booking.status === 'cancelled' ? 'error' :
                      booking.status === 'refunded' ? 'warning' :
                      'primary'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {booking.chatId && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ChatIcon />}
                      onClick={() => handleGoToChat(booking.chatId)}
                    >
                      Chat
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>My Bookings | Valluvar Vaasal</title>
        <meta name="description" content="View your astrology consultation bookings" />
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
              My Bookings
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : bookings.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No bookings found
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {isClient 
                  ? "You haven't made any bookings yet. Explore our services to get started!"
                  : "You don't have any client bookings yet. They will appear here once clients book your services."
                }
              </Typography>
              {isClient && (
                <Button 
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3 }}
                  onClick={() => router.push('/dashboard')}
                >
                  Explore Services
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
                  ? 'Your Astrology Consultations' 
                  : 'Your Client Bookings'
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
        <DialogTitle sx={{ 
          fontFamily: '"Playfair Display", serif',
          bgcolor: theme.palette.background.default,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          Receipt Details
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          {selectedBooking && (
            <Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                mb: 3
              }}>
                <Typography variant="h6" fontWeight="bold">
                  Valluvar Vaasal
                </Typography>
                <Box textAlign="right">
                  <Typography variant="body1" fontWeight="bold">
                    Receipt #{selectedBooking.id.substring(0, 8).toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Date: {formatDate(selectedBooking.createdAt)}
                    </Box>
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Client
                  </Typography>
                  <Typography variant="body1">
                    {selectedBooking.client.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ID: {selectedBooking.clientId.substring(0, 8)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Astrologer
                  </Typography>
                  <Typography variant="body1">
                    {selectedBooking.astrologer.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ID: {selectedBooking.astrologerId.substring(0, 8)}
                  </Typography>
                </Grid>
              </Grid>
              
              <TableContainer component={Paper} elevation={0} sx={{ mb: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <CurrencyRupeeIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Amount
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{selectedBooking.service || 'Astrological Consultation'}</TableCell>
                      <TableCell align="right">{formatCurrency(selectedBooking.amount)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Platform Fee</TableCell>
                      <TableCell align="right">{formatCurrency(selectedBooking.platformFee || selectedBooking.amount * 0.2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(selectedBooking.amount)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ bgcolor: theme.palette.background.default, p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Payment Information
                </Typography>
                <Typography variant="body2">
                  Payment Method: {selectedBooking.paymentMethod || 'Online Payment'}
                </Typography>
                <Typography variant="body2">
                  Transaction ID: {selectedBooking.transactionId || '-'}
                </Typography>
                <Typography variant="body2">
                  Status: {selectedBooking.paymentStatus || 'Paid'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInvoice}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<ReceiptIcon />}
            onClick={() => window.print()}
          >
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
} 