import React, { useState, useEffect, useMemo } from 'react';
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
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip as MuiChip,
  Snackbar,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  useMediaQuery
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db, storage } from '../firebase/firebaseConfig';
import FileUploadSection from './FileUploadSection';
import JathakWritingForm from './JathakWritingForm';
import JathakPredictionForm from './JathakPredictionForm';
import PaymentSummary from './PaymentSummary';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { SERVICE_TYPES } from '@/utils/constants';
import PaymentButton from './PaymentButton';
import { useTranslation } from 'react-i18next';
import { createPaymentRecords } from '../services/createPaymentRecords';
import { formatLocalDate, formatLocalTime } from '@/utils/utils';

// Define the list of districts (should match the signup list)
const TAMIL_NADU_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
  'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet',
  'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi (Tuticorin)',
  'Tiruchirappalli (Trichy)', 'Tirunelveli', 'Tirupathur', 'Tiruppur',
  'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram',
  'Virudhunagar'
];

export default function ServicePageLayout({
  title,
  description,
  serviceType,
  multipleUploads = false,
  dualUpload = false,
  dualUploadLabels
}) {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, loading: authLoading, authInitialized } = useAuth();
  const { t, i18n } = useTranslation('common');
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Categorisation based on example price ranges
  const deriveCategory = (amount) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) amount = 0;
    if (amount <= 500) return { key: 'pothigai', label: t('astrologerCategories.pothigaiLabel'), range: t('astrologerCategories.pothigaiRange') };
    if (amount <= 1000) return { key: 'ganga', label: t('astrologerCategories.gangaLabel'), range: t('astrologerCategories.gangaRange') };
    return { key: 'himalaya', label: t('astrologerCategories.himalayaLabel'), range: t('astrologerCategories.himalayaRange') };
  };

  const getPublicAstrologerLabel = (astrologer) => {
    const amount = astrologer?.serviceCharges?.[serviceType] || 0;
    const cat = astrologer?._category || deriveCategory(amount);
    const years = astrologer?.experience ? `${astrologer.experience} yrs` : t('services.generalAstrology', 'General Astrology');
    return `${cat.label} • ${years}`;
  };

  // Set default dualUploadLabels if not provided
  const defaultDualUploadLabels = dualUploadLabels || [t('uploadLabels.firstPerson'), t('uploadLabels.secondPerson')];

  const localStorageKey = `servicePageProgress_${serviceType}`;

  const [availableDistricts, setAvailableDistricts] = useState(new Set());
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtLoading, setDistrictLoading] = useState(true);

  const [astrologers, setAstrologers] = useState([]);
  const [selectedAstrologers, setSelectedAstrologers] = useState([]);
  const [files, setFiles] = useState([]);
  const [secondFiles, setSecondFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [isPaymentFlowActiveByButton, setIsPaymentFlowActiveByButton] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'error' });
  const [jathakWritingOption, setJathakWritingOption] = useState('baby');
  const [uploadSubstep, setUploadSubstep] = useState(1);
  const [jathakFormData, setJathakFormData] = useState({
    name: '',
    birthPlace: '',
    birthDate: '',
    birthTime: '',
    additionalNotes: ''
  });
  const [jathakFormErrors, setJathakFormErrors] = useState({});
  const [predictionFormData, setPredictionFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    zodiac: ''
  });
  const [predictionFormErrors, setPredictionFormErrors] = useState({});

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      const savedStateRaw = localStorage.getItem(localStorageKey);
      if (savedStateRaw) {
        try {
          const savedState = JSON.parse(savedStateRaw);

          // Check if the saved state belongs to the current user
          if (savedState.userId && savedState.userId === currentUser.uid) {
            // Always start from step 1 (file upload) after refresh
            setStep(1);

            // Restore district and astrologer selections silently
            if (savedState.selectedDistrict) setSelectedDistrict(savedState.selectedDistrict);
            if (savedState.selectedAstrologers) setSelectedAstrologers(savedState.selectedAstrologers);

            // Restore jathak-related form data if present (for prediction/writing flows)
            if (savedState.jathakFormData) setJathakFormData(savedState.jathakFormData);
            if (savedState.predictionFormData) setPredictionFormData(savedState.predictionFormData);
            if (typeof savedState.jathakWritingOption === 'string') setJathakWritingOption(savedState.jathakWritingOption);

            // Show message only if user had meaningful previous selections (both district and astrologers)
            if (savedState.selectedDistrict && savedState.selectedAstrologers && savedState.selectedAstrologers.length > 0) {
              setError(t('servicePage.errors.sessionRestored', 'Your previous selections have been saved. Please re-upload your files to continue.'));
            }

            // Clear files state as File objects cannot be persisted directly
            setFiles([]);
            setSecondFiles([]);
          } else {
            // Stored data is for a different user or has no userId, clear it and start fresh
            localStorage.removeItem(localStorageKey);
            // Reset to default step and selections for a truly fresh start
            setStep(1);
            setSelectedDistrict('');
            setSelectedAstrologers([]);
            setFiles([]);
            setSecondFiles([]);
          }
        } catch (e) {
          console.error("Failed to parse saved state from localStorage", e);
          localStorage.removeItem(localStorageKey); // Clear corrupted data
          // Reset to default state after corruption
          setStep(1);
          setSelectedDistrict('');
          setSelectedAstrologers([]);
          setFiles([]);
          setSecondFiles([]);
        }
      } else {
        // No saved state, ensure defaults (though useState already does this)
        setStep(1);
        setSelectedDistrict('');
        setSelectedAstrologers([]);
      }
    }
  }, [serviceType, currentUser, localStorageKey, t]);

  // Save state to localStorage whenever relevant parts change
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      const stateToSave = {
        userId: currentUser.uid, // Add userId here
        step,
        selectedDistrict,
        selectedAstrologers,
        filesUploaded: files.length > 0,
        secondFilesUploaded: secondFiles.length > 0,
        // Persist form data for restoration in Jathak Prediction/Writing flows
        jathakFormData,
        predictionFormData,
        jathakWritingOption
      };
      localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
    }
  }, [step, selectedDistrict, selectedAstrologers, files, secondFiles, jathakFormData, predictionFormData, jathakWritingOption, serviceType, currentUser, localStorageKey]);

  // Fetch available districts based on service type
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!serviceType) return;
      setDistrictLoading(true);
      try {
        // We can only have one array-contains query per query, so we'll need to do this in two steps
        // First, get all astrologers in Tamil Nadu
        const astrologersQuery = query(
          collection(db, 'users'),
          where('roles', 'array-contains', 'astrologer'),
          where('state', '==', 'Tamil Nadu')
        );

        // Then filter the results for those who offer the specific service
        const astrologersSnapshot = await getDocs(astrologersQuery);
        const filteredDocs = astrologersSnapshot.docs.filter(doc => {
          const data = doc.data();
          console.log('data', data.services, serviceType);
          return data.services && data.services.includes(serviceType);
        });

        // Extract districts from the filtered results
        const districts = new Set();
        filteredDocs.forEach((doc) => {
          const data = doc.data();
          if (data.district) {
            districts.add(data.district);
          }
        });
        console.log('districts', districts);
        setAvailableDistricts(districts);
      } catch (err) {
        console.error('Error fetching available districts:', err);
        setError(t('servicePage.errors.loadDistricts'));
      } finally {
        setDistrictLoading(false);
      }
    };
    fetchDistricts();
  }, [serviceType, t]);

  // Fetch astrologers based on selected district
  useEffect(() => {
    const fetchAstrologersByDistrict = async () => {
      if (!selectedDistrict || step !== 2) return;

      setLoading(true);
      setSelectedAstrologers([]);
      try {
        // Broaden the query: Filter by role, state, and district only
        const astrologersQuery = query(
          collection(db, 'users'),
          where('roles', 'array-contains', 'astrologer'),
          where('state', '==', 'Tamil Nadu'),
          where('district', '==', selectedDistrict)
          // Remove: where('services', 'array-contains', serviceType)
        );

        const querySnapshot = await getDocs(astrologersQuery);

        // Client-side filtering for the specific service
        const filteredAstrologers = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(astrologer => astrologer.services && astrologer.services.includes(serviceType))
          .map(astrologer => {
            const amount = astrologer.serviceCharges?.[serviceType] || 0;
            return { ...astrologer, _category: deriveCategory(amount) };
          });

        setAstrologers(filteredAstrologers); // Set state with the filtered list
      } catch (err) {
        console.error('Error fetching astrologers by district:', err);
        setError(t('servicePage.errors.loadAstrologers'));
      } finally {
        setLoading(false);
      }
    };

    fetchAstrologersByDistrict();
  }, [selectedDistrict, serviceType, step, t]);

  // Check if user is logged in (wait until auth is initialized)
  useEffect(() => {
    if (!authInitialized) return; // wait for auth to finish restoring session
    if (!currentUser) {
      const targetPath = router.asPath || router.pathname;
      const encoded = encodeURIComponent(targetPath);
      router.push(`/services/prelogin?service=${serviceType}&redirect=${encoded}`);
    }
  }, [authInitialized, currentUser, router, serviceType]);

  // Auto-bypass payment for demo users on reaching step 3
  const [demoPaymentTriggered, setDemoPaymentTriggered] = useState(false);
  useEffect(() => {
    if (step === 3 && currentUser?.isDemoUser && !demoPaymentTriggered) {
      setDemoPaymentTriggered(true);
      handleDemoPayment();
    }
  }, [step, currentUser, demoPaymentTriggered]);

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

  const validateJathakForm = () => {
    const errors = {};
    if (!jathakFormData.name?.trim()) {
      errors.name = t('jathakWriting.form.errors.nameRequired', 'Name is required');
    }
    if (!jathakFormData.birthPlace?.trim()) {
      errors.birthPlace = t('jathakWriting.form.errors.birthPlaceRequired', 'Birth place is required');
    }
    if (!jathakFormData.birthDate) {
      errors.birthDate = t('jathakWriting.form.errors.birthDateRequired', 'Birth date is required');
    }
    if (!jathakFormData.birthTime) {
      errors.birthTime = t('jathakWriting.form.errors.birthTimeRequired', 'Birth time is required');
    }
    return errors;
  };

  const validatePredictionForm = () => {
    const errors = {};
    if (!predictionFormData.name?.trim()) {
      errors.name = t('jathakPrediction.form.errors.nameRequired', 'Name is required');
    }
    if (!predictionFormData.birthDate) {
      errors.birthDate = t('jathakPrediction.form.errors.birthDateRequired', 'Date of birth is required');
    }
    return errors;
  };

  const handleNextStep = () => {
    setError('');
    console.log('serviceType', serviceType, step, uploadSubstep, files, secondFiles);
    if (step === 1) {
      // For jathak writing service with baby option, validate form instead of files
      if (serviceType === 'jathakWriting' && jathakWritingOption === 'baby') {
        const formErrors = validateJathakForm();
        if (Object.keys(formErrors).length > 0) {
          setJathakFormErrors(formErrors);
          setToast({ open: true, message: t('jathakWriting.form.errors.pleaseComplete'), severity: 'error' });
          return;
        }
        setJathakFormErrors({});
      } else {
        // For jathak prediction, validate minimal form before files
        if (serviceType === 'jathakPrediction') {
          const formErrors = validatePredictionForm();
          if (Object.keys(formErrors).length > 0) {
            setPredictionFormErrors(formErrors);
            setToast({ open: true, message: t('jathakPrediction.form.errors.birthDateRequired'), severity: 'error' });
            return;
          }
          setPredictionFormErrors({});
        }
        // Allow proceeding on mobile dual upload once both files are present

        // For prediction, document upload is optional
        if (serviceType !== 'jathakPrediction') {
          if (files.length === 0 || (dualUpload && secondFiles.length === 0)) {
            const errorMessage = dualUpload ? t('servicePage.errors.uploadDual', { label1: defaultDualUploadLabels[0], label2: defaultDualUploadLabels[1] }) : t('servicePage.errors.uploadSingle');
            setToast({ open: true, message: errorMessage, severity: 'error' });
            return;
          }
        }
      }

      // Check if we have saved district and astrologer selections
      if (selectedDistrict && selectedAstrologers.length > 0) {
        // Skip directly to payment step
        setStep(3);
      } else {
        // Normal flow - go to district selection
        setStep(1.5);
      }
    } else if (step === 1.5) {
      if (!selectedDistrict) {
        setToast({ open: true, message: t('servicePage.errors.selectDistrict'), severity: 'error' });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedAstrologers.length === 0) {
        setToast({ open: true, message: t('servicePage.errors.selectAstrologer'), severity: 'error' });
        return;
      }
      setStep(3);
    }

    // Scroll to top when moving to next step
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handlePreviousStep = () => {
    setError('');
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1.5);
    else if (step === 1.5) setStep(1);

    // Scroll to top when moving to previous step
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const calculateTotal = () => {
    return selectedAstrologers.reduce((total, astrologer) => {
      return total + (astrologer.serviceCharges?.[serviceType] || 0);
    }, 0);
  };

  const handlePayment = async (paymentResponse) => {
    if (!currentUser || !paymentResponse || !paymentResponse.razorpay_payment_id) {
      console.error("Payment handling error: Missing current user or payment response details.");
      setError(t('servicePage.errors.paymentFailed'));
      return;
    }

    try {
      // Create a new service request in Firestore
      const serviceRequestData = {
        clientId: currentUser.uid,
        clientName: currentUser.displayName || 'Anonymous',
        clientEmail: currentUser.email,
        serviceType: serviceType,
        astrologerIds: selectedAstrologers.map(astrologer => astrologer.id),
        status: 'payment_successful', // Initial status after successful payment
        totalAmount: calculateTotal(), // Original amount before any taxes/fees from your calc
        // Amount may not be present on some gateways or older callbacks; compute safely
        paidAmount: typeof paymentResponse.amount === 'number'
          ? Math.round(paymentResponse.amount) / 100
          : (calculateTotal() + Math.round(calculateTotal() * 0.18)),
        currency: 'INR', // Assuming INR, or take from paymentResponse.currency if available
        razorpay_payment_id: paymentResponse.razorpay_payment_id, // Storing payment ID
        filesUploaded: files.length > 0 || (dualUpload && secondFiles.length > 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        selectedDistrict: selectedDistrict, // Storing selected district
        isDemoUser: currentUser.isDemoUser || false, // Add demo user flag
        // Add jathak writing form data if applicable
        ...(serviceType === 'jathakWriting' && jathakWritingOption === 'baby' && {
          jathakWritingData: {
            name: jathakFormData.name,
            birthPlace: jathakFormData.birthPlace,
            birthDate: jathakFormData.birthDate,
            birthTime: jathakFormData.birthTime,
            additionalNotes: jathakFormData.additionalNotes
          }
        })
      };

      const serviceRequestRef = await addDoc(collection(db, 'serviceRequests'), serviceRequestData);

      // Create payment records for each astrologer
      await createPaymentRecords({
        selectedAstrologers,
        currentUser,
        serviceType,
        paymentResponse,
        serviceRequestRef
      });

      // Create conversation threads with each selected astrologer
      const createdChatIds = [];
      const messageText = `Service request for ${SERVICE_TYPES[serviceType]} has been created. The astrologer will review your details and respond shortly.`;
      for (const astrologer of selectedAstrologers) {
        const conversationRef = await addDoc(collection(db, 'chats'), {
          participants: [currentUser.uid, astrologer.id],
          clientId: currentUser.uid,
          clientName: currentUser.displayName || 'Client',
          astrologerId: astrologer.id,
          astrologerName: astrologer.displayName || 'Astrologer',
          participantNames: {
            [currentUser.uid]: currentUser.displayName || 'Client',
            [astrologer.id]: astrologer.displayName || 'Astrologer'
          },
          participantAvatars: {
            [currentUser.uid]: currentUser.photoURL || null,
            [astrologer.id]: astrologer.photoURL || null
          },
          serviceRequestId: serviceRequestRef.id,
          serviceType: serviceType,
          razorpay_payment_id: paymentResponse.razorpay_payment_id, // Storing payment ID in chat doc
          lastMessage: {
            text: messageText,
            timestamp: serverTimestamp(),
            senderId: 'system'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        createdChatIds.push(conversationRef.id);

        // Add initial system message to the conversation
        await addDoc(collection(db, 'chats', conversationRef.id, 'messages'), {
          senderId: 'system',
          text: messageText,
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
              newFileName = `${t('uploadLabels.firstPerson')}_${t('uploadLabels.jathak')}${files.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
            } else {
              newFileName = `${t('uploadLabels.jathak')}${files.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
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
              const newFileName = `${t('uploadLabels.secondPerson')}_${t('uploadLabels.jathak')}${secondFiles.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
              const storageRef = ref(storage, `users/${currentUser.uid}/chats/${conversationRef.id}/files/${newFileName}`);
              const uploadTask = await uploadBytes(storageRef, file);
              const downloadURL = await getDownloadURL(uploadTask.ref);

              fileReferences.push({
                name: newFileName,
                originalName: file.name,
                type: file.type,
                size: file.size,
                url: downloadURL,
                category: defaultDualUploadLabels[1],
                uploadedBy: currentUser.uid,
                uploadedAt: serverTimestamp()
              });
            }
          }

          // Store file references in a subcollection of the chat
          for (const fileRef of fileReferences) {
            await addDoc(collection(db, 'chats', conversationRef.id, 'files'), fileRef);
          }

          // Add a system message about the uploaded files or form data
          let systemMessageText;
          if (serviceType === 'jathakWriting' && jathakWritingOption === 'baby') {
            systemMessageText = t('systemMessage.jathakFormSubmitted', {
              name: currentUser.displayName || 'User',
              personName: jathakFormData.name,
              birthPlace: jathakFormData.birthPlace,
              birthDate: jathakFormData.birthDate,
              birthTime: jathakFormData.birthTime
            });
          } else if (serviceType === 'jathakPrediction') {
            const timePart = predictionFormData.birthTime ? `, Time: ${formatLocalTime(predictionFormData.birthTime)}` : '';
            const zodiacPart = predictionFormData.zodiac ? `, Zodiac/Natchathiram: ${predictionFormData.zodiac}` : '';
            systemMessageText = t('systemMessage.predictionFormSubmitted', {
              name: currentUser.displayName || 'User',
              personName: predictionFormData.name,
              birthDate: formatLocalDate(predictionFormData.birthDate),
              timePart,
              zodiacPart
            });
          } else {
            systemMessageText = t('systemMessage.uploadedFiles', {
              name: currentUser.displayName || 'User',
              count: fileReferences.length
            });
          }

          // Build a consistent payload for system message metadata (avoid undefined fields)
          const metadata = { serviceType };
          if (serviceType === 'jathakWriting' && jathakWritingOption === 'baby') {
            metadata.jathakWriting = {
              name: jathakFormData.name,
              birthPlace: jathakFormData.birthPlace,
              birthDate: jathakFormData.birthDate,
              birthTime: jathakFormData.birthTime,
              additionalNotes: jathakFormData.additionalNotes,
              option: jathakWritingOption
            };
          } else if (serviceType === 'jathakPrediction') {
            metadata.jathakPrediction = {
              name: predictionFormData.name,
              birthDate: predictionFormData.birthDate,
              ...(predictionFormData.birthTime ? { birthTime: predictionFormData.birthTime } : {}),
              ...(predictionFormData.zodiac ? { zodiac: predictionFormData.zodiac } : {})
            };
          }
          if (fileReferences.length > 0) {
            metadata.files = fileReferences.map(f => ({ name: f.name, url: f.url, type: f.type }));
          }

          await addDoc(collection(db, 'chats', conversationRef.id, 'messages'), {
            senderId: 'system',
            text: systemMessageText,
            timestamp: serverTimestamp(),
            read: false,
            metadata
          });
        } catch (err) {
          console.error('Error uploading files:', err);
          setError(t('servicePage.errors.fileUploadFailed'));
          return;
        }
      }

      // Clear saved state from localStorage on successful payment
      if (typeof window !== 'undefined') {
        localStorage.removeItem(localStorageKey);
      }

      // Redirect to the created chat after payment
      if (createdChatIds.length > 0) {
        router.push({ pathname: '/messages', query: { chatId: createdChatIds[0] } });
      } else {
        // Fallback to success page if for some reason no chat was created
        router.push('/service-success');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(t('servicePage.errors.paymentFailed'));
    }
  };

  // Add demo payment handler
  const handleDemoPayment = async () => {
    if (!currentUser) {
      setError(t('servicePage.errors.userNotFound'));
      return;
    }

    try {
      // Generate demo payment ID
      const demoPaymentId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a new service request in Firestore
      const serviceRequestData = {
        clientId: currentUser.uid,
        clientName: currentUser.displayName || 'Anonymous',
        clientEmail: currentUser.email,
        serviceType: serviceType,
        astrologerIds: selectedAstrologers.map(astrologer => astrologer.id),
        status: 'payment_successful',
        totalAmount: calculateTotal(),
        paidAmount: 0, // Demo users don't pay
        currency: 'INR',
        razorpay_payment_id: demoPaymentId,
        filesUploaded: files.length > 0 || (dualUpload && secondFiles.length > 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        selectedDistrict: selectedDistrict,
        isDemoUser: true
      };

      const serviceRequestRef = await addDoc(collection(db, 'serviceRequests'), serviceRequestData);

      // Create demo payment records for each astrologer
      await createPaymentRecords({
        selectedAstrologers,
        currentUser,
        serviceType,
        paymentResponse: { razorpay_payment_id: demoPaymentId },
        serviceRequestRef
      });

      // Create conversation threads with each selected astrologer
      const createdChatIds = [];
      const messageText = `Demo service request for ${SERVICE_TYPES[serviceType]} has been created. The astrologer will review your details and respond shortly.`;

      for (const astrologer of selectedAstrologers) {
        const conversationRef = await addDoc(collection(db, 'chats'), {
          participants: [currentUser.uid, astrologer.id],
          clientId: currentUser.uid,
          clientName: currentUser.displayName || 'Client',
          astrologerId: astrologer.id,
          astrologerName: astrologer.displayName || 'Astrologer',
          participantNames: {
            [currentUser.uid]: currentUser.displayName || 'Client',
            [astrologer.id]: astrologer.displayName || 'Astrologer'
          },
          participantAvatars: {
            [currentUser.uid]: currentUser.photoURL || null,
            [astrologer.id]: astrologer.photoURL || null
          },
          serviceRequestId: serviceRequestRef.id,
          serviceType: serviceType,
          razorpay_payment_id: demoPaymentId,
          isDemoUser: true,
          lastMessage: {
            text: messageText,
            timestamp: serverTimestamp(),
            senderId: 'system'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        createdChatIds.push(conversationRef.id);

        // Add initial system message to the conversation
        await addDoc(collection(db, 'chats', conversationRef.id, 'messages'), {
          senderId: 'system',
          text: messageText,
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
              newFileName = `${t('uploadLabels.firstPerson')}_${t('uploadLabels.jathak')}${files.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
            } else {
              newFileName = `${t('uploadLabels.jathak')}${files.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
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
              const newFileName = `${t('uploadLabels.secondPerson')}_${t('uploadLabels.jathak')}${secondFiles.length > 1 ? `_${i + 1}` : ''}.${file.name.split('.').pop()}`;
              const storageRef = ref(storage, `users/${currentUser.uid}/chats/${conversationRef.id}/files/${newFileName}`);
              const uploadTask = await uploadBytes(storageRef, file);
              const downloadURL = await getDownloadURL(uploadTask.ref);

              fileReferences.push({
                name: newFileName,
                originalName: file.name,
                type: file.type,
                size: file.size,
                url: downloadURL,
                category: defaultDualUploadLabels[1],
                uploadedBy: currentUser.uid,
                uploadedAt: serverTimestamp()
              });
            }
          }

          // Store file references in a subcollection of the chat
          for (const fileRef of fileReferences) {
            await addDoc(collection(db, 'chats', conversationRef.id, 'files'), fileRef);
          }

          // Add a system message about the uploaded files or form data
          let systemMessageText;
          if (serviceType === 'jathakWriting' && jathakWritingOption === 'baby') {
            systemMessageText = t('systemMessage.jathakFormSubmitted', {
              name: currentUser.displayName || 'User',
              personName: jathakFormData.name,
              birthPlace: jathakFormData.birthPlace,
              birthDate: jathakFormData.birthDate,
              birthTime: jathakFormData.birthTime
            });
          } else if (serviceType === 'jathakPrediction') {
            const timePart = predictionFormData.birthTime ? `, Time: ${formatLocalTime(predictionFormData.birthTime)}` : '';
            const zodiacPart = predictionFormData.zodiac ? `, Zodiac/Natchathiram: ${predictionFormData.zodiac}` : '';
            systemMessageText = t('systemMessage.predictionFormSubmitted', {
              name: currentUser.displayName || 'User',
              personName: predictionFormData.name,
              birthDate: formatLocalDate(predictionFormData.birthDate),
              timePart,
              zodiacPart
            });
          } else {
            systemMessageText = t('systemMessage.uploadedFiles', {
              name: currentUser.displayName || 'User',
              count: fileReferences.length
            });
          }

          // Build a consistent payload for system message metadata (avoid undefined fields)
          const metadata = { serviceType, isDemoUser: true };
          if (serviceType === 'jathakWriting' && jathakWritingOption === 'baby') {
            metadata.jathakWriting = {
              name: jathakFormData.name,
              birthPlace: jathakFormData.birthPlace,
              birthDate: jathakFormData.birthDate,
              birthTime: jathakFormData.birthTime,
              additionalNotes: jathakFormData.additionalNotes,
              option: jathakWritingOption
            };
          } else if (serviceType === 'jathakPrediction') {
            metadata.jathakPrediction = {
              name: predictionFormData.name,
              birthDate: predictionFormData.birthDate,
              ...(predictionFormData.birthTime ? { birthTime: predictionFormData.birthTime } : {}),
              ...(predictionFormData.zodiac ? { zodiac: predictionFormData.zodiac } : {})
            };
          }
          if (fileReferences.length > 0) {
            metadata.files = fileReferences.map(f => ({ name: f.name, url: f.url, type: f.type }));
          }

          await addDoc(collection(db, 'chats', conversationRef.id, 'messages'), {
            senderId: 'system',
            text: systemMessageText,
            timestamp: serverTimestamp(),
            read: false,
            metadata
          });
        } catch (err) {
          console.error('Error uploading files:', err);
          setError(t('servicePage.errors.fileUploadFailed'));
          return;
        }
      }

      // Clear saved state from localStorage on successful demo payment
      if (typeof window !== 'undefined') {
        localStorage.removeItem(localStorageKey);
      }

      // Redirect to the created chat after demo payment
      if (createdChatIds.length > 0) {
        router.push({ pathname: '/messages', query: { chatId: createdChatIds[0] } });
      } else {
        // Fallback to success page if for some reason no chat was created
        router.push('/service-success');
      }
    } catch (err) {
      console.error('Demo payment error:', err);
      setError(t('servicePage.errors.paymentFailed'));
    }
  };

  const handlePaymentProcessingChange = (isProcessing) => {
    setIsPaymentFlowActiveByButton(isProcessing);
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  // While auth is initializing, show a loader. If no user after init, we'll redirect.
  if (!authInitialized) return <CircularProgress />;
  if (!currentUser) return null;

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
                {isMobile ? (
                  // Mobile: Progress bar with current step
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('servicePage.steps.step1')} - {t('servicePage.steps.uploadFiles')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('servicePage.steps.step4')} - {t('servicePage.steps.payment')}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((step - 1) / 2) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        {step === 1 && t('servicePage.steps.uploadFiles')}
                        {step === 1.5 && t('servicePage.steps.selectDistrict')}
                        {step === 2 && t('servicePage.steps.selectAstrologers')}
                        {step === 3 && t('servicePage.steps.payment')}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  // Desktop: Original grid layout
                  <Grid container spacing={1} justifyContent="center">
                    <Grid item xs={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          color: step >= 1 ? theme.palette.primary.main : 'text.secondary',
                          fontWeight: step === 1 ? 'bold' : 'normal'
                        }}
                      >
                        <Typography variant="body1">{t('servicePage.steps.step1')}</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                            maxWidth: '8rem'
                          }}
                        >
                          {t('servicePage.steps.uploadFiles')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          color: step >= 1.5 ? theme.palette.primary.main : 'text.secondary',
                          fontWeight: step === 1.5 ? 'bold' : 'normal'
                        }}
                      >
                        <Typography variant="body1">{t('servicePage.steps.step2')}</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                            maxWidth: '8rem'
                          }}
                        >
                          {t('servicePage.steps.selectDistrict')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          color: step >= 2 ? theme.palette.primary.main : 'text.secondary',
                          fontWeight: step === 2 ? 'bold' : 'normal'
                        }}
                      >
                        <Typography variant="body1">{t('servicePage.steps.step3')}</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                            maxWidth: '9rem'
                          }}
                        >
                          {t('servicePage.steps.selectAstrologers')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          color: step >= 3 ? theme.palette.primary.main : 'text.secondary',
                          fontWeight: step === 3 ? 'bold' : 'normal'
                        }}
                      >
                        <Typography variant="body1">{t('servicePage.steps.step4')}</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto'
                          }}
                        >
                          {t('servicePage.steps.payment')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}
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
                    {t('servicePage.uploadTitle', 'Upload Your Jathak')}
                  </Typography>

                  {/* Jathak Writing Options - Only for Jathak Writing service */}
                  {serviceType === 'jathakWriting' && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: theme.palette.primary.main }}>
                        {t('jathakWriting.selectOption', 'Select Jathak Writing Option')}
                      </Typography>
                      <FormControl component="fieldset">
                        <RadioGroup
                          value={jathakWritingOption}
                          onChange={(e) => setJathakWritingOption(e.target.value)}
                        >
                          <FormControlLabel
                            value="baby"
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="body1" fontWeight="bold">
                                  {t('jathakWriting.babyOption.title', 'New Jathak Writing')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {t('jathakWriting.babyOption.description', 'For babies and new births')}
                                </Typography>
                              </Box>
                            }
                            sx={{ mb: 2 }}
                          />
                          <FormControlLabel
                            value="old"
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="body1" fontWeight="bold">
                                  {t('jathakWriting.oldOption.title', 'Old Jathak Re-writing')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {t('jathakWriting.oldOption.description', 'For older people with existing jathak')}
                                </Typography>
                              </Box>
                            }
                          />
                        </RadioGroup>
                      </FormControl>
                    </Box>
                  )}

                  {/* Jathak Prediction minimal form */}
                  {serviceType === 'jathakPrediction' && (
                    <JathakPredictionForm
                      formData={predictionFormData}
                      onFormDataChange={setPredictionFormData}
                      errors={predictionFormErrors}
                    />
                  )}

                  {/* Show preserved selections */}
                  {selectedDistrict && selectedAstrologers.length > 0 && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>{t('servicePage.preservedSelections', 'Your previous selections have been preserved:')}</strong>
                      </Typography>
                      <Typography variant="body2">
                        {t('servicePage.district', 'District')}: {selectedDistrict}
                      </Typography>
                      <Typography variant="body2">
                        {t('servicePage.astrologers', 'Astrologers')}: {selectedAstrologers.map(a => a.displayName).join(', ')}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        {t('servicePage.proceedToPayment', 'After uploading your files, you will proceed directly to payment.')}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedDistrict('');
                          setSelectedAstrologers([]);
                          setError('');
                        }}
                        sx={{ mt: 1 }}
                      >
                        {t('servicePage.changeSelections', 'Change Selections')}
                      </Button>
                    </Alert>
                  )}

                  {/* Show form for new jathak writing, file upload for old jathak writing */}
                  {serviceType === 'jathakWriting' && jathakWritingOption === 'baby' ? (
                    <JathakWritingForm
                      formData={jathakFormData}
                      onFormDataChange={setJathakFormData}
                      errors={jathakFormErrors}
                    />
                  ) : (
                    dualUpload ? (
                      isMobile ? (
                        // Mobile: Step-wise upload
                        <Box>
                          {uploadSubstep === 1 && (
                            <Box>
                              <Typography variant="h6" sx={{ mb: 2, color: theme.palette.primary.main }}>
                                {t('servicePage.steps.uploadStep', { step: 1, total: 2 })}: {defaultDualUploadLabels[0]} {t('uploadLabels.jathak')}
                              </Typography>
                              <FileUploadSection
                                files={files}
                                onFilesChange={handleFilesChange}
                                multiple={multipleUploads}
                              />
                              <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Button
                                  variant="contained"
                                  onClick={() => {
                                    if (files.length > 0) {
                                      setUploadSubstep(2);
                                    } else {
                                      setToast({
                                        open: true,
                                        message: t('servicePage.errors.uploadFirstPerson'),
                                        severity: 'error'
                                      });
                                    }
                                  }}
                                  sx={{
                                    // whiteSpace: 'nowrap',
                                    // overflow: 'hidden',
                                    // textOverflow: 'ellipsis',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    hyphens: 'auto',
                                    maxWidth: '100%',
                                    minWidth: { xs: 'auto', md: '200px' },
                                    px: { xs: 2, md: 3 },
                                    py: { xs: 1.5, md: 2 }
                                  }}
                                >
                                  {t('servicePage.nextUploadStep', 'Next: Upload Groom\'s Jathak')}
                                </Button>
                              </Box>
                            </Box>
                          )}
                          {uploadSubstep === 2 && (
                            <Box>
                              <Typography variant="h6" sx={{ mb: 2, color: theme.palette.primary.main }}>
                                {t('servicePage.steps.uploadStep', { step: 2, total: 2 })}: {defaultDualUploadLabels[1]} {t('uploadLabels.jathak')}
                              </Typography>
                              <FileUploadSection
                                files={secondFiles}
                                onFilesChange={handleSecondFilesChange}
                                multiple={multipleUploads}
                              />
                              <Box sx={{
                                mt: 3,
                                display: 'flex',
                                gap: { xs: 1, md: 2 },
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                              }}>
                                <Button
                                  variant="outlined"
                                  onClick={() => setUploadSubstep(1)}
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%',
                                    minWidth: { xs: 'auto', md: '120px' },
                                    px: { xs: 2, md: 3 },
                                    py: { xs: 1.5, md: 2 }
                                  }}
                                >
                                  {t('servicePage.previous', 'Previous')}
                                </Button>
                                {/* <Button
                                  variant="contained"
                                  onClick={() => {
                                    if (secondFiles.length > 0) {
                                      // Both files uploaded, proceed to next step
                                      console.log('proceeding to next step', uploadSubstep);
                                      handleNextStep();
                                    } else {
                                      setToast({
                                        open: true,
                                        message: t('servicePage.errors.uploadSecondPerson'),
                                        severity: 'error'
                                      });
                                    }
                                  }}
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%',
                                    minWidth: { xs: 'auto', md: '200px' },
                                    px: { xs: 2, md: 3 },
                                    py: { xs: 1.5, md: 2 }
                                  }}
                                >
                                  {t('servicePage.proceedToNext', 'Proceed to Next Step')}
                                </Button> */}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        // Desktop: Original grid layout
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 2,
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                hyphens: 'auto'
                              }}
                            >
                              {defaultDualUploadLabels[0]} {t('uploadLabels.jathak')}
                            </Typography>
                            <FileUploadSection
                              files={files}
                              onFilesChange={handleFilesChange}
                              multiple={multipleUploads}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography
                              variant="h6"
                              sx={{
                                mb: 2,
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                hyphens: 'auto'
                              }}
                            >
                              {defaultDualUploadLabels[1]} {t('uploadLabels.jathak')}
                            </Typography>
                            <FileUploadSection
                              files={secondFiles}
                              onFilesChange={handleSecondFilesChange}
                              multiple={multipleUploads}
                            />
                          </Grid>
                        </Grid>
                      )
                    ) : (
                      <FileUploadSection
                        files={files}
                        onFilesChange={handleFilesChange}
                        multiple={multipleUploads}
                      />
                    )
                  )}

                  <Box sx={{ mt: 4, textAlign: 'right' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleNextStep}
                      disabled={dualUpload && isMobile && secondFiles.length === 0}
                      sx={{
                        py: { xs: 1.5, md: 2 },
                        px: { xs: 2, md: 4 },
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        minWidth: { xs: 'auto', md: '200px' },
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedDistrict && selectedAstrologers.length > 0
                        ? t('servicePage.nextPayment', 'Next: Payment')
                        : t('servicePage.nextDistrict', 'Next: Select District')
                      }
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 1.5: Select District */}
              {step === 1.5 && (
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
                    {t('servicePage.selectDistrictTitle', 'Select District')}
                  </Typography>
                  {districtLoading ? (
                    <CircularProgress />
                  ) : (
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel id="district-select-label">District</InputLabel>
                      <Select
                        labelId="district-select-label"
                        value={selectedDistrict}
                        label="District"
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                      >
                        <MenuItem value="" disabled><em>Select a District</em></MenuItem>
                        {(() => {
                          // Separate available and unavailable districts
                          const availableDistrictsList = [];
                          const unavailableDistrictsList = [];

                          TAMIL_NADU_DISTRICTS.forEach((dist) => {
                            const isAvailable = availableDistricts.has(dist);
                            if (isAvailable) {
                              availableDistrictsList.push(dist);
                            } else {
                              unavailableDistrictsList.push(dist);
                            }
                          });

                          // Sort both lists alphabetically
                          availableDistrictsList.sort();
                          unavailableDistrictsList.sort();

                          // Combine and render
                          return [...availableDistrictsList, ...unavailableDistrictsList].map((dist) => {
                            const isAvailable = availableDistricts.has(dist);
                            return (
                              <MenuItem key={dist} value={dist} disabled={!isAvailable}>
                                {dist}
                                {!isAvailable && (
                                  <MuiChip
                                    label={t('districts.comingSoon', 'Service Coming Soon')}
                                    size="small"
                                    variant="outlined"
                                    sx={{ ml: 1, opacity: 0.7 }}
                                  />
                                )}
                              </MenuItem>
                            );
                          });
                        })()}
                      </Select>
                    </FormControl>
                  )}
                  <Box sx={{
                    mt: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: { xs: 1, md: 2 },
                    flexWrap: { xs: 'wrap', md: 'nowrap' }
                  }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={handlePreviousStep}
                      sx={{
                        py: { xs: 1.5, md: 2 },
                        px: { xs: 2, md: 4 },
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        minWidth: { xs: 'auto', md: '120px' },
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: { xs: '1 1 auto', md: '0 0 auto' }
                      }}
                    >
                      {t('servicePage.back', 'Back')}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleNextStep}
                      disabled={districtLoading || !selectedDistrict}
                      sx={{
                        py: { xs: 1.5, md: 2 },
                        px: { xs: 2, md: 4 },
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        minWidth: { xs: 'auto', md: '200px' },
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: { xs: '1 1 auto', md: '0 0 auto' }
                      }}
                    >
                      {t('servicePage.nextAstrologers', 'Next: Select Astrologers')}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 2: Select Astrologers (grouped by category, hide personal details) */}
              {step === 2 && (
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      mb: 1,
                      fontFamily: '"Cormorant Garamond", serif',
                      color: theme.palette.secondary.dark
                    }}
                  >
                    {t('servicePage.selectAstrologersTitle', 'Select Astrologers')}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('servicePage.showingAstrologers', { district: selectedDistrict })}
                  </Typography>
                  {loading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : astrologers.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', py: 4 }}>
                      {t('servicePage.noAstrologersFound', { service: t(`services.${serviceType}.title`), district: selectedDistrict })}
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                      <Box
                        sx={{
                          flex: { xs: '1 1 100%', md: '1 1 60%' },
                          minHeight: { md: '500px' }
                        }}
                      >
                        <Paper
                          elevation={2}
                          sx={{
                            p: { xs: 1.5, md: 3 },
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
                            {t('astrologerCategories.sectionTitle')}
                          </Typography>
                          {['pothigai', 'ganga', 'himalaya'].map(catKey => (
                            <Box key={catKey} sx={{ mb: 2 }}>
                              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                                {catKey === 'pothigai' && t('astrologerCategories.pothigaiLabel')}
                                {catKey === 'ganga' && t('astrologerCategories.gangaLabel')}
                                {catKey === 'himalaya' && t('astrologerCategories.himalayaLabel')}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: { xs: 'column', md: 'row' },
                                  overflowX: { md: 'auto' },
                                  overflowY: { xs: 'auto', md: 'visible' },
                                  gap: { xs: 1.5, md: 2 },
                                  pb: { xs: 1, md: 2 },
                                  flex: '1 1 auto',
                                  maxHeight: { xs: 'none', md: 'none' }
                                }}
                              >
                                {astrologers.filter(a => (a._category?.key || deriveCategory(a.serviceCharges?.[serviceType] || 0).key) === catKey).map(astrologer => (
                              <Box
                                key={astrologer.id}
                                sx={{
                                  minWidth: { xs: '100%', md: '150px' },
                                  maxWidth: { xs: '100%', md: '320px' },
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
                                      {isMobile ? (
                                    <CardActionArea
                                      onClick={() => handleAstrologerSelect(astrologer)}
                                      sx={{ p: 1, display: 'flex', alignItems: 'center' }}
                                    >
                                      <Avatar
                                        src={astrologer.photoURL || '/images/default-avatar.png'}
                                            alt="Astrologer"
                                        sx={{ width: 56, height: 56, mr: 1.5 }}
                                      />
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                          variant="subtitle1"
                                          noWrap
                                          sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                        >
                                              {astrologer._category?.label || deriveCategory(astrologer.serviceCharges?.[serviceType] || 0).label}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          noWrap
                                          sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                        >
                                              {astrologer.experience ? `${astrologer.experience} yrs` : t('services.generalAstrology', 'General Astrology')}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mt: 0.5, fontFamily: '"Cormorant Garamond", serif' }}
                                        >
                                              <Box component="span" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                                                ₹{astrologer.serviceCharges?.[serviceType] || 500}
                                              </Box>
                                        </Typography>
                                      </Box>
                                      <Checkbox
                                        checked={selectedAstrologers.some(a => a.id === astrologer.id)}
                                        color="primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAstrologerSelect(astrologer);
                                        }}
                                      />
                                    </CardActionArea>
                                  ) : (
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
                                        height="300px"
                                        image={astrologer.photoURL || '/images/default-avatar.png'}
                                            alt="Astrologer"
                                        sx={{
                                          objectFit: 'cover',
                                          margin: 0,
                                          display: 'block'
                                        }}
                                      />
                                      <CardContent
                                        sx={{
                                          padding: 2,
                                          paddingBottom: '16px !important',
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
                                                {astrologer._category?.label || deriveCategory(astrologer.serviceCharges?.[serviceType] || 0).label}
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
                                              {astrologer.experience ? `${astrologer.experience} yrs` : t('services.generalAstrology', 'General Astrology')}
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
                                              <Box component="span" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                                                ₹{astrologer.serviceCharges?.[serviceType] || 500}
                                              </Box>
                                        </Typography>
                                      </CardContent>
                                    </CardActionArea>
                                  )}
                                </Card>
                              </Box>
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </Paper>
                      </Box>

                      <Box
                        sx={{
                          flex: { xs: '1 1 100%', md: '1 1 40%' },
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
                                  alt="Astrologer"
                                        />
                                      </ListItemAvatar>
                                      <ListItemText
                                        primary={
                                  <Typography sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                                    {getPublicAstrologerLabel(astrologer)}
                                          </Typography>
                                        }
                                        secondary={
                                          <Typography
                                            sx={{
                                              color: theme.palette.primary.main,
                                              fontFamily: '"Cormorant Garamond", serif'
                                            }}
                                          >
                                     <Box component="span" sx={{ fontWeight: 800 }}>
                                       ₹{astrologer.serviceCharges?.[serviceType] || 0}
                                     </Box>
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

                  <Box sx={{
                    mt: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: { xs: 1, md: 2 },
                    flexWrap: { xs: 'wrap', md: 'nowrap' }
                  }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={handlePreviousStep}
                      sx={{
                        py: { xs: 1.5, md: 2 },
                        px: { xs: 2, md: 4 },
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        minWidth: { xs: 'auto', md: '120px' },
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: { xs: '1 1 auto', md: '0 0 auto' }
                      }}
                    >
                      {t('servicePage.back', 'Back')}
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleNextStep}
                      disabled={selectedAstrologers.length === 0}
                      sx={{
                        py: { xs: 1.5, md: 2 },
                        px: { xs: 2, md: 4 },
                        fontFamily: '"Cormorant Garamond", serif',
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        minWidth: { xs: 'auto', md: '200px' },
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: { xs: '1 1 auto', md: '0 0 auto' }
                      }}
                    >
                      {t('servicePage.nextPayment', 'Next: Payment')}
                    </Button>
                  </Box>
                </Box>
              )}
              {console.log('currentUser', currentUser)}
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
                    {t('steps.payment', 'Payment')}
                  </Typography>

                  {/* Show selection summary */}
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>{t('servicePage.selectedServices', 'Selected Service:')}</strong> {title}
                    </Typography>
                    <Typography variant="body2">
                      {t('servicePage.district', 'District')}: {selectedDistrict}
                    </Typography>
                    <Typography variant="body2">
                      {t('servicePage.astrologers', 'Astrologers')}: {selectedAstrologers.map(a => a.displayName).join(', ')}
                    </Typography>
                  </Alert>

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    <Box
                      sx={{
                        flex: { xs: '1 1 100%', md: isPaymentFlowActiveByButton ? '1 1 100%' : '1 1 75%' },
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
                          {t('servicePage.paymentMethod', 'Payment Method')}
                        </Typography>
                        {console.log('currentUser', currentUser)}
                        {currentUser.isDemoUser ? (
                          <Box sx={{ textAlign: 'center' }}>
                            <Alert severity="info" sx={{ mb: 3 }}>
                              <Typography variant="body1" sx={{ mb: 1 }}>
                                <strong>Demo User Access</strong>
                              </Typography>
                              <Typography variant="body2">
                                As a demo user, you can access this service without payment. Click the button below to proceed.
                              </Typography>
                            </Alert>
                            <Button
                              variant="contained"
                              color="success"
                              size="large"
                              onClick={handleDemoPayment}
                              sx={{
                                py: 2,
                                px: 4,
                                fontSize: '1.2rem',
                                fontFamily: '"Cormorant Garamond", serif'
                              }}
                            >
                              Proceed with Demo Service
                            </Button>
                          </Box>
                        ) : (
                          <PaymentButton
                            amount={calculateTotal() + Math.round(calculateTotal() * 0.18)} // Total with GST
                            description={t('servicePage.paymentDescription', { service: t(`services.${serviceType}.title`) })}
                            onSuccess={handlePayment}
                            onError={(error) => setError(error)}
                            onProcessingStateChange={handlePaymentProcessingChange}
                          />
                        )}
                      </Paper>
                    </Box>

                    {!isPaymentFlowActiveByButton && (
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
                            {t('servicePage.orderSummary', 'Order Summary')}
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
                              alt="Astrologer"
                                    />
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={
                              <Typography sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                                {getPublicAstrologerLabel(astrologer)}
                                      </Typography>
                                    }
                                    secondary={
                                      <Typography
                                        sx={{
                                          color: theme.palette.primary.main,
                                          fontFamily: '"Cormorant Garamond", serif'
                                        }}
                                      >
                              <Box component="span" sx={{ fontWeight: 800 }}>
                                ₹{astrologer.serviceCharges?.[serviceType] || 0}
                              </Box>
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
                    )}
                  </Box>

                  {!isPaymentFlowActiveByButton && (
                    <Box sx={{
                      mt: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: { xs: 1, md: 2 },
                      flexWrap: { xs: 'wrap', md: 'nowrap' }
                    }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="large"
                        onClick={handlePreviousStep}
                        sx={{
                          py: { xs: 1.5, md: 2 },
                          px: { xs: 2, md: 4 },
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: { xs: '1rem', md: '1.1rem' },
                          minWidth: { xs: 'auto', md: '120px' },
                          maxWidth: '100%',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: { xs: '1 1 auto', md: '0 0 auto' }
                        }}
                      >
                        {t('servicePage.back', 'Back')}
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Container>
        </Box>
      </Box>

      {/* Toast notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
} 