import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert, 
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  Divider,
  useTheme
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import FileUploadSection from './FileUploadSection';
import { 
  getAstrologerVerificationStatus,
  uploadVerificationDocuments
} from '../services/astrologerService';
import { useAuth } from '../context/AuthContext';

export default function DocumentVerification() {
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  // State for document uploads
  const [aadharFiles, setAadharFiles] = useState([]);
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [experienceFiles, setExperienceFiles] = useState([]);
  
  // State for existing documents
  const [existingDocuments, setExistingDocuments] = useState(null);
  
  // State for verification status
  const [verificationStatus, setVerificationStatus] = useState('not_submitted');
  
  // State for form submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Fetch verification status and documents
  useEffect(() => {
    const fetchVerificationData = async () => {
      if (!currentUser) return;
      
      try {
        setInitialLoading(true);
        
        const verificationData = await getAstrologerVerificationStatus(currentUser.uid);
        
        // Set verification status
        setVerificationStatus(verificationData.verificationStatus);
        
        // Set existing documents
        if (verificationData.verificationDocuments) {
          setExistingDocuments(verificationData.verificationDocuments);
        }
      } catch (err) {
        console.error('Error fetching verification data:', err);
        setError('Failed to load verification data. Please refresh the page.');
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchVerificationData();
  }, [currentUser]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to submit documents');
      return;
    }
    
    // Validate that Aadhar card is uploaded
    if (aadharFiles.length === 0) {
      setError('Please upload your Aadhar card');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await uploadVerificationDocuments(
        currentUser.uid,
        aadharFiles,
        certificateFiles,
        experienceFiles
      );
      
      // Update local state
      setVerificationStatus('pending');
      setSuccess('Your documents have been submitted for verification');
      
      // Clear file selections
      setAadharFiles([]);
      setCertificateFiles([]);
      setExperienceFiles([]);
      
      // Refresh existing documents
      const verificationData = await getAstrologerVerificationStatus(currentUser.uid);
      if (verificationData.verificationDocuments) {
        setExistingDocuments(verificationData.verificationDocuments);
      }
    } catch (err) {
      console.error('Error uploading documents:', err);
      setError(err.message || 'Failed to upload documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get file icon based on file type
  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) {
      return <PictureAsPdfIcon color="error" />;
    } else if (fileType.includes('image')) {
      return <ImageIcon color="primary" />;
    } else {
      return <InsertDriveFileIcon color="action" />;
    }
  };
  
  // Render verification status message
  const renderVerificationStatus = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your account is verified. You can now provide astrology services.
          </Alert>
        );
      case 'pending':
        return (
          <Alert severity="info" sx={{ mb: 3 }}>
            Your verification is pending. Our team is reviewing your documents.
          </Alert>
        );
      case 'rejected':
        return (
          <Alert severity="error" sx={{ mb: 3 }}>
            Your verification was rejected. Please contact support for more information.
          </Alert>
        );
      default:
        return (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Your account is not verified. Please submit your verification documents.
          </Alert>
        );
    }
  };
  
  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
      <Typography 
        variant="h5" 
        component="h2"
        sx={{
          mb: 3,
          fontFamily: '"Cormorant Garamond", serif',
          color: theme.palette.secondary.dark
        }}
      >
        Document Verification
      </Typography>
      
      {renderVerificationStatus()}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {/* Display existing documents if available */}
      {existingDocuments && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Submitted Documents
          </Typography>
          
          {existingDocuments.aadhar && existingDocuments.aadhar.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Aadhar Card
              </Typography>
              
              <List>
                {existingDocuments.aadhar.map((doc, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getFileIcon(doc.type)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={doc.name}
                      secondary={`Uploaded on ${new Date(existingDocuments.submittedAt.seconds * 1000).toLocaleDateString()}`}
                    />
                    <Link href={doc.url} target="_blank" rel="noopener">
                      View
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {existingDocuments.certificates && existingDocuments.certificates.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Certificates
              </Typography>
              
              <List>
                {existingDocuments.certificates.map((doc, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getFileIcon(doc.type)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={doc.name}
                      secondary={`Uploaded on ${new Date(existingDocuments.submittedAt.seconds * 1000).toLocaleDateString()}`}
                    />
                    <Link href={doc.url} target="_blank" rel="noopener">
                      View
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {existingDocuments.experience && existingDocuments.experience.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Experience Proof
              </Typography>
              
              <List>
                {existingDocuments.experience.map((doc, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getFileIcon(doc.type)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={doc.name}
                      secondary={`Uploaded on ${new Date(existingDocuments.submittedAt.seconds * 1000).toLocaleDateString()}`}
                    />
                    <Link href={doc.url} target="_blank" rel="noopener">
                      View
                    </Link>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          <Divider sx={{ my: 3 }} />
        </Box>
      )}
      
      {/* Show upload form if not verified */}
      {verificationStatus !== 'verified' && (
        <form onSubmit={handleSubmit}>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Please upload the required documents for verification. Your account will be reviewed by our team.
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Aadhar Card (Required)
            </Typography>
            
            <FileUploadSection 
              files={aadharFiles}
              onFilesChange={setAadharFiles}
              multiple={false}
            />
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Astrology Certificates (Optional)
            </Typography>
            
            <FileUploadSection 
              files={certificateFiles}
              onFilesChange={setCertificateFiles}
              multiple={true}
            />
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Experience Proof (Optional)
            </Typography>
            
            <FileUploadSection 
              files={experienceFiles}
              onFilesChange={setExperienceFiles}
              multiple={true}
            />
          </Box>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading || verificationStatus === 'verified'}
              sx={{ 
                py: 1.5,
                px: 4,
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '1.1rem'
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Documents'}
            </Button>
          </Box>
        </form>
      )}
    </Paper>
  );
} 