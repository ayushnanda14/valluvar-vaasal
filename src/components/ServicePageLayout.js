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
import PaymentButton from './PaymentButton';

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
    try {
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
        const fileReferences = [];

        try {
          // Process main files
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Generate appropriate file name based on service type
            let newFileName;
            if (serviceType === 'marriageMatching') {
              newFileName = `Bride_Jathak${files.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
            } else {
              newFileName = `Jathak${files.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
            }
            
            const storageRef = ref(storage, `users/${currentUser.uid}/chats/${conversationRef.id}/files/${newFileName}`);
            const uploadTask = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            
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
              const newFileName = `Groom_Jathak${secondFiles.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
              const storageRef = ref(storage, `users/${currentUser.uid}/chats/${conversationRef.id}/files/${newFileName}`);
              const uploadTask = await uploadBytes(storageRef, file);
              const downloadURL = await getDownloadURL(uploadTask.ref);
              
              fileReferences.push({
                name: newFileName,
                originalName: file.name,
                type: file.type,
                size: file.size,
                url: downloadURL,
                category: dualUploadLabels[1],
                uploadedBy: currentUser.uid,
                uploadedAt: serverTimestamp()
              });
            }
          }

          // Store file references in a subcollection of the chat
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
        } catch (err) {
          console.error('Error uploading files:', err);
          setError('There was an error uploading your files. Please try again.');
          return;
        }
      }

      // Redirect to success page after payment
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
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                      <Box
                        sx={{
                          flex: { xs: '1 1 100%', md: '1 1 75%' },
                          minHeight: { md: '500px' }
                        }}
                      >
                        <Paper
                          elevation={2}
                          sx={{
                            p: 3,
                            borderRadius: '8px',
                            backgroundColor: theme.palette.background.paper,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              mb: 2,
                              color: theme.palette.primary.main,
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                          >
                            Available Astrologers
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              overflowX: 'auto',
                              gap: 2,
                              pb: 2,
                              flex: '1 1 auto',
                              scrollbarWidth: 'thin',
                              '&::-webkit-scrollbar': {
                                height: '8px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: 'rgba(0,0,0,0.1)',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '4px',
                                '&:hover': {
                                  background: 'rgba(0,0,0,0.3)',
                                },
                              },
                            }}
                          >
                          {astrologers.map(astrologer => (
                              <Box
                                key={astrologer.id}
                                sx={{
                                  minWidth: { xs: '280px', sm: '320px' },
                                  flexShrink: 0,
                                }}
                              >
                                <Card
                                  sx={{
                                    height: '100%',
                                  border: selectedAstrologers.some(a => a.id === astrologer.id)
                                    ? `2px solid ${theme.palette.primary.main}`
                                      : 'none',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                      transform: 'translateY(-4px)',
                                      boxShadow: theme.shadows[4],
                                    }
                                }}
                              >
                                <CardActionArea
                                  onClick={() => handleAstrologerSelect(astrologer)}
                                    sx={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'stretch',
                                      height: '100%',
                                      padding: 0,
                                      overflow: 'hidden'
                                    }}
                                >
                                  <CardMedia
                                    component="img"
                                      height="200px"
                                    image={astrologer.photoURL || '/images/default-avatar.png'}
                                    alt={astrologer.displayName}
                                      sx={{ 
                                        objectFit: 'cover',
                                        margin: 0,
                                        display: 'block'
                                      }}
                                  />
                                    <CardContent 
                                      sx={{ 
                                        padding: 2, 
                                        paddingBottom: '16px !important', // Override default padding
                                        display: 'flex',
                                        flexDirection: 'column'
                                      }}
                                    >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography
                                          gutterBottom
                                          variant="h6"
                                          component="div"
                                          sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                        >
                                        {astrologer.displayName}
                                      </Typography>
                                      <Checkbox
                                        checked={selectedAstrologers.some(a => a.id === astrologer.id)}
                                        color="primary"
                                      />
                                    </Box>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1, fontFamily: '"Cormorant Garamond", serif' }}
                                      >
                                        {astrologer.services.map(service => service.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')).join(', ') || 'General Astrology'}
                                    </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.primary"
                                        sx={{
                                          fontWeight: 'bold',
                                          color: theme.palette.primary.main,
                                          fontFamily: '"Cormorant Garamond", serif'
                                        }}
                                      >
                                      ₹{astrologer.serviceCharges?.[serviceType] || 500}
                                    </Typography>
                                  </CardContent>
                                </CardActionArea>
                              </Card>
                              </Box>
                          ))}
                          </Box>
                        </Paper>
                      </Box>

                      <Box
                        sx={{
                          flex: { xs: '1 1 100%', md: '1 1 25%' },
                          minHeight: { md: '500px' }
                        }}
                      >
                        <Paper
                          elevation={2}
                          sx={{
                            p: 3,
                            borderRadius: '8px',
                            position: 'sticky',
                            top: '20px',
                            backgroundColor: theme.palette.background.paper,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              mb: 2,
                              color: theme.palette.primary.main,
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                          >
                            Selected Astrologers
                          </Typography>

                          {selectedAstrologers.length === 0 ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontFamily: '"Cormorant Garamond", serif',
                                flex: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              No astrologers selected yet
                            </Typography>
                          ) : (
                            <>
                              <Box sx={{ flex: '1', overflowY: 'auto' }}>
                              <List>
                                {selectedAstrologers.map(astrologer => (
                                    <ListItem
                                      key={astrologer.id}
                                      disablePadding
                                      sx={{
                                        mb: 1,
                                        p: 1,
                                        borderRadius: '4px',
                                        backgroundColor: theme.palette.background.default
                                      }}
                                    >
                                    <ListItemAvatar>
                                      <Avatar
                                        src={astrologer.photoURL || '/images/default-avatar.png'}
                                        alt={astrologer.displayName}
                                      />
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                          <Typography sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                                            {astrologer.displayName}
                                          </Typography>
                                        }
                                        secondary={
                                          <Typography
                                            sx={{
                                              color: theme.palette.primary.main,
                                              fontFamily: '"Cormorant Garamond", serif'
                                            }}
                                          >
                                            ₹{astrologer.serviceCharges?.[serviceType] || 0}
                                          </Typography>
                                        }
                                    />
                                  </ListItem>
                                ))}
                              </List>
                              </Box>

                              <Divider sx={{ my: 2 }} />

                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: 'bold',
                                    fontFamily: '"Cormorant Garamond", serif'
                                  }}
                                >
                                  Total:
                                </Typography>
                                <Typography
                                  variant="h6"
                                  sx={{
                                    color: theme.palette.primary.main,
                                    fontFamily: '"Cormorant Garamond", serif'
                                  }}
                                >
                                  ₹{calculateTotal()}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Paper>
                      </Box>
                    </Box>
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

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    <Box 
                      sx={{ 
                        flex: { xs: '1 1 100%', md: '1 1 75%' },
                        minHeight: { md: '500px' }
                      }}
                    >
                      <Paper
                        elevation={2}
                        sx={{
                          p: 3,
                          borderRadius: '8px',
                          backgroundColor: theme.palette.background.paper,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 2,
                            color: theme.palette.primary.main,
                            fontFamily: '"Cormorant Garamond", serif'
                          }}
                        >
                          Payment Method
                        </Typography>
                        
                        <PaymentButton
                          amount={calculateTotal() + Math.round(calculateTotal() * 0.18)} // Total with GST
                          description={`Payment for ${SERVICE_TYPES[serviceType]} service`}
                          onSuccess={handlePayment}
                          onError={(error) => setError(error)}
                        />
                      </Paper>
                    </Box>

                    <Box 
                      sx={{ 
                        flex: { xs: '1 1 100%', md: '1 1 25%' },
                        minHeight: { md: '500px' }
                      }}
                    >
                      <Paper
                        elevation={2}
                        sx={{
                          p: 3,
                          borderRadius: '8px',
                          position: 'sticky',
                          top: '20px',
                          backgroundColor: theme.palette.background.paper,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            mb: 2, 
                            color: theme.palette.primary.main,
                            fontFamily: '"Cormorant Garamond", serif'
                          }}
                        >
                          Order Summary
                        </Typography>
                        <Box sx={{ flex: '1', overflowY: 'auto' }}>
                          <List>
                            {selectedAstrologers.map(astrologer => (
                              <ListItem 
                                key={astrologer.id} 
                                disablePadding 
                                sx={{ 
                                  mb: 1,
                                  p: 1,
                                  borderRadius: '4px',
                                  backgroundColor: theme.palette.background.default
                                }}
                              >
                                <ListItemAvatar>
                                  <Avatar
                                    src={astrologer.photoURL || '/images/default-avatar.png'}
                                    alt={astrologer.displayName}
                                  />
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                                      {astrologer.displayName}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography 
                                      sx={{ 
                                        color: theme.palette.primary.main,
                                        fontFamily: '"Cormorant Garamond", serif'
                                      }}
                                    >
                                      ₹{astrologer.serviceCharges?.[serviceType] || 0}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 'bold',
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                          >
                            Subtotal:
                          </Typography>
                          <Typography 
                            variant="body1"
                            sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                          >
                            ₹{calculateTotal()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 'bold',
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                          >
                            GST (18%):
                          </Typography>
                          <Typography 
                            variant="body1"
                            sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                          >
                            ₹{Math.round(calculateTotal() * 0.18)}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 'bold',
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                          >
                            Total:
                          </Typography>
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              color: theme.palette.primary.main,
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                          >
                            ₹{calculateTotal() + Math.round(calculateTotal() * 0.18)}
                          </Typography>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>

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