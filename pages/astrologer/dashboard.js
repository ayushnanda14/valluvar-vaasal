import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  Grid,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../src/components/navbar';
import Footer from '../../src/components/footer';
import { useAuth } from '../../src/context/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';

// Protected route component
import ProtectedRoute from '../../src/components/ProtectedRoute';

export default function AstrologerDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const [tabValue, setTabValue] = useState(0);
  const [readings, setReadings] = useState([]);
  const [revenue, setRevenue] = useState({
    total: 0,
    monthly: 0,
    recentPayments: []
  });
  const [loading, setLoading] = useState(true);
  
  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        if (tabValue === 0) {
          // Readings tab
          const readingsRef = collection(db, 'chats');
          const q = query(
            readingsRef, 
            where('astrologerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          
          const readingsList = [];
          querySnapshot.forEach((doc) => {
            readingsList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setReadings(readingsList);
        } else if (tabValue === 1) {
          // Revenue tab
          const paymentsRef = collection(db, 'payments');
          const q = query(
            paymentsRef, 
            where('astrologerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          
          let totalRevenue = 0;
          let monthlyRevenue = 0;
          const recentPayments = [];
          
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          querySnapshot.forEach((doc) => {
            const payment = doc.data();
            totalRevenue += payment.amount;
            
            // Check if payment is from current month
            if (payment.createdAt && payment.createdAt.toDate() >= firstDayOfMonth) {
              monthlyRevenue += payment.amount;
            }
            
            recentPayments.push({
              id: doc.id,
              ...payment
            });
            
            if (recentPayments.length > 10) {
              recentPayments.pop(); // Keep only 10 most recent
            }
          });
          
          setRevenue({
            total: totalRevenue,
            monthly: monthlyRevenue,
            recentPayments
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, tabValue]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleViewReading = (readingId) => {
    router.push(`/chat/${readingId}`);
  };
  
  // Render readings tab content
  const renderReadingsTab = () => (
    <TableContainer component={Paper} elevation={0}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Reading Type</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Last Updated</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {readings.length > 0 ? (
            readings.map((reading) => (
              <TableRow key={reading.id}>
                <TableCell>{reading.clientName || 'Anonymous'}</TableCell>
                <TableCell>{reading.readingType || 'General Reading'}</TableCell>
                <TableCell>
                  <Chip 
                    label={reading.status || 'Open'} 
                    color={
                      reading.status === 'completed' ? 'success' : 
                      reading.status === 'in-progress' ? 'primary' : 
                      'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {reading.createdAt ? new Date(reading.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {reading.lastUpdated ? new Date(reading.lastUpdated.toDate()).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleViewReading(reading.id)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Typography variant="body1" sx={{ py: 2 }}>
                  No readings found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Render revenue tab content
  const renderRevenueTab = () => (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ 
            p: 3, 
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', mb: 1 }}>
                Total Revenue
              </Typography>
              <Typography variant="h3" sx={{ fontFamily: '"Cinzel", serif', color: theme.palette.primary.main }}>
                ₹{revenue.total.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ 
            p: 3, 
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif', mb: 1 }}>
                This Month
              </Typography>
              <Typography variant="h3" sx={{ fontFamily: '"Cinzel", serif', color: theme.palette.primary.main }}>
                ₹{revenue.monthly.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif', mb: 2 }}>
        Recent Payments
      </Typography>
      
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {revenue.recentPayments.length > 0 ? (
              revenue.recentPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.createdAt ? new Date(payment.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>{payment.clientName || 'Anonymous'}</TableCell>
                  <TableCell>{payment.service || 'Reading'}</TableCell>
                  <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No payment records found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
  
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
        <Navbar />
        
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
              <Tab label="Readings" />
              <Tab label="Revenue" />
            </Tabs>
          </Paper>
          
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : (
            <>
              {tabValue === 0 && renderReadingsTab()}
              {tabValue === 1 && renderRevenueTab()}
            </>
          )}
        </Container>
        
        <Footer />
      </Box>
    </ProtectedRoute>
  );
} 