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
import { addDoc, collection, getDocs, query, serverTimestamp, where, Timestamp, arrayUnion, doc, getDoc } from 'firebase/firestore';
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
import { getPricingConfig, getAllPricingPlans, getPlanTotal, getPricingPlan } from '../services/pricingService';
import { getAllSupportUsers } from '../services/adminService';
import { assignSupportUserToChat } from '../services/chatService';

// District list removed - no longer needed for UI

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
  // Capture referral from URL if present, store once per user session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get('ref');
      if (ref && !localStorage.getItem('vv_partner_ref')) {
        localStorage.setItem('vv_partner_ref', ref);
      }
    } catch (_) { }
  }, []);

  // Categorisation based on example price ranges
  const deriveCategory = (amount) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) amount = 0;
    if (amount <= 500) return { key: 'pothigai', label: t('astrologerCategories.pothigaiLabel'), range: t('astrologerCategories.pothigaiRange') };
    if (amount <= 1000) return { key: 'ganga', label: t('astrologerCategories.gangaLabel'), range: t('astrologerCategories.gangaRange') };
    return { key: 'himalaya', label: t('astrologerCategories.himalayaLabel'), range: t('astrologerCategories.himalayaRange') };
  };

  const getPublicAstrologerLabel = (astrologer) => {
    const years = astrologer?.experience ? `${astrologer.experience} yrs` : t('services.generalAstrology', 'General Astrology');
    return years;
  };

  // Set default dualUploadLabels if not provided
  const defaultDualUploadLabels = dualUploadLabels || [t('uploadLabels.firstPerson'), t('uploadLabels.secondPerson')];

  const localStorageKey = `servicePageProgress_${serviceType}`;

  // District selection removed - keeping state for backward compatibility but not used in UI
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [selectedPlan, setSelectedPlan] = useState(''); // 'pothigai', 'ganga', or 'himalaya'
  const [pricingPlans, setPricingPlans] = useState([]);
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

            // Restore plan selection if present
            if (savedState.selectedPlan) setSelectedPlan(savedState.selectedPlan);

            // Restore jathak-related form data if present (for prediction/writing flows)
            if (savedState.jathakFormData) setJathakFormData(savedState.jathakFormData);
            if (savedState.predictionFormData) setPredictionFormData(savedState.predictionFormData);
            if (typeof savedState.jathakWritingOption === 'string') setJathakWritingOption(savedState.jathakWritingOption);

            // Show message only if user had meaningful previous selections (plan)
            if (savedState.selectedPlan) {
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
            setSelectedPlan('');
            setFiles([]);
            setSecondFiles([]);
          }
        } catch (e) {
          console.error("Failed to parse saved state from localStorage", e);
          localStorage.removeItem(localStorageKey); // Clear corrupted data
          // Reset to default state after corruption
          setStep(1);
          setSelectedDistrict('');
          setSelectedPlan('');
          setFiles([]);
          setSecondFiles([]);
        }
      } else {
        // No saved state, ensure defaults (though useState already does this)
        setStep(1);
        setSelectedDistrict('');
        setSelectedPlan('');
      }
    }
  }, [serviceType, currentUser, localStorageKey, t]);

  // Save state to localStorage whenever relevant parts change
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      const stateToSave = {
        userId: currentUser.uid, // Add userId here
        step,
        selectedPlan,
        filesUploaded: files.length > 0,
        secondFilesUploaded: secondFiles.length > 0,
        // Persist form data for restoration in Jathak Prediction/Writing flows
        jathakFormData,
        predictionFormData,
        jathakWritingOption
      };
      localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
    }
  }, [step, selectedPlan, files, secondFiles, jathakFormData, predictionFormData, jathakWritingOption, serviceType, currentUser, localStorageKey]);

  // District fetching removed - all astrologers are available statewide

  // Load pricing plans on mount
  useEffect(() => {
    const loadPricingPlans = async () => {
      try {
        const plans = await getAllPricingPlans();
        setPricingPlans(plans);
      } catch (err) {
        console.error('Error loading pricing plans:', err);
      }
    };
    loadPricingPlans();
  }, []);

  // Astrologer fetching removed - no longer needed in new flow

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

  // Astrologer selection removed - no longer needed

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

      // Normal flow - go to plan selection
      setStep(2);
    } else if (step === 2) {
      if (!selectedPlan) {
        setToast({ open: true, message: t('servicePage.errors.selectPlan', 'Please select a pricing plan'), severity: 'error' });
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
    else if (step === 2) setStep(1);

    // Scroll to top when moving to previous step
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const calculateTotal = async () => {
    if (!selectedPlan) return 0;
    return await getPlanTotal(selectedPlan);
  };

  // Synchronous version for display (uses cached plan or calculates)
  const calculateTotalSync = () => {
    if (!selectedPlan) return 0;
    const plan = pricingPlans.find(p => p.key === selectedPlan);
    return plan ? plan.totalPrice : 0;
  };

  const calculateBaseSync = () => {
    if (!selectedPlan) return 0;
    const plan = pricingPlans.find(p => p.key === selectedPlan);
    return plan ? plan.basePrice : 0;
  };

  const calculateGSTSync = () => {
    if (!selectedPlan) return 0;
    const plan = pricingPlans.find(p => p.key === selectedPlan);
    return plan ? plan.gst : 0;
  };

  const handlePayment = async (paymentResponse) => {
    if (!currentUser || !paymentResponse || !paymentResponse.razorpay_payment_id) {
      console.error("Payment handling error: Missing current user or payment response details.");
      setError(t('servicePage.errors.paymentFailed'));
      return;
    }

    try {
      // Get a support user to assign
      const supportUsers = await getAllSupportUsers();
      if (supportUsers.length === 0) {
        setError('No support users available. Please contact admin.');
        return;
      }
      const assignedSupport = supportUsers[0]; // Pick first available support user

      // Get plan details for expiry calculation
      const planDetails = await getPricingPlan(selectedPlan);
      const planDurationHours = planDetails?.chatDurationHours || 24;
      const availabilityWindowHours = planDetails?.availabilityWindowHours || planDurationHours;

      // Calculate expiry timestamp
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + availabilityWindowHours);
      const expiryTimestamp = Timestamp.fromDate(expiryDate);

      // Create a new service request in Firestore
      const serviceRequestData = {
        clientId: currentUser.uid,
        clientName: currentUser.displayName || 'Anonymous',
        clientEmail: currentUser.email,
        serviceType: serviceType,
        astrologerId: null, // Will be assigned later by support
        supportUserId: assignedSupport.id,
        status: 'payment_successful', // Initial status after successful payment
        pricingCategory: selectedPlan, // Store selected plan
        planDurationHours: planDurationHours,
        totalAmount: calculateBaseSync(), // Base amount (excluding GST)
        // Amount may not be present on some gateways or older callbacks; compute safely
        paidAmount: typeof paymentResponse.amount === 'number'
          ? Math.round(paymentResponse.amount) / 100
          : calculateTotalSync(),
        currency: 'INR', // Assuming INR, or take from paymentResponse.currency if available
        razorpay_payment_id: paymentResponse.razorpay_payment_id, // Storing payment ID
        filesUploaded: files.length > 0 || (dualUpload && secondFiles.length > 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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

      // Create payment record (single payment doc per service request)
      await createPaymentRecords({
        currentUser,
        serviceType,
        paymentResponse,
        serviceRequestRef,
        pricingCategory: selectedPlan
      });

      // Create conversation thread with support user (astrologer will be added later)
      const messageText = `Service request for ${SERVICE_TYPES[serviceType]} has been created. Our support team will assign an astrologer and respond shortly.`;

      const conversationRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUser.uid, assignedSupport.id],
        clientId: currentUser.uid,
        clientName: currentUser.displayName || 'Client',
        astrologerId: null, // Will be assigned later
        astrologerName: null,
        supportUserId: assignedSupport.id,
        supportUserName: assignedSupport.displayName || 'Support',
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'Client',
          [assignedSupport.id]: assignedSupport.displayName || 'Support'
        },
        participantAvatars: {
          [currentUser.uid]: currentUser.photoURL || null,
          [assignedSupport.id]: assignedSupport.photoURL || null
        },
        serviceRequestId: serviceRequestRef.id,
        serviceType: serviceType,
        pricingCategory: selectedPlan,
        planDurationHours: planDurationHours,
        expiryTimestamp: expiryTimestamp,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        lastMessage: {
          text: messageText,
          timestamp: serverTimestamp(),
          senderId: 'system'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      });

      // Assign support user to chat
      await assignSupportUserToChat(conversationRef.id, assignedSupport.id, 'system');

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

      // Clear saved state from localStorage on successful payment
      if (typeof window !== 'undefined') {
        localStorage.removeItem(localStorageKey);
      }

      // Redirect to the created chat after payment
      router.push({ pathname: '/messages', query: { chatId: conversationRef.id } });
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
      // Get a support user to assign
      const supportUsers = await getAllSupportUsers();
      if (supportUsers.length === 0) {
        setError('No support users available. Please contact admin.');
        return;
      }
      const assignedSupport = supportUsers[0]; // Pick first available support user

      // Get plan details for expiry calculation
      const planDetails = await getPricingPlan(selectedPlan);
      const planDurationHours = planDetails?.chatDurationHours || 24;
      const availabilityWindowHours = planDetails?.availabilityWindowHours || planDurationHours;

      // Calculate expiry timestamp
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + availabilityWindowHours);
      const expiryTimestamp = Timestamp.fromDate(expiryDate);

      // Generate demo payment ID
      const demoPaymentId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a new service request in Firestore
      const serviceRequestData = {
        clientId: currentUser.uid,
        clientName: currentUser.displayName || 'Anonymous',
        clientEmail: currentUser.email,
        serviceType: serviceType,
        astrologerId: null, // Will be assigned later by support
        supportUserId: assignedSupport.id,
        status: 'payment_successful',
        pricingCategory: selectedPlan,
        planDurationHours: planDurationHours,
        totalAmount: calculateBaseSync(),
        paidAmount: 0, // Demo users don't pay
        currency: 'INR',
        razorpay_payment_id: demoPaymentId,
        filesUploaded: files.length > 0 || (dualUpload && secondFiles.length > 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDemoUser: true
      };

      const serviceRequestRef = await addDoc(collection(db, 'serviceRequests'), serviceRequestData);

      // Create demo payment record
      await createPaymentRecords({
        currentUser,
        serviceType,
        paymentResponse: { razorpay_payment_id: demoPaymentId },
        serviceRequestRef,
        pricingCategory: selectedPlan
      });

      // Create conversation thread with support user
      const messageText = `Demo service request for ${SERVICE_TYPES[serviceType]} has been created. Our support team will assign an astrologer and respond shortly.`;

      const conversationRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUser.uid, assignedSupport.id],
        clientId: currentUser.uid,
        clientName: currentUser.displayName || 'Client',
        astrologerId: null, // Will be assigned later
        astrologerName: null,
        supportUserId: assignedSupport.id,
        supportUserName: assignedSupport.displayName || 'Support',
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'Client',
          [assignedSupport.id]: assignedSupport.displayName || 'Support'
        },
        participantAvatars: {
          [currentUser.uid]: currentUser.photoURL || null,
          [assignedSupport.id]: assignedSupport.photoURL || null
        },
        serviceRequestId: serviceRequestRef.id,
        serviceType: serviceType,
        pricingCategory: selectedPlan,
        planDurationHours: planDurationHours,
        expiryTimestamp: expiryTimestamp,
        razorpay_payment_id: demoPaymentId,
        isDemoUser: true,
        lastMessage: {
          text: messageText,
          timestamp: serverTimestamp(),
          senderId: 'system'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      });

      // Assign support user to chat
      await assignSupportUserToChat(conversationRef.id, assignedSupport.id, 'system');

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

      // Clear saved state from localStorage on successful demo payment
      if (typeof window !== 'undefined') {
        localStorage.removeItem(localStorageKey);
      }

      // Redirect to the created chat after demo payment
      router.push({ pathname: '/messages', query: { chatId: conversationRef.id } });
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
  if (!authInitialized) {
    return (
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px - 64px)', // Adjust these values to match your navbar+footer height if different
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
          width: '100vw',
          bgcolor: 'background.default'
        }}
      >
        <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }
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
                        {step === 2 && t('servicePage.steps.selectPlan', 'Select Plan')}
                        {step === 3 && t('servicePage.steps.payment')}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  // Desktop: Original grid layout
                  <Grid container spacing={1} justifyContent="center">
                    <Grid item xs={4}>
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
                    <Grid item xs={4}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          color: step >= 2 ? theme.palette.primary.main : 'text.secondary',
                          fontWeight: step === 2 ? 'bold' : 'normal'
                        }}
                      >
                        <Typography variant="body1">{t('servicePage.steps.step2')}</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                            maxWidth: '9rem'
                          }}
                        >
                          {t('servicePage.steps.selectPlan', 'Select Plan')}
                        </Typography>
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
                        <Typography variant="body1">{t('servicePage.steps.step3')}</Typography>
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

                  {/* Show preserved plan selection */}
                  {selectedPlan && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>{t('servicePage.preservedSelections', 'Your previous selections have been preserved:')}</strong>
                      </Typography>
                      <Typography variant="body2">
                        {t('servicePage.selectedPlan', 'Selected Plan')}: {pricingPlans.find(p => p.key === selectedPlan)?.name || selectedPlan}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        {t('servicePage.proceedToPayment', 'After uploading your files, you will proceed directly to payment.')}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedPlan('');
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
                      {selectedPlan
                        ? t('servicePage.nextPayment', 'Next: Payment')
                        : t('servicePage.nextPlan', 'Next: Select Plan')
                      }
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Step 2: Select Plan */}
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
                    {t('servicePage.selectPlanTitle', 'Select Pricing Plan')}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                    {t('servicePage.selectPlanDescription', 'Choose a plan that suits your needs')}
                  </Typography>

                  <Grid
                    container
                    spacing={isMobile ? 2 : 3}
                    sx={{
                      width: '100%',
                      mx: 0,
                      '& .MuiGrid-item': { width: '100%' },
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {pricingPlans.map((plan) => (
                      <Grid item xs={12} md={4} key={plan.key} sx={{ width: { xs: '100%', md: '30%' } }}>
                        <Card
                          sx={{
                            height: { xs: 'auto', md: '100%' },
                            width: '100%',
                            maxHeight: { xs: '100%', md: '350px' },
                            border: selectedPlan === plan.key
                              ? `2px solid ${theme.palette.primary.main}`
                              : '1px solid rgba(0, 0, 0, 0.12)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: theme.shadows[4],
                            }
                          }}
                          onClick={() => setSelectedPlan(plan.key)}
                        >
                          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontFamily: '"Cormorant Garamond", serif',
                                  fontWeight: 'bold',
                                  color: theme.palette.primary.main,
                                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                                  lineHeight: 1.2,
                                  wordBreak: 'break-word'
                                }}
                              >
                                {plan.name}
                              </Typography>
                              <Checkbox
                                checked={selectedPlan === plan.key}
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPlan(plan.key);
                                }}
                              />
                            </Box>
                            <Typography
                              variant="h4"
                              sx={{
                                mb: 1.5,
                                fontFamily: '"Cormorant Garamond", serif',
                                fontWeight: 900,
                                fontSize: { xs: '1.75rem', md: '2.125rem' },
                                lineHeight: 1.1
                              }}
                            >
                              ₹{plan.totalPrice}
                            </Typography>
                            {isMobile ? (
                              <>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                                  <MuiChip
                                    size="small"
                                    label={`Chat ${plan.chatDurationHours}h`}
                                    sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                  />
                                  {plan.phoneCallAvailable ? (
                                    <MuiChip
                                      size="small"
                                      label="Phone"
                                      color="primary"
                                      variant="outlined"
                                      sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                    />
                                  ) : (
                                    <MuiChip
                                      size="small"
                                      label="Chat only"
                                      variant="outlined"
                                      sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                    />
                                  )}
                                  {plan.videoCallAvailable && (
                                    <MuiChip
                                      size="small"
                                      label="Video"
                                      color="primary"
                                      variant="outlined"
                                      sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                    />
                                  )}
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    fontFamily: '"Cormorant Garamond", serif',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.25
                                  }}
                                >
                                  Base ₹{plan.basePrice} + GST ₹{plan.gst}
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Divider sx={{ my: 2 }} />
                                <List dense>
                                  <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemText
                                      primary={
                                        <Typography
                                          variant="body2"
                                          sx={{ fontFamily: '"Cormorant Garamond", serif', whiteSpace: 'normal' }}
                                        >
                                          Chat Duration: {plan.chatDurationHours} hours
                                        </Typography>
                                      }
                                    />
                                  </ListItem>
                                  <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemText
                                      primary={
                                        <Typography
                                          variant="body2"
                                          sx={{ fontFamily: '"Cormorant Garamond", serif', whiteSpace: 'normal' }}
                                        >
                                            {plan.videoCallAvailable ? (plan.phoneCallAvailable ? 'Phone & Video calls available' : 'Video calls available') : (plan.phoneCallAvailable ? 'Phone calls available' : 'Chat only')}
                                        </Typography>
                                      }
                                    />
                                  </ListItem>
                                  {/* {plan.videoCallAvailable && (
                                    <ListItem disablePadding>
                                      <ListItemText
                                        primary={
                                          <Typography
                                            variant="body2"
                                            sx={{ fontFamily: '"Cormorant Garamond", serif', whiteSpace: 'normal' }}
                                          >
                                            Video calls available
                                          </Typography>
                                        }
                                      />
                                    </ListItem>
                                  )} */}
                                </List>
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontFamily: '"Cormorant Garamond", serif', whiteSpace: 'normal' }}
                                  >
                                    Base: ₹{plan.basePrice} + GST: ₹{plan.gst}
                                  </Typography>
                                </Box>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {selectedPlan && (
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        mt: 3,
                        borderRadius: '8px',
                        backgroundColor: theme.palette.background.paper
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                          Selected Plan:
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 'bold' }}>
                          {pricingPlans.find(p => p.key === selectedPlan)?.name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                          Base Price:
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                          ₹{calculateBaseSync()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                          GST:
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                          ₹{calculateGSTSync()}
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
                            fontFamily: '"Cormorant Garamond", serif',
                            fontWeight: 'bold'
                          }}
                        >
                          ₹{calculateTotalSync()}
                        </Typography>
                      </Box>
                    </Paper>
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
                      disabled={!selectedPlan}
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
                      <strong>{t('servicePage.selectedPlan', 'Selected Plan:')}</strong> {pricingPlans.find(p => p.key === selectedPlan)?.name || selectedPlan}
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
                            amount={calculateTotalSync()} // Plan total (already includes GST)
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
                          {selectedPlan && (
                            <>
                              <Box sx={{ mb: 2 }}>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: 'bold',
                                    fontFamily: '"Cormorant Garamond", serif',
                                    mb: 1
                                  }}
                                >
                                  Selected Plan: {pricingPlans.find(p => p.key === selectedPlan)?.name}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: '"Cormorant Garamond", serif',
                                    color: theme.palette.text.secondary
                                  }}
                                >
                                  Chat Duration: {pricingPlans.find(p => p.key === selectedPlan)?.chatDurationHours} hours
                                </Typography>
                                {pricingPlans.find(p => p.key === selectedPlan)?.phoneCallAvailable && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontFamily: '"Cormorant Garamond", serif',
                                      color: theme.palette.text.secondary
                                    }}
                                  >
                                    Phone calls available
                                  </Typography>
                                )}
                                {pricingPlans.find(p => p.key === selectedPlan)?.videoCallAvailable && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontFamily: '"Cormorant Garamond", serif',
                                      color: theme.palette.text.secondary
                                    }}
                                  >
                                    Video calls available
                                  </Typography>
                                )}
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
                                  Base Price:
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                >
                                  ₹{calculateBaseSync()}
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
                                  GST:
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                >
                                  ₹{calculateGSTSync()}
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
                                  ₹{calculateTotalSync()}
                                </Typography>
                              </Box>
                            </>
                          )}
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