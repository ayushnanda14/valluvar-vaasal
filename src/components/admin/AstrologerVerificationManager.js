import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';

export default function AstrologerVerificationManager() {
  const theme = useTheme();
  const { t } = useTranslation();
  
  // State for astrologers list
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for verification dialog
  const [selectedAstrologer, setSelectedAstrologer] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Fetch astrologers with pending verification
  useEffect(() => {
    let unsubscribe;
    
    const fetchAstrologers = async () => {
      try {
        setLoading(true);
        
        const astrologersQuery = query(
          collection(db, 'users'),
          where('roles', 'array-contains', 'astrologer'),
          where('verificationStatus', '==', 'pending')
        );
        
        // Use onSnapshot for real-time updates
        unsubscribe = onSnapshot(astrologersQuery, (querySnapshot) => {
          const astrologersList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setAstrologers(astrologersList);
          setLoading(false);
        }, (error) => {
          console.error('Error in astrologers verification listener:', error);
          setError('Failed to load astrologers. Please try again.');
          setLoading(false);
        });
      } catch (err) {
        console.error('Error setting up astrologers verification listener:', err);
        setError('Failed to load astrologers. Please try again.');
        setLoading(false);
      }
    };
    
    fetchAstrologers();
    
    // Clean up listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Handle view documents
  const handleViewDocuments = (astrologer) => {
    setSelectedAstrologer(astrologer);
    setViewDialogOpen(true);
  };
  
  // Handle verify astrologer
  const handleVerify = (astrologer) => {
    setSelectedAstrologer(astrologer);
    setVerifyDialogOpen(true);
  };
  
  // Handle reject astrologer
  const handleReject = (astrologer) => {
    setSelectedAstrologer(astrologer);
    setRejectDialogOpen(true);
  };
  
  // Confirm verification
  const confirmVerification = async () => {
    if (!selectedAstrologer) return;
    
    try {
      setActionLoading(true);
      
      await updateDoc(doc(db, 'users', selectedAstrologer.id), {
        verificationStatus: 'verified',
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setAstrologers(astrologers.filter(a => a.id !== selectedAstrologer.id));
      setVerifyDialogOpen(false);
      setSelectedAstrologer(null);
    } catch (err) {
      console.error('Error verifying astrologer:', err);
      setError('Failed to verify astrologer. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Confirm rejection
  const confirmRejection = async () => {
    if (!selectedAstrologer) return;
    
    try {
      setActionLoading(true);
      
      await updateDoc(doc(db, 'users', selectedAstrologer.id), {
        verificationStatus: 'rejected',
        rejectionReason: rejectionReason,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setAstrologers(astrologers.filter(a => a.id !== selectedAstrologer.id));
      setRejectDialogOpen(false);
      setSelectedAstrologer(null);
      setRejectionReason('');
    } catch (err) {
      console.error('Error rejecting astrologer:', err);
      setError('Failed to reject astrologer. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          fontFamily: '"Cormorant Garamond", serif',
          color: theme.palette.primary.main,
          mb: 2
        }}
      >
        {t('astrologerVerification.title', 'Astrologer Verification')}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : astrologers.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', my: 4 }}>
          No pending verification requests.
        </Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Astrologer</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Submitted On</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {astrologers.map((astrologer) => (
                <TableRow key={astrologer.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar 
                        src={astrologer.photoURL || '/images/default-avatar.png'} 
                        sx={{ mr: 2 }}
                      />
                      <Typography variant="body1">
                        {astrologer.displayName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{astrologer.email}</TableCell>
                  <TableCell>{astrologer.phoneNumber}</TableCell>
                  <TableCell>
                    {astrologer.verificationDocuments?.submittedAt ? 
                      new Date(astrologer.verificationDocuments.submittedAt.seconds * 1000).toLocaleDateString() : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewDocuments(astrologer)}
                      >
                        View
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleVerify(astrologer)}
                      >
                        Verify
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => handleReject(astrologer)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* View Documents Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Verification Documents - {selectedAstrologer?.displayName}
        </DialogTitle>
        <DialogContent>
          {selectedAstrologer?.verificationDocuments ? (
            <Box>
              {/* Aadhar Documents */}
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Aadhar Card
              </Typography>
              {selectedAstrologer.verificationDocuments.aadhar?.map((doc, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    {doc.name} ({(doc.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <Link href={doc.url} target="_blank" rel="noopener">
                    View Document
                  </Link>
                </Box>
              ))}
              
              {/* Certificate Documents */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                Certificates
              </Typography>
              {selectedAstrologer.verificationDocuments.certificates?.length > 0 ? (
                selectedAstrologer.verificationDocuments.certificates.map((doc, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      {doc.name} ({(doc.size / 1024 / 1024).toFixed(2)} MB)
                    </Typography>
                    <Link href={doc.url} target="_blank" rel="noopener">
                      View Document
                    </Link>
                  </Box>
                ))
              ) : (
                <Typography variant="body2">No certificates uploaded</Typography>
              )}
              
              {/* Experience Documents */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                Experience Proof
              </Typography>
              {selectedAstrologer.verificationDocuments.experience?.length > 0 ? (
                selectedAstrologer.verificationDocuments.experience.map((doc, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      {doc.name} ({(doc.size / 1024 / 1024).toFixed(2)} MB)
                    </Typography>
                    <Link href={doc.url} target="_blank" rel="noopener">
                      View Document
                    </Link>
                  </Box>
                ))
              ) : (
                <Typography variant="body2">No experience documents uploaded</Typography>
              )}
            </Box>
          ) : (
            <Typography>No documents found</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Verify Dialog */}
      <Dialog
        open={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
      >
        <DialogTitle>Verify Astrologer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to verify {selectedAstrologer?.displayName}? 
            This will allow them to provide astrology services on the platform.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmVerification} 
            variant="contained" 
            color="success"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Verify'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
      >
        <DialogTitle>Reject Verification</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for rejecting {selectedAstrologer?.displayName}'s verification.
          </DialogContentText>
          <TextField
            autoFocus
            label="Rejection Reason"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmRejection} 
            variant="contained" 
            color="error"
            disabled={actionLoading || !rejectionReason.trim()}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
} 