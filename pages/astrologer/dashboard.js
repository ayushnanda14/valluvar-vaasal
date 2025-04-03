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
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../src/components/navbar';
import Footer from '../../src/components/footer';
import { useAuth } from '../../src/context/AuthContext';
import AstrologerProfileManager from '../../src/components/AstrologerProfileManager';
import DocumentVerification from '../../src/components/DocumentVerification';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import NotificationBadge from '../../src/components/NotificationBadge';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';

export default function AstrologerDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, hasRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [readings, setReadings] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
        const profileRef = doc(db, 'astrologers', currentUser.uid);
        const profileDoc = await getDoc(profileRef);
        
        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          
          // Check if profile has all required fields
          const hasServices = profileData.services && profileData.services.length > 0;
          const hasPricing = profileData.services && profileData.services.some(s => s.price > 0);
          
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
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch readings
        const readingsQuery = query(
          collection(db, 'readings'),
          where('astrologerId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        const readingsSnapshot = await getDocs(readingsQuery);
        const readingsData = readingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReadings(readingsData);
        
        // Count new/unread readings
        const newReadings = readingsData.filter(r => r.status === 'new' || r.isRead === false);
        setNewReadingsCount(newReadings.length);
        
        // Fetch revenue data
        const revenueQuery = query(
          collection(db, 'payments'),
          where('astrologerId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        
        const revenueSnapshot = await getDocs(revenueQuery);
        const revenueData = revenueSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRevenue(revenueData);
        
      } catch (error) {
        console.error('Error fetching astrologer data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
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
  
  const renderReadingsTab = () => {
    if (loading) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Loading readings...</Typography>
        </Box>
      );
    }
    
    if (readings.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>You don't have any readings yet.</Typography>
        </Box>
      );
    }
    
    return (
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Service</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {readings.map((reading) => (
              <TableRow key={reading.id}>
                <TableCell>{reading.clientName || 'Unknown'}</TableCell>
                <TableCell>{reading.serviceType || 'General Reading'}</TableCell>
                <TableCell>
                  {reading.createdAt?.toDate().toLocaleDateString() || 'Unknown date'}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={reading.status || 'Pending'} 
                    color={
                      reading.status === 'completed' ? 'success' :
                      reading.status === 'in-progress' ? 'primary' :
                      'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => router.push(`/readings/${reading.id}`)}
                  >
                    View
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
    if (loading) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Loading revenue data...</Typography>
        </Box>
      );
    }
    
    // Calculate total revenue
    const totalRevenue = revenue.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    return (
      <Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Total Revenue</Typography>
                <Typography variant="h4" color="primary">₹{totalRevenue.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Completed Readings</Typography>
                <Typography variant="h4" color="primary">
                  {readings.filter(r => r.status === 'completed').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Pending Readings</Typography>
                <Typography variant="h4" color="primary">
                  {readings.filter(r => r.status === 'pending').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Typography variant="h6" sx={{ mb: 2 }}>Recent Transactions</Typography>
        
        {revenue.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>No transactions yet.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Service</TableCell>
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
                    <TableCell>{payment.serviceType || 'General Reading'}</TableCell>
                    <TableCell align="right">₹{payment.amount?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };
  
  return (
    <ProtectedRoute requiredRoles={['astrologer']}>
      <Head>
        <title>Astrologer Dashboard | Valluvar Vaasal</title>
        <meta name="description" content="Astrologer dashboard for Valluvar Vaasal" />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        {/* <Navbar /> */}
        
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
              Astrologer Dashboard
            </Typography>
            
            {verificationStatus === 'rejected' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Your profile verification was rejected: {verificationMessage}
              </Alert>
            )}
            
            {!isVerified && verificationStatus === 'pending' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Your account is pending verification. Please complete your profile and upload required documents.
              </Alert>
            )}
            
            {isVerified && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Your account is verified. You can now receive readings from clients.
              </Alert>
            )}
          </Container>
        </Box>
        
        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          <Paper elevation={0} sx={{ mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    Readings
                    {newReadingsCount > 0 && (
                      <NotificationBadge count={newReadingsCount} />
                    )}
                  </Box>
                } 
              />
              <Tab label="Revenue" />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                    Services & Pricing
                    {!isProfileComplete && (
                      <NotificationBadge showExclamation={true} />
                    )}
                  </Box>
                } 
              />
              
              {/* Only show verification tab if not verified */}
              {!isVerified && (
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                      Verification
                      <NotificationBadge showExclamation={true} />
                    </Box>
                  } 
                />
              )}
            </Tabs>
          </Paper>
          
          {tabValue === 0 && renderReadingsTab()}
          {tabValue === 1 && renderRevenueTab()}
          {tabValue === 2 && <AstrologerProfileManager onProfileUpdate={() => setIsProfileComplete(true)} />}
          {!isVerified && tabValue === 3 && <DocumentVerification />}
        </Container>
        
        {/* <Footer /> */}
      </Box>
    </ProtectedRoute>
  );
} 