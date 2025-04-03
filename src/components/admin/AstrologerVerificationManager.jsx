import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  Avatar,
  Tabs,
  Tab,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';

const AstrologerVerificationManager = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [pendingAstrologers, setPendingAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAstrologer, setSelectedAstrologer] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('approved');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  useEffect(() => {
    fetchPendingAstrologers();
  }, []);
  
  const fetchPendingAstrologers = async () => {
    try {
      setLoading(true);
      const astrologersRef = collection(db, 'astrologers');
      // Get both pending and rejected to allow re-review
      const q = query(astrologersRef, where('verificationStatus', 'in', ['pending', 'rejected']));
      const querySnapshot = await getDocs(q);
      
      const astrologersList = [];
      querySnapshot.forEach((doc) => {
        astrologersList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setPendingAstrologers(astrologersList);
    } catch (error) {
      console.error('Error fetching pending astrologers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (astrologer) => {
    setSelectedAstrologer(astrologer);
    setVerificationStatus('approved');
    setVerificationMessage('');
    setTabValue(0);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAstrologer(null);
  };
  
  const handleVerificationStatusChange = (event) => {
    setVerificationStatus(event.target.value);
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleSaveVerification = async () => {
    if (!selectedAstrologer) return;
    
    try {
      const astrologerRef = doc(db, 'astrologers', selectedAstrologer.id);
      
      // Update astrologer document
      await updateDoc(astrologerRef, {
        verified: verificationStatus === 'approved',
        verificationStatus: verificationStatus,
        verificationMessage: verificationMessage || '',
        verifiedAt: verificationStatus === 'approved' ? serverTimestamp() : null,
        verifiedBy: verificationStatus === 'approved' ? currentUser.uid : null,
        updatedAt: serverTimestamp()
      });
      
      // Update user document to add/remove astrologer role
      const userRef = doc(db, 'users', selectedAstrologer.id);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let userRoles = userData.roles || [];
        
        if (verificationStatus === 'approved' && !userRoles.includes('astrologer')) {
          userRoles.push('astrologer');
        } else if (verificationStatus === 'rejected' && userRoles.includes('astrologer')) {
          userRoles = userRoles.filter(role => role !== 'astrologer');
        }
        
        await updateDoc(userRef, {
          roles: userRoles,
          updatedAt: serverTimestamp()
        });
      }
      
      // Update local state
      setPendingAstrologers(pendingAstrologers.filter(
        astrologer => astrologer.id !== selectedAstrologer.id
      ));
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Loading astrologer verification requests...</Typography>
      </Box>
    );
  }
  
  if (pendingAstrologers.length === 0) {
    return (
      <Card elevation={1} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>No Pending Verification Requests</Typography>
        <Typography variant="body2" color="text.secondary">
          All astrologer applications have been processed
        </Typography>
      </Card>
    );
  }
  
  return (
    <Box>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Submitted</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingAstrologers.map((astrologer) => (
              <TableRow 
                key={astrologer.id}
                hover
                onClick={() => handleOpenDialog(astrologer)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      src={astrologer.photoURL} 
                      sx={{ mr: 1, width: 32, height: 32 }}
                    >
                      <PersonIcon fontSize="small" />
                    </Avatar>
                    {astrologer.displayName || 'Unnamed'}
                  </Box>
                </TableCell>
                <TableCell>{astrologer.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={astrologer.verificationStatus || 'Pending'} 
                    color={
                      astrologer.verificationStatus === 'approved' ? 'success' :
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
                      handleOpenDialog(astrologer);
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
      
      {/* Verification Review Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: '"Playfair Display", serif' }}>
          Review Astrologer Profile
        </DialogTitle>
        <DialogContent>
          {selectedAstrologer && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  src={selectedAstrologer.photoURL} 
                  sx={{ width: 80, height: 80, mr: 2 }}
                >
                  <PersonIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedAstrologer.displayName || 'Unnamed Astrologer'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAstrologer.email}
                  </Typography>
                  {selectedAstrologer.phoneNumber && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedAstrologer.phoneNumber}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="astrologer verification tabs"
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab icon={<PersonIcon />} label="Profile" />
                <Tab icon={<MonetizationOnIcon />} label="Services & Pricing" />
                <Tab icon={<DescriptionIcon />} label="Documents" />
              </Tabs>
              
              {tabValue === 0 && (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Experience</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {selectedAstrologer.experience || 'Not specified'}
                      </Typography>
                      
                      <Typography variant="subtitle2">Languages</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {selectedAstrologer.languages?.join(', ') || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Specialization</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {selectedAstrologer.specialization || 'Not specified'}
                      </Typography>
                      
                      <Typography variant="subtitle2">Location</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {selectedAstrologer.location || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Bio</Typography>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                        <Typography variant="body2">
                          {selectedAstrologer.bio || 'No bio provided'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {tabValue === 1 && (
                <Box>
                  {selectedAstrologer.services && selectedAstrologer.services.length > 0 ? (
                    <Grid container spacing={2}>
                      {selectedAstrologer.services.map((service, index) => (
                        <Grid item xs={12} md={6} key={index}>
                          <Card elevation={1}>
                            <CardContent>
                              <Typography variant="h6">{service.name}</Typography>
                              <Typography variant="h5" color="primary" sx={{ my: 1 }}>
                                ₹{service.price}
                              </Typography>
                              <Typography variant="body2">
                                {service.description || 'No description provided'}
                              </Typography>
                              <Box sx={{ mt: 1 }}>
                                <Chip 
                                  size="small" 
                                  label={`Duration: ${service.duration || 'Not specified'}`} 
                                  sx={{ mr: 1, mb: 1 }}
                                />
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body1" color="error">
                      No services or pricing information provided
                    </Typography>
                  )}
                </Box>
              )}
              
              {tabValue === 2 && (
                <Box>
                  {selectedAstrologer.documents && selectedAstrologer.documents.length > 0 ? (
                    <Grid container spacing={2}>
                      {selectedAstrologer.documents.map((doc, index) => (
                        <Grid item xs={12} md={6} key={index}>
                          <Card elevation={1}>
                            <CardContent>
                              <Typography variant="subtitle1">{doc.type || 'Document'}</Typography>
                              {doc.url && (
                                <Button 
                                  variant="outlined" 
                                  href={doc.url} 
                                  target="_blank"
                                  sx={{ mt: 1 }}
                                >
                                  View Document
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body1" color="error">
                      No verification documents uploaded
                    </Typography>
                  )}
                </Box>
              )}
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>Verification Decision</Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="verification-status-label">Status</InputLabel>
                <Select
                  labelId="verification-status-label"
                  value={verificationStatus}
                  onChange={handleVerificationStatusChange}
                  label="Status"
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveVerification} 
            variant="contained" 
            color="primary"
            disabled={verificationStatus === 'rejected' && !verificationMessage}
          >
            Save Decision
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AstrologerVerificationManager; 