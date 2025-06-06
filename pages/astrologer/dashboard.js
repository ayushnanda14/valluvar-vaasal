import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Divider,
  useTheme,
  CircularProgress
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import AstrologerProfileManager from '../../src/components/AstrologerProfileManager';
import DocumentVerification from '../../src/components/DocumentVerification';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import NotificationBadge from '../../src/components/NotificationBadge';
import ChatBox from '../../src/components/ChatBox';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatIcon from '@mui/icons-material/Chat';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';
import { getUserChats } from '../../src/services/chatService';
import { SERVICE_TYPES } from '@/utils/constants';

export default function AstrologerDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, hasRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [chats, setChats] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);

  // New state for notifications and verification status
  const [newReadingsCount, setNewReadingsCount] = useState(0);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [verificationMessage, setVerificationMessage] = useState('');

  // Get tab from query params
  useEffect(() => {
    if (router.query.tab !== undefined) {
      setTabValue(parseInt(router.query.tab));
    }
  }, [router.query.tab]);

  // Fetch astrologer profile and verification status
  useEffect(() => {
    const fetchProfileStatus = async () => {
      if (!currentUser) return;

      try {
        // Check if profile is complete
        const profileRef = doc(db, 'users', currentUser.uid);
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
          const profileData = profileDoc.data();

          // Check if profile has all required fields
          const hasServices = profileData.services && profileData.services.length > 0;
          const hasPricing = profileData.services && Object.keys(profileData.serviceCharges).length > 0;

          setIsProfileComplete(hasServices && hasPricing);
          setIsVerified(profileData.verified === true);
          setVerificationStatus(profileData.verificationStatus || 'pending');
          setVerificationMessage(profileData.verificationMessage || '');
        } else {
          setIsProfileComplete(false);
          setIsVerified(false);
          setVerificationStatus('pending');
        }
      } catch (error) {
        console.error('Error fetching profile status:', error);
      }
    };

    fetchProfileStatus();
  }, [currentUser]);

  // Fetch astrologer data
  useEffect(() => {
    let unsubscribe;

    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        // Use the real-time listener for chats
        unsubscribe = getUserChats(currentUser.uid, (userChats) => {
          setChats(userChats);

          if (!userChats) return;

          console.log('userChats', userChats);
          // Count new/unread chats
          const newChats = userChats?.filter(chat => {
            // Check if the last message was from the other participant and is unread
            return chat.lastMessage &&
              chat.lastMessage.senderId !== currentUser?.uid &&
              !chat.lastMessage.read;
          });

          setNewReadingsCount(newChats.length);

          // Fetch revenue data
          const fetchRevenue = async () => {
            try {
              setRevenueLoading(true);
              console.log('Fetching revenue for astrologer:', currentUser.uid);
              
              const revenueQuery = query(
                collection(db, 'payments'),
                where('astrologerId', '==', currentUser.uid),
                orderBy('timestamp', 'desc')
              );

              const revenueSnapshot = await getDocs(revenueQuery);
              console.log('Revenue snapshot size:', revenueSnapshot.size);
              
              const revenueData = revenueSnapshot.docs.map(doc => {
                const data = { id: doc.id, ...doc.data() };
                console.log('Payment record:', data);
                return data;
              });
              
              setRevenue(revenueData);
              console.log('Total revenue records found:', revenueData.length);
            } catch (error) {
              console.error('Error fetching revenue data:', error);
              // Check if it's a Firestore rules error
              if (error.code === 'permission-denied') {
                console.error('Permission denied - check Firestore rules for payments collection');
              }
            } finally {
              setRevenueLoading(false);
            }
          };

          fetchRevenue();
        });
      } catch (error) {
        console.error('Error setting up chats listener:', error);
        setLoading(false);
      }
    };

    fetchData();

    // Clean up the listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);

    // If switching to readings tab, mark as read
    if (newValue === 0 && newReadingsCount > 0) {
      // This would typically update the database to mark readings as read
      // For now, just reset the count
      setNewReadingsCount(0);
    }

    // Update URL with tab parameter without full page reload
    router.push({
      pathname: router.pathname,
      query: { tab: newValue }
    }, undefined, { shallow: true });
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  const renderReadingsTab = () => {
    if (loading) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Loading chats...</Typography>
        </Box>
      );
    }

    // If a chat is selected, show the chat interface
    if (selectedChat) {
      return (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleBackToList} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">
              {selectedChat.otherParticipant?.displayName || 'Chat'}
            </Typography>
          </Box>

          <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Service: {SERVICE_TYPES[selectedChat.serviceType] || 'General Consultation'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Started on: {selectedChat.createdAt?.toDate().toLocaleDateString() || 'Unknown date'}
            </Typography>
          </Paper>

          <ChatBox
            chatId={selectedChat.id}
            otherUser={selectedChat.otherParticipant}
          />
        </Box>
      );
    }

    // If no chats available
    if (chats.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>You don't have any client consultations yet.</Typography>
        </Box>
      );
    }

    // Show the list of chats
    return (
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Service</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Last Updated
                </Box>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chats.map((chat) => (
              <TableRow
                key={chat.id}
                hover
                sx={{
                  cursor: 'pointer',
                  bgcolor: chat.lastMessage &&
                    chat.lastMessage.senderId !== currentUser.uid &&
                    !chat.lastMessage.read ?
                    'rgba(25, 118, 210, 0.08)' : 'inherit'
                }}
                onClick={() => handleChatSelect(chat)}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {chat.otherParticipant?.photoURL ? (
                      <Box
                        component="img"
                        src={chat.otherParticipant.photoURL}
                        alt={chat.otherParticipant.displayName}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          mr: 1
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1
                        }}
                      >
                        {chat.otherParticipant?.displayName?.[0]?.toUpperCase() || '?'}
                      </Box>
                    )}
                    {chat.otherParticipant?.displayName || 'Unknown Client'}
                  </Box>
                </TableCell>
                <TableCell>{SERVICE_TYPES[chat.serviceType] || 'General Consultation'}</TableCell>
                <TableCell>
                  {chat.updatedAt?.toDate().toLocaleDateString() || 'Unknown date'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={chat.status || 'Active'}
                    color={
                      chat.status === 'completed' ? 'success' :
                        chat.status === 'pending' ? 'warning' : 'primary'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ChatIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChatSelect(chat);
                    }}
                  >
                    Chat
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderRevenueTab = () => {
    if (revenueLoading) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading revenue data...</Typography>
        </Box>
      );
    }

    // Calculate total revenue
    const totalRevenue = revenue.reduce((sum, payment) => {
      const amount = payment.amount || 0;
      console.log('Adding amount to total:', amount);
      return sum + amount;
    }, 0);

    // Calculate this month's revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthRevenue = revenue.reduce((sum, payment) => {
      if (payment.timestamp) {
        const paymentDate = payment.timestamp.toDate();
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
          return sum + (payment.amount || 0);
        }
      }
      return sum;
    }, 0);

    console.log('Total revenue calculated:', totalRevenue);
    console.log('This month revenue calculated:', thisMonthRevenue);

    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Total Revenue</Typography>
                <Typography variant="h4" color="primary">₹{totalRevenue.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>This Month</Typography>
                <Typography variant="h4" color="secondary">₹{thisMonthRevenue.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Completed Readings</Typography>
                <Typography variant="h4" color="success.main">
                  {chats.filter(chat => chat.status === 'completed').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Active Readings</Typography>
                <Typography variant="h4" color="warning.main">
                  {chats.filter(chat => !chat.status || chat.status === 'active').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mb: 2 }}>Recent Transactions</Typography>

        {revenue.length === 0 ? (
          <Card elevation={1}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No transactions yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your earnings will appear here once clients book your services.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Payment ID</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenue.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.timestamp?.toDate().toLocaleDateString() || 'Unknown date'}
                    </TableCell>
                    <TableCell>{payment.clientName || 'Unknown'}</TableCell>
                    <TableCell>{SERVICE_TYPES[payment.serviceType] || 'General Reading'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {payment.razorpay_payment_id?.substring(0, 12)}...
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="bold" color="success.main">
                        ₹{payment.amount?.toFixed(2) || '0.00'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const renderProfileTab = () => {
    return (
      <AstrologerProfileManager onProfileUpdate={() => setIsProfileComplete(true)} />
    );
  };

  const renderVerificationTab = () => {
    if (verificationStatus === 'rejected') {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          Your profile verification was rejected: {verificationMessage}
        </Alert>
      );
    }

    if (!isVerified && verificationStatus === 'pending') {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your account is pending verification. Please complete your profile and upload required documents.
        </Alert>
      );
    }

    if (isVerified) {
      return (
        <Alert severity="success" sx={{ mb: 2 }}>
          Your account is verified. You can now receive readings from clients.
        </Alert>
      );
    }

    return null;
  };

  return (
    <ProtectedRoute allowedRoles={['astrologer']}>
      <Head>
        <title>Astrologer Dashboard | Astro Insights</title>
      </Head>

      <Box sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default
      }}>
        <Box
          sx={{
            pt: 8,
            pb: 6,
            backgroundImage: 'linear-gradient(rgba(25, 118, 210, 0.8), rgba(25, 118, 210, 0.6))',
            backgroundSize: 'cover',
            color: 'white',
            textAlign: 'center'
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600
              }}
            >
              Astrologer Dashboard
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1.2rem',
                opacity: 0.9
              }}
            >
              Manage your clients, readings, and profile
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ mt: -4 }}>
          <Paper sx={{ p: 0 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Readings
                    <NotificationBadge count={newReadingsCount}>
                      Readings
                    </NotificationBadge>
                  </Box>
                }
              />
              <Tab label="Revenue" />
              <Tab label="Profile" />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Verification
                    {verificationStatus === 'pending' && (
                      <Chip
                        size="small"
                        label="Pending"
                        color="warning"
                        sx={{ ml: 1 }}
                      />
                    )}
                    {verificationStatus === 'rejected' && (
                      <Chip
                        size="small"
                        label="Action Required"
                        color="error"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                }
              />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {!isProfileComplete && tabValue !== 2 && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => handleTabChange(null, 2)}
                    >
                      Complete Now
                    </Button>
                  }
                >
                  Your profile is incomplete. Complete your profile to receive client requests.
                </Alert>
              )}

              {verificationStatus === 'rejected' && tabValue !== 3 && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => handleTabChange(null, 3)}
                    >
                      View Details
                    </Button>
                  }
                >
                  Your verification was rejected. Please submit the required documents.
                </Alert>
              )}

              {tabValue === 0 && renderReadingsTab()}
              {tabValue === 1 && renderRevenueTab()}
              {tabValue === 2 && renderProfileTab()}
              {tabValue === 3 && renderVerificationTab()}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ProtectedRoute>
  );
} 