import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db, storage } from '../firebase/firebaseConfig';
import FileUploadSection from './FileUploadSection';
import PaymentSummary from './PaymentSummary';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { SERVICE_TYPES } from '@/utils/constants';

export default function ServicePageLayout({
  title,
  description,
  serviceType,
  multipleUploads = false,
  dualUpload = false,
  dualUploadLabels = ['First Person', 'Second Person']
}) {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();

  const [astrologers, setAstrologers] = useState([]);
  const [selectedAstrologers, setSelectedAstrologers] = useState([]);
  const [files, setFiles] = useState([]);
  const [secondFiles, setSecondFiles] = useState([]); // For dual upload (marriage matching)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Upload, 2: Select Astrologers, 3: Payment

  // Fetch astrologers on component mount
  useEffect(() => {
    const fetchAstrologers = async () => {
      try {
        setLoading(true);
        const astrologersQuery = query(
          collection(db, 'users'),
          // where('roles', 'array-contains', 'astrologer'),
          where('services', 'array-contains', serviceType)
        );

        const querySnapshot = await getDocs(astrologersQuery);
        const astrologersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setAstrologers(astrologersList);
      } catch (err) {
        console.error('Error fetching astrologers:', err);
        setError('Failed to load astrologers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAstrologers();
  }, []);

  // Check if user is logged in
  useEffect(() => {
    if (!currentUser) {
      router.push(`/login?redirect=${router.pathname}`);
    }
  }, [currentUser, router]);

  const handleAstrologerSelect = (astrologer) => {
    setSelectedAstrologers(prev => {
      const isSelected = prev.some(a => a.id === astrologer.id);

      if (isSelected) {
        return prev.filter(a => a.id !== astrologer.id);
      } else {
        return [...prev, astrologer];
      }
    });
  };

  const handleFilesChange = (newFiles) => {
    setFiles(newFiles);
  };

  const handleSecondFilesChange = (newFiles) => {
    setSecondFiles(newFiles);
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Validate files are uploaded
      if (files.length === 0) {
        setError('Please upload at least one file');
        return;
      }

      if (dualUpload && secondFiles.length === 0) {
        setError(`Please upload at least one file for ${dualUploadLabels[1]}`);
        return;
      }

      setError('');
      setStep(2);
    } else if (step === 2) {
      // Validate astrologers are selected
      if (selectedAstrologers.length === 0) {
        setError('Please select at least one astrologer');
        return;
      }

      setError('');
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    setStep(prev => Math.max(1, prev - 1));
    setError('');
  };

  const calculateTotal = () => {
    return selectedAstrologers.reduce((total, astrologer) => {
      return total + (astrologer.serviceCharges?.[serviceType] || 0);
    }, 0);
  };

  const handlePayment = async () => {
    // This will be implemented with the payment gateway
    try {
      // Create a new service request in Firestore

      // Create a new service request in Firestore
      const serviceRequestRef = await addDoc(collection(db, 'serviceRequests'), {
        clientId: currentUser.uid,
        serviceType: serviceType,
        astrologerIds: selectedAstrologers.map(astrologer => astrologer.id),
        status: 'pending',
        totalAmount: calculateTotal(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create conversation threads with each selected astrologer
      for (const astrologer of selectedAstrologers) {
        const conversationRef = await addDoc(collection(db, 'chats'), {
          participants: [currentUser.uid, astrologer.id],
          serviceRequestId: serviceRequestRef.id,
          serviceType: serviceType,
          lastMessage: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add initial system message to the conversation
        await addDoc(collection(db, 'chats', conversationRef.id, 'messages'), {
          senderId: 'system',
          text: `Service request for ${SERVICE_TYPES[serviceType]} has been created. The astrologer will review your details and respond shortly.`,
          timestamp: serverTimestamp(),
          read: false
        });

        // Upload file references to the chat
        // This allows us to:
        // 1. Associate uploaded documents with specific chats
        // 2. Support multiple document uploads over time
        // 3. Keep track of document metadata and access permissions

        // For the initial files uploaded by the client
        const fileReferences = [];

        // Process main files
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Generate appropriate file name based on service type
          let newFileName;
          if (serviceType === 'marriageMatching') {
            newFileName = `Bride_Jathak${files.length > 1 ? `_${i+1}` : ''}.${file.name.split('.').pop()}`;
          } else {
            newFileName = `Jathak${files.length > 1 ? `_${i+1}` : ''}.${file.name.split('.').pop()}`;
          }
          
          // Create a blob with the same content but a new name
          const renamedFile = new File([file], newFileName, { type: file.type });
          
          // Create a reference in Firebase Storage with a path that includes the chat ID
          const storageRef = ref(storage, `chats/${conversationRef.id}/files/${newFileName}`);
          
          // Upload the file to Firebase Storage
          const uploadTask = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);
          
          // Add file metadata to the array
          fileReferences.push({
            name: newFileName,
            originalName: file.name,
            type: file.type,
            size: file.size,
            url: downloadURL,
            uploadedBy: currentUser.uid,
            uploadedAt: serverTimestamp()
          });
        }

        // Process secondary files if dual upload is enabled
        if (dualUpload && secondFiles.length > 0) {
          for (let i = 0; i < secondFiles.length; i++) {
            const file = secondFiles[i];
            
            // For marriage matching, second set is for Groom
            const newFileName = `Groom_Jathak${secondFiles.length > 1 ? `_${i+1}` : ''}.${file.name.split('.').pop()}`;
            
            // Create a blob with the same content but a new name
            const renamedFile = new File([file], newFileName, { type: file.type });
            
            const storageRef = ref(storage, `chats/${conversationRef.id}/files/${newFileName}`);
            const uploadTask = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            
            fileReferences.push({
              name: newFileName,
              originalName: file.name,
              type: file.type,
              size: file.size,
              url: downloadURL,
              category: dualUploadLabels[1], // Add category to distinguish second set of files
              uploadedBy: currentUser.uid,
              uploadedAt: serverTimestamp()
            });
          }
        }

        // Store file references in a subcollection of the chat
        // This allows for easy querying of files associated with a chat
        for (const fileRef of fileReferences) {
          await addDoc(collection(db, 'chats', conversationRef.id, 'files'), fileRef);
        }

        // Add a system message about the uploaded files
        await addDoc(collection(db, 'chats', conversationRef.id, 'messages'), {
          senderId: 'system',
          text: `${currentUser.displayName} has uploaded ${fileReferences.length} document(s) for review.`,
          timestamp: serverTimestamp(),
          read: false,
          fileReferences: fileReferences.map(f => ({ 
            name: f.name, 
            url: f.url,
            type: f.type
          }))
        });

        /* 
        Future considerations for chat structure:
        1. We're using a 'chats' collection with subcollections for 'messages' and 'files'
        2. This structure supports:
           - Adding more documents throughout the conversation
           - Tracking which user uploaded which files
           - Associating files directly with specific chats
           - Maintaining file metadata for display in the UI
        3. For the chat UI implementation, we'll need to:
           - Display files in the chat timeline
           - Allow downloading/viewing of files
           - Support uploading new files within an ongoing chat
           - Show file previews where possible
        4. Security rules should ensure:
           - Only participants can access chat files
           - Files are properly secured in Storage
           - Metadata doesn't contain sensitive information
        */
      }
      // Upload files to Firebase Storage
      // Create conversation threads with selected astrologers
      // Redirect to payment gateway

      // For now, just redirect to a success page
      router.push('/service-success');
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
    }
  };

  if (!currentUser) {
    return <CircularProgress />;
  }

  return (
    <>
      <Head>
        <title>{title} | Valluvar Vaasal</title>
        <meta name="description" content={description} />
      </Head>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <Box
          sx={{
            py: { xs: 4, md: 6 },
            backgroundColor: theme.palette.background.default,
            flexGrow: 1
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h3"
              component="h1"
              align="center"
              sx={{
                mb: 4,
                fontFamily: '"Cinzel", serif',
                color: theme.palette.secondary.dark
              }}
            >
              {title}
            </Typography>

            <Paper
              elevation={3}
              sx={{
                p: { xs: 2, md: 4 },
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.95)'
              }}
            >
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Step indicator */}
              <Box sx={{ mb: 4 }}>
                <Grid container spacing={2} justifyContent="center">
                  <Grid item xs={4}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        color: step >= 1 ? theme.palette.primary.main : 'text.secondary',
                        fontWeight: step === 1 ? 'bold' : 'normal'
                      }}
                    >
                      <Typography variant="body1">Step 1</Typography>
                      <Typography variant="body2">Upload Files</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        color: step >= 2 ? theme.palette.primary.main : 'text.secondary',
                        fontWeight: step === 2 ? 'bold' : 'normal'
                      }}
                    >
                      <Typography variant="body1">Step 2</Typography>
                      <Typography variant="body2">Select Astrologers</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        color: step >= 3 ? theme.palette.primary.main : 'text.secondary',
                        fontWeight: step === 3 ? 'bold' : 'normal'
                      }}
                    >
                      <Typography variant="body1">Step 3</Typography>
                      <Typography variant="body2">Payment</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Step 1: File Upload */}
              {step === 1 && (
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      mb: 3,
                      fontFamily: '"Cormorant Garamond", serif',
                      color: theme.palette.secondary.dark
                    }}
                  >
                    Upload Your Jathak
                  </Typography>

                  {dualUpload ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          {dualUploadLabels[0]} Jathak
                        </Typography>
                        <FileUploadSection
                          files={files}
                          onFilesChange={handleFilesChange}
                          multiple={multipleUploads}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          {dualUploadLabels[1]} Jathak
                        </Typography>
                        <FileUploadSection
                          files={secondFiles}
                          onFilesChange={handleSecondFilesChange}
                          multiple={multipleUploads}
                        />
                      </Grid>
                    </Grid>
                  ) : (
                    <FileUploadSection
                      files={files}
                      onFilesChange={handleFilesChange}
                      multiple={multipleUploads}
                    />
                  )}

                  <Box sx={{ mt: 4, textAlign: 'right' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleNextStep}
                      sx={{
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Next: Select Astrologers
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 2: Select Astrologers */}
              {step === 2 && (
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      mb: 3,
                      fontFamily: '"Cormorant Garamond", serif',
                      color: theme.palette.secondary.dark
                    }}
                  >
                    Select Astrologers
                  </Typography>

                  {loading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={8}>
                        <Grid container spacing={2}>
                          {astrologers.map(astrologer => (
                            <Grid item xs={12} sm={6} md={4} key={astrologer.id}>
                              <Card
                                sx={{
                                  height: '100%',
                                  border: selectedAstrologers.some(a => a.id === astrologer.id)
                                    ? `2px solid ${theme.palette.primary.main}`
                                    : 'none'
                                }}
                              >
                                <CardActionArea
                                  onClick={() => handleAstrologerSelect(astrologer)}
                                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                                >
                                  <CardMedia
                                    component="img"
                                    height="140"
                                    image={astrologer.photoURL || '/images/default-avatar.png'}
                                    alt={astrologer.displayName}
                                  />
                                  <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography gutterBottom variant="h6" component="div">
                                        {astrologer.displayName}
                                      </Typography>
                                      <Checkbox
                                        checked={selectedAstrologers.some(a => a.id === astrologer.id)}
                                        color="primary"
                                      />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      {astrologer.specialization || 'General Astrology'}
                                    </Typography>
                                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'bold' }}>
                                      ₹{astrologer.serviceCharges?.[serviceType] || 500}
                                    </Typography>
                                  </CardContent>
                                </CardActionArea>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Paper
                          elevation={2}
                          sx={{
                            p: 3,
                            borderRadius: '8px',
                            position: 'sticky',
                            top: '20px'
                          }}
                        >
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            Selected Astrologers
                          </Typography>

                          {selectedAstrologers.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              No astrologers selected yet
                            </Typography>
                          ) : (
                            <>
                              <List>
                                {selectedAstrologers.map(astrologer => (
                                  <ListItem key={astrologer.id} disablePadding sx={{ mb: 1 }}>
                                    <ListItemAvatar>
                                      <Avatar
                                        src={astrologer.photoURL || '/images/default-avatar.png'}
                                        alt={astrologer.displayName}
                                      />
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={astrologer.displayName}
                                      secondary={`₹${astrologer.serviceCharges?.[serviceType] || 0}`}
                                    />
                                  </ListItem>
                                ))}
                              </List>

                              <Divider sx={{ my: 2 }} />

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body1">Total:</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                  ₹{calculateTotal()}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  )}

                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={handlePreviousStep}
                      sx={{
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Back
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleNextStep}
                      disabled={selectedAstrologers.length === 0}
                      sx={{
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Next: Payment
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      mb: 3,
                      fontFamily: '"Cormorant Garamond", serif',
                      color: theme.palette.secondary.dark
                    }}
                  >
                    Payment
                  </Typography>

                  <PaymentSummary
                    selectedAstrologers={selectedAstrologers}
                    serviceType={serviceType}
                    total={calculateTotal()}
                    onPaymentComplete={handlePayment}
                  />

                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={handlePreviousStep}
                      sx={{
                        py: 1.5,
                        px: 4,
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Back
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Container>
        </Box>
      </Box>
    </>
  );
} 