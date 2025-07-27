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
  useTheme,
  Grid,
  Alert,
  Avatar,
  ListItemIcon,
  Divider,
  Menu,
  Badge,
  FormControlLabel,
  InputAdornment,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';
import ChatMonitor from '../../src/components/admin/ChatMonitor';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BlockIcon from '@mui/icons-material/Block';
import VerifiedIcon from '@mui/icons-material/Verified';
import ChatIcon from '@mui/icons-material/Chat';
import TuneIcon from '@mui/icons-material/Tune';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

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

// Define available services for astrologers
const AVAILABLE_ASTROLOGER_SERVICES = {
  marriageMatching: 'Marriage Matching',
  jathakPrediction: 'Jathak Prediction',
  jathakWriting: 'Jathak Writing',
};

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, isAdmin, getAllUsers, updateUserRoles, hasRole } = useAuth();

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

  // Verification dialog states
  const [openVerificationDialog, setOpenVerificationDialog] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [verificationMessage, setVerificationMessage] = useState('');

  // Action loading state
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add these new state variables at the component level
  const [selectedAstrologer, setSelectedAstrologer] = useState(null);
  const [pendingAstrologers, setPendingAstrologers] = useState([]);
  const [loadingAstrologers, setLoadingAstrologers] = useState(true);

  // Add these state variables to the component
  const [roleFilter, setRoleFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedActionUser, setSelectedActionUser] = useState(null);

  // State for managing astrologer services dialog
  const [openServicesDialog, setOpenServicesDialog] = useState(false);
  const [editingAstrologer, setEditingAstrologer] = useState(null);
  const [astrologerServices, setAstrologerServices] = useState({});
  const [astrologerPricing, setAstrologerPricing] = useState({});
  const [servicesLoading, setServicesLoading] = useState(false);

  // Add state for feedback messages
  const [errorMessage, setErrorMessage] = useState('');

  // Add these new state variables for astrologer verification
  const [openAstrologerVerificationDialog, setOpenAstrologerVerificationDialog] = useState(false);
  const [selectedAstrologerForVerification, setSelectedAstrologerForVerification] = useState(null);
  const [newVerificationStatus, setNewVerificationStatus] = useState('');

  // Get tab from query params
  useEffect(() => {
    if (router.query.tab !== undefined) {
      setTabValue(parseInt(router.query.tab));
    }
  }, [router.query.tab]);

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

  // Add this new useEffect for fetching astrologers
  useEffect(() => {
    if (tabValue === 3) {
      const getAstrologers = async () => {
        setLoadingAstrologers(true);
        const astrologers = await fetchPendingAstrologers();
        setPendingAstrologers(astrologers);
        setLoadingAstrologers(false);
      };

      getAstrologers();
    }
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);

    // Update URL with tab parameter without full page reload
    router.push({
      pathname: router.pathname,
      query: { tab: newValue }
    }, undefined, { shallow: true });
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
      // Update user roles directly in Firestore
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        roles: selectedRoles,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setUsers(users.map(user =>
        user.id === selectedUser.id
          ? { ...user, roles: selectedRoles }
          : user
      ));

              // Show success message
        setSuccessMessage(`User roles updated successfully for ${selectedUser.displayName || selectedUser.email}`);

      handleCloseRoleDialog();
    } catch (error) {
      console.error('Error updating roles:', error);
      // Show error message
      setErrorMessage(`Failed to update user roles: ${error.message}`);
    }
  };

  const handleApproveTestimonial = async (testimonialId) => {
    try {
      const testimonialRef = doc(db, 'testimonials', testimonialId);
      await updateDoc(testimonialRef, {
        approved: true,
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setTestimonials(testimonials.map(testimonial =>
        testimonial.id === testimonialId
          ? { ...testimonial, approved: true, approvedAt: new Date(), approvedBy: currentUser.uid }
          : testimonial
      ));

      // Show success message
      setSuccessMessage('Testimonial approved successfully and is now visible to users.');
    } catch (error) {
      console.error('Error approving testimonial:', error);
      setErrorMessage(`Failed to approve testimonial: ${error.message}`);
    }
  };

  const handleDeleteTestimonial = async (testimonialId) => {
    if (!confirm('Are you sure you want to delete this testimonial? This action cannot be undone.')) return;

    try {
      const testimonialRef = doc(db, 'testimonials', testimonialId);
      await deleteDoc(testimonialRef);

      // Update local state
      setTestimonials(testimonials.filter(
        testimonial => testimonial.id !== testimonialId
      ));

      // Show success message
      setSuccessMessage('Testimonial deleted successfully.');
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      setErrorMessage(`Failed to delete testimonial: ${error.message}`);
    }
  };

  // Add these handlers for the dropdown menu
  const handleOpenActionMenu = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedActionUser(user);
  };

  const handleCloseActionMenu = () => {
    setAnchorEl(null);
    setSelectedActionUser(null);
  };

  const handleRoleFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setRoleFilter(newFilter);
    }
  };

  const handleViewChats = (userId) => {
    // Navigate to a filtered view of chats for this user
    router.push(`/admin/chats?userId=${userId}`);
    handleCloseActionMenu();
  };

  const handleToggleUserStatus = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const isCurrentlyDisabled = user.disabled;
    const action = isCurrentlyDisabled ? 'enable' : 'disable';
    const confirmMessage = isCurrentlyDisabled 
      ? 'Are you sure you want to enable this user?' 
      : 'Are you sure you want to disable this user?';

    if (!confirm(confirmMessage)) {
      handleCloseActionMenu();
      return;
    }
    
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        disabled: !isCurrentlyDisabled,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, disabled: !isCurrentlyDisabled }
          : u
      ));

      // Show success message
      setSuccessMessage(`User ${action}d successfully: ${user.displayName || user.email}`);
      
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      setErrorMessage(`Failed to ${action} user: ${error.message}`);
    }
    
    handleCloseActionMenu();
  };

  // Update the renderUsersTab function
  const renderUsersTab = () => {
    // Filter users based on selected role filter
    const filteredUsers = users.filter(user => {
      if (roleFilter === 'all') return true;
      if (!user.roles) return false;
      return user.roles.includes(roleFilter);
    });

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif' }}>
            Manage Users
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <ToggleButtonGroup
              value={roleFilter}
              exclusive
              onChange={handleRoleFilterChange}
              size="small"
            >
              <ToggleButton value="all">
                All
              </ToggleButton>
              <ToggleButton value="client">
                Clients
              </ToggleButton>
              <ToggleButton value="astrologer">
                Astrologers
              </ToggleButton>
              <ToggleButton value="admin">
                Admins
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Roles</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => {
                // Check if user is an astrologer that needs verification
                const needsVerification = 
                  user.roles?.includes('astrologer') && 
                  (!user.verificationStatus || user.verificationStatus === 'pending' || user.verificationStatus === 'rejected');
                
                return (
                  <TableRow 
                    key={user.id} 
                    sx={{ 
                      bgcolor: user.disabled ? 'rgba(0,0,0,0.05)' : 'inherit',
                      '&:hover': {
                        bgcolor: user.disabled ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          src={user.photoURL}
                          sx={{ mr: 1, width: 32, height: 32 }}
                        />
                        <Box>
                          <Typography variant="body1">
                            {user.displayName || 'Unnamed User'}
                            {user.disabled && (
                              <Typography component="span" sx={{ ml: 1, color: 'error.main', fontStyle: 'italic' }}>
                                (Disabled)
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
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
                        onClick={(e) => handleOpenActionMenu(e, user)}
                      >
                        {needsVerification ? (
                          <Badge color="error" variant="dot">
                            <MoreVertIcon />
                          </Badge>
                        ) : (
                          <MoreVertIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseActionMenu}
        >
          <MenuItem onClick={() => {
            handleOpenRoleDialog(selectedActionUser);
            handleCloseActionMenu();
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Roles</ListItemText>
          </MenuItem>
          
          {selectedActionUser?.roles?.includes('astrologer') && 
           (!selectedActionUser?.verificationStatus || 
            selectedActionUser?.verificationStatus === 'pending' || 
            selectedActionUser?.verificationStatus === 'rejected') && (
            <MenuItem onClick={() => {
              handleOpenAstrologerVerification(selectedActionUser);
              handleCloseActionMenu();
            }}>
              <ListItemIcon>
                <VerifiedIcon fontSize="small" color="secondary" />
              </ListItemIcon>
              <ListItemText primary="Verify Astrologer" />
            </MenuItem>
          )}
          
          <MenuItem onClick={() => handleViewChats(selectedActionUser?.id)}>
            <ListItemIcon>
              <ChatIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Chats</ListItemText>
          </MenuItem>
          
          {selectedActionUser?.roles?.includes('astrologer') && (
            <MenuItem onClick={() => {
              handleOpenServicesDialog(selectedActionUser);
              handleCloseActionMenu();
            }}>
              <ListItemIcon>
                <TuneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Manage Services & Pricing" />
            </MenuItem>
          )}
          
          <Divider />
          
          <MenuItem 
            onClick={() => handleToggleUserStatus(selectedActionUser?.id)}
            sx={{ color: selectedActionUser?.disabled ? 'success.main' : 'error.main' }}
          >
            <ListItemIcon>
              {selectedActionUser?.disabled ? (
                <CheckCircleIcon fontSize="small" color="success" />
              ) : (
                <BlockIcon fontSize="small" color="error" />
              )}
            </ListItemIcon>
            <ListItemText>
              {selectedActionUser?.disabled ? 'Enable User' : 'Disable User'}
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
  };

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

  // Function to fetch astrologers
  const fetchPendingAstrologers = async () => {
    try {
      const astrologersRef = collection(db, 'users');
      // Get both pending and rejected to allow re-review
      const q = query(astrologersRef, where('roles', 'array-contains', 'astrologer'), where('verificationStatus', 'in', ['pending', 'rejected']));
      const querySnapshot = await getDocs(q);

      const astrologersList = [];
      querySnapshot.forEach((doc) => {
        astrologersList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return astrologersList;
    } catch (error) {
      console.error('Error fetching pending astrologers:', error);
      return [];
    }
  };

  // Modified renderAstrologersTab function without hooks inside
  const renderAstrologersTab = () => {
    return (
      <Box>
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"Playfair Display", serif',
            mb: 2
          }}
        >
          Manage Astrologers
        </Typography>

        {loadingAstrologers ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading astrologer verification requests...</Typography>
          </Box>
        ) : pendingAstrologers.length === 0 ? (
          <Alert severity="info">
            No pending astrologer verification requests at this time.
          </Alert>
        ) : (
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Astrologer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Submitted On</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingAstrologers.map((astrologer) => (
                  <TableRow
                    key={astrologer.id}
                    hover
                    onClick={() => handleOpenAstrologerVerification(astrologer)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          src={astrologer.photoURL}
                          sx={{ mr: 1, width: 32, height: 32 }}
                        />
                        {astrologer.displayName || 'Unnamed'}
                      </Box>
                    </TableCell>
                    <TableCell>{astrologer.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={astrologer.verificationStatus || 'Pending'}
                        color={
                          astrologer.verificationStatus === 'verified' ? 'success' :
                            astrologer.verificationStatus === 'rejected' ? 'error' :
                              'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {astrologer.createdAt ? new Date(astrologer.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAstrologerVerification(astrologer);
                        }}
                      >
                        Review
                      </Button>
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

  const handleOpenVerificationDialog = (status) => {
    setVerificationStatus(status);
    setVerificationMessage('');
    setOpenVerificationDialog(true);
  };

  const handleCloseVerificationDialog = () => {
    setOpenVerificationDialog(false);
  };

  const handleSaveVerification = async () => {
    if (!selectedAstrologer) return;

    try {
      // Update the loading state to provide feedback
      setActionLoading(true);

      // Reference to the astrologer document
      const astrologerRef = doc(db, 'users', selectedAstrologer.id);

      // Update astrologer document with verification status
      await updateDoc(astrologerRef, {
        verified: verificationStatus === 'verified',
        verificationStatus: verificationStatus,
        verificationMessage: verificationMessage || '',
        verifiedAt: verificationStatus === 'verified' ? serverTimestamp() : null,
        verifiedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      // Update user document to add/remove astrologer role
      const userRef = doc(db, 'users', selectedAstrologer.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        let userRoles = userData.roles || [];

        if (verificationStatus === 'verified' && !userRoles.includes('astrologer')) {
          userRoles.push('astrologer');
        } else if (verificationStatus === 'rejected' && userRoles.includes('astrologer')) {
          userRoles = userRoles.filter(role => role !== 'astrologer');
        }

        await updateDoc(userRef, {
          roles: userRoles,
          updatedAt: serverTimestamp()
        });
      }

      // Send email notification
      // This would typically be handled by a Cloud Function or server API
      // For now, we'll just send the verification data to a Cloud Function endpoint
      try {
        await fetch('/api/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedAstrologer.id,
            email: selectedAstrologer.email,
            status: verificationStatus,
            message: verificationMessage
          }),
        });
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't fail the whole operation if just the email fails
      }

      // Close the dialog
      handleCloseVerificationDialog();

      // Update local state - refresh astrologers tab
      if (tabValue === 3) {
        // Reload the astrologers tab
        setTabValue(3);
      }
    } catch (error) {
      console.error('Error updating verification status:', error);
      setError('Failed to update verification status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add this function to open the verification dialog with the astrologer data
  const handleOpenAstrologerVerification = (astrologer) => {
    setSelectedAstrologer(astrologer);
    console.log(astrologer);
    setVerificationStatus(astrologer.verificationStatus || 'pending');
    setVerificationMessage('');
    setOpenVerificationDialog(true);
  };

  // Handler to open the astrologer services dialog
  const handleOpenServicesDialog = async (user) => {
    setEditingAstrologer(user);
    setServicesLoading(true);
    setError(''); // Clear previous errors

    try {
      const userDocRef = doc(db, 'users', user.id);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const currentServices = userData.services || [];
        const currentPricing = userData.serviceCharges || {};

        const initialServicesState = {};
        Object.keys(AVAILABLE_ASTROLOGER_SERVICES).forEach(key => {
          initialServicesState[key] = currentServices.includes(key);
        });
        setAstrologerServices(initialServicesState);

        const initialPricingState = {};
        Object.keys(AVAILABLE_ASTROLOGER_SERVICES).forEach(key => {
          initialPricingState[key] = currentPricing[key] || '500'; // Default to 500 if not set
        });
        setAstrologerPricing(initialPricingState);

      } else {
        setError('Could not load astrologer data.');
        setAstrologerServices({});
        setAstrologerPricing({});
      }
    } catch (err) {
      console.error('Error fetching astrologer services data:', err);
      setError('Failed to load services data. Please try again.');
      setAstrologerServices({});
      setAstrologerPricing({});
    } finally {
      setServicesLoading(false);
      setOpenServicesDialog(true);
    }
  };

  const handleCloseServicesDialog = () => {
    setEditingAstrologer(null);
    setOpenServicesDialog(false);
    setActionLoading(false); // Reset actionLoading, already present
    setError(''); // Clear error on close
    setSuccessMessage(''); // Clear success message on close
  };

  const handleAstrologerServiceChange = (service, checked) => {
    setAstrologerServices({
      ...astrologerServices,
      [service]: checked
    });
  };

  const handleAstrologerPricingChange = (service, value) => {
    setAstrologerPricing({
      ...astrologerPricing,
      [service]: value
    });
  };

  const handleSaveAstrologerServices = async () => {
    if (!editingAstrologer) return;

    try {
      setServicesLoading(true);

      // Reference to the astrologer document
      const astrologerRef = doc(db, 'users', editingAstrologer.id);

      // Prepare data for update
      const servicesToUpdate = Object.keys(astrologerServices)
        .filter(serviceKey => astrologerServices[serviceKey]);
      
      const pricingToUpdate = {};
      servicesToUpdate.forEach(serviceKey => {
        // Ensure price is a number and provide a default if empty or invalid
        const price = parseFloat(astrologerPricing[serviceKey]);
        pricingToUpdate[serviceKey] = !isNaN(price) && price > 0 ? price : 500; 
      });

      // Update astrologer document with services and pricing
      await updateDoc(astrologerRef, {
        services: servicesToUpdate,
        serviceCharges: pricingToUpdate,
        updatedAt: serverTimestamp()
      });

      // Close the dialog
      handleCloseServicesDialog();
      setSuccessMessage('Astrologer services and pricing updated successfully!'); // Provide success feedback

      // Optionally, refresh user data if needed, though roles haven't changed here
      // e.g., by re-fetching users for the main table if displayed info changes
      
    } catch (error) {
      console.error('Error updating astrologer services:', error);
      setError('Failed to update astrologer services. Please try again.');
    } finally {
      setServicesLoading(false);
    }
  };

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
              <Tab label="Astrologers" />
              <Tab label="Chat Monitor" />
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
              {tabValue === 3 && renderAstrologersTab()}
              {tabValue === 4 && <ChatMonitor userId={currentUser?.uid} userType={'admin'} />}
            </>
          )}
        </Container>
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

      {/* Manage Astrologer Services Dialog */}
      <Dialog open={openServicesDialog} onClose={handleCloseServicesDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: '"Playfair Display", serif' }}>
          Manage Services for {editingAstrologer?.displayName || 'Astrologer'}
        </DialogTitle>
        <DialogContent>
          {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}      
          {servicesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {Object.entries(AVAILABLE_ASTROLOGER_SERVICES).map(([key, name]) => (
                <Paper key={key} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!astrologerServices[key]}
                        onChange={(e) => handleAstrologerServiceChange(key, e.target.checked)}
                        name={key}
                      />
                    }
                    label={<Typography variant="subtitle1">{name}</Typography>}
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    label="Price (₹)"
                    variant="outlined"
                    size="small"
                    fullWidth
                    type="number"
                    value={astrologerPricing[key] || ''}
                    onChange={(e) => handleAstrologerPricingChange(key, e.target.value)}
                    disabled={!astrologerServices[key]}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                  />
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseServicesDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveAstrologerServices} 
            variant="contained" 
            color="primary"
            disabled={servicesLoading || actionLoading}
          >
            {actionLoading ? 'Saving...' : 'Save Services'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog
        open={openVerificationDialog}
        onClose={handleCloseVerificationDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: '"Playfair Display", serif' }}>
          Verify Astrologer {selectedAstrologer?.displayName || ''}
        </DialogTitle>
        <DialogContent>
          {selectedAstrologer && (
            <Box>
              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Profile Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Name</Typography>
                    <Typography variant="body1">{selectedAstrologer.displayName || 'Not provided'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Email</Typography>
                    <Typography variant="body1">{selectedAstrologer.email || 'Not provided'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Phone</Typography>
                    <Typography variant="body1">{selectedAstrologer.phoneNumber || 'Not provided'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1">Experience</Typography>
                    <Typography variant="body1">{selectedAstrologer.experience || 'Not provided'} years</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Services & Pricing
                </Typography>
                {selectedAstrologer.services && selectedAstrologer.services.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Service</TableCell>
                          <TableCell align="right">Price (₹)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedAstrologer.services.map((service, index) => (
                          <TableRow key={index}>
                            <TableCell>{service.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</TableCell>
                            <TableCell align="right">₹{selectedAstrologer.serviceCharges[service]}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="error">No services configured</Typography>
                )}
              </Paper>

              <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Verification Documents
                </Typography>
                {selectedAstrologer.verificationDocuments ? (
                  <Grid container spacing={2}>
                    {Object.keys(selectedAstrologer.verificationDocuments).map((doc, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        {selectedAstrologer.verificationDocuments[doc]?.length > 0 && selectedAstrologer.verificationDocuments[doc].map((document, index) => (
                          <Box sx={{ border: '1px solid #ddd', p: 1, borderRadius: 1 }}>
                            <Typography variant="subtitle2">{doc.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Document'}</Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              href={document.url}
                              target="_blank"
                              sx={{ mt: 1 }}
                            >
                              View Document
                            </Button>
                          </Box>
                        ))}
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography color="error">No verification documents uploaded</Typography>
                )}
              </Paper>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Verification Decision
              </Typography>

              <FormControl sx={{ width: '100%', mb: 2 }}>
                <InputLabel id="verification-status-select-label">Verification Status</InputLabel>
                <Select
                  labelId="verification-status-select-label"
                  id="verification-status-select"
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  input={<OutlinedInput label="Verification Status" />}
                >
                  <MenuItem value="approved">Approve</MenuItem>
                  <MenuItem value="rejected">Reject</MenuItem>
                  <MenuItem value="pending">Keep Pending</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Message to Astrologer"
                multiline
                rows={4}
                value={verificationMessage}
                onChange={(e) => setVerificationMessage(e.target.value)}
                fullWidth
                placeholder={
                  verificationStatus === 'rejected'
                    ? 'Please provide a reason for rejection'
                    : 'Optional message for the astrologer'
                }
                required={verificationStatus === 'rejected'}
                error={verificationStatus === 'rejected' && !verificationMessage}
                helperText={
                  verificationStatus === 'rejected' && !verificationMessage
                    ? 'A reason is required when rejecting'
                    : ''
                }
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVerificationDialog}>Cancel</Button>
          <Button
            onClick={handleSaveVerification}
            variant="contained"
            color="primary"
            disabled={
              actionLoading ||
              (verificationStatus === 'rejected' && !verificationMessage)
            }
          >
            {actionLoading ? 'Saving...' : 'Save Decision'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </ProtectedRoute>
  );
} 