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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../../src/components/navbar';
import Footer from '../../src/components/footer';
import { useAuth } from '../../src/context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';

// Protected route component
import ProtectedRoute from '../../src/components/ProtectedRoute';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

// Available roles in the system
const availableRoles = [
  'admin',
  'astrologer',
  'client',
  'support',
  'content_manager'
];

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, isAdmin, getAllUsers, updateUserRoles } = useAuth();
  
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [revenue, setRevenue] = useState({
    total: 0,
    byAstrologer: []
  });
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  
  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        if (tabValue === 0) {
          // Users tab
          const usersData = await getAllUsers();
          setUsers(usersData);
        } else if (tabValue === 1) {
          // Testimonials tab
          const testimonialsRef = collection(db, 'testimonials');
          const q = query(testimonialsRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          
          const testimonialsList = [];
          querySnapshot.forEach((doc) => {
            testimonialsList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setTestimonials(testimonialsList);
        } else if (tabValue === 2) {
          // Revenue tab
          const paymentsRef = collection(db, 'payments');
          const q = query(paymentsRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          
          let totalRevenue = 0;
          const astrologerRevenue = {};
          
          querySnapshot.forEach((doc) => {
            const payment = doc.data();
            totalRevenue += payment.amount;
            
            if (payment.astrologerId) {
              if (!astrologerRevenue[payment.astrologerId]) {
                astrologerRevenue[payment.astrologerId] = {
                  id: payment.astrologerId,
                  name: payment.astrologerName || 'Unknown',
                  total: 0
                };
              }
              
              astrologerRevenue[payment.astrologerId].total += payment.amount;
            }
          });
          
          setRevenue({
            total: totalRevenue,
            byAstrologer: Object.values(astrologerRevenue)
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser, tabValue, getAllUsers]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleOpenRoleDialog = (user) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setOpenRoleDialog(true);
  };
  
  const handleCloseRoleDialog = () => {
    setOpenRoleDialog(false);
    setSelectedUser(null);
  };
  
  const handleRoleChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedRoles(
      typeof value === 'string' ? value.split(',') : value,
    );
  };
  
  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    
    try {
      await updateUserRoles(selectedUser.id, selectedRoles);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, roles: selectedRoles } 
          : user
      ));
      
      handleCloseRoleDialog();
    } catch (error) {
      console.error('Error updating roles:', error);
      // Show error message
    }
  };
  
  const handleApproveTestimonial = async (testimonialId) => {
    try {
      const testimonialRef = doc(db, 'testimonials', testimonialId);
      await updateDoc(testimonialRef, {
        approved: true,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setTestimonials(testimonials.map(testimonial => 
        testimonial.id === testimonialId 
          ? { ...testimonial, approved: true } 
          : testimonial
      ));
    } catch (error) {
      console.error('Error approving testimonial:', error);
    }
  };
  
  const handleDeleteTestimonial = async (testimonialId) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    
    try {
      const testimonialRef = doc(db, 'testimonials', testimonialId);
      await deleteDoc(testimonialRef);
      
      // Update local state
      setTestimonials(testimonials.filter(
        testimonial => testimonial.id !== testimonialId
      ));
    } catch (error) {
      console.error('Error deleting testimonial:', error);
    }
  };
  
  // Render users tab content
  const renderUsersTab = () => (
    <TableContainer component={Paper} elevation={0}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Roles</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Joined</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.displayName || 'N/A'}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.roles && user.roles.map((role) => (
                  <Chip 
                    key={role} 
                    label={role} 
                    size="small" 
                    color={role === 'admin' ? 'primary' : role === 'astrologer' ? 'secondary' : 'default'}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </TableCell>
              <TableCell>
                {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'}
              </TableCell>
              <TableCell>
                <IconButton 
                  color="primary" 
                  onClick={() => handleOpenRoleDialog(user)}
                >
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Render testimonials tab content
  const renderTestimonialsTab = () => (
    <TableContainer component={Paper} elevation={0}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Rating</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Testimonial</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {testimonials.map((testimonial) => (
            <TableRow key={testimonial.id}>
              <TableCell>{testimonial.name}</TableCell>
              <TableCell>{testimonial.service}</TableCell>
              <TableCell>{testimonial.rating} ★</TableCell>
              <TableCell sx={{ maxWidth: 300 }}>
                <Typography noWrap>{testimonial.text}</Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={testimonial.approved ? 'Approved' : 'Pending'} 
                  color={testimonial.approved ? 'success' : 'warning'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {testimonial.createdAt ? new Date(testimonial.createdAt.toDate()).toLocaleDateString() : 'N/A'}
              </TableCell>
              <TableCell>
                {!testimonial.approved && (
                  <IconButton 
                    color="success" 
                    onClick={() => handleApproveTestimonial(testimonial.id)}
                    sx={{ mr: 1 }}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                )}
                <IconButton 
                  color="error" 
                  onClick={() => handleDeleteTestimonial(testimonial.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Render revenue tab content
  const renderRevenueTab = () => (
    <Box>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
        }}
      >
        <Typography variant="h4" sx={{ fontFamily: '"Playfair Display", serif', mb: 1 }}>
          Total Revenue
        </Typography>
        <Typography variant="h2" sx={{ fontFamily: '"Cinzel", serif', color: theme.palette.primary.main }}>
          ₹{revenue.total.toLocaleString()}
        </Typography>
      </Paper>
      
      <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif', mb: 2 }}>
        Revenue by Astrologer
      </Typography>
      
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Astrologer</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Revenue</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Percentage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {revenue.byAstrologer.map((astrologer) => (
              <TableRow key={astrologer.id}>
                <TableCell>{astrologer.name}</TableCell>
                <TableCell>₹{astrologer.total.toLocaleString()}</TableCell>
                <TableCell>
                  {revenue.total > 0 
                    ? `${((astrologer.total / revenue.total) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
  
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Head>
        <title>Admin Dashboard | Valluvar Vaasal</title>
        <meta name="description" content="Admin dashboard for Valluvar Vaasal" />
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
              Admin Dashboard
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
              <Tab label="Users" />
              <Tab label="Testimonials" />
              <Tab label="Revenue" />
            </Tabs>
          </Paper>
          
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : (
            <>
              {tabValue === 0 && renderUsersTab()}
              {tabValue === 1 && renderTestimonialsTab()}
              {tabValue === 2 && renderRevenueTab()}
            </>
          )}
        </Container>
        
        <Footer />
      </Box>
      
      {/* Edit Roles Dialog */}
      <Dialog open={openRoleDialog} onClose={handleCloseRoleDialog}>
        <DialogTitle sx={{ fontFamily: '"Playfair Display", serif' }}>
          Edit User Roles
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedUser?.displayName || selectedUser?.email || 'User'}
          </Typography>
          
          <FormControl sx={{ width: '100%' }}>
            <InputLabel id="roles-select-label">Roles</InputLabel>
            <Select
              labelId="roles-select-label"
              id="roles-select"
              multiple
              value={selectedRoles}
              onChange={handleRoleChange}
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) => selected.join(', ')}
              MenuProps={MenuProps}
            >
              {availableRoles.map((role) => (
                <MenuItem key={role} value={role}>
                  <Checkbox checked={selectedRoles.indexOf(role) > -1} />
                  <ListItemText primary={role} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>Cancel</Button>
          <Button onClick={handleSaveRoles} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
} 