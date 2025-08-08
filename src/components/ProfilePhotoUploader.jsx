import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography, Alert, Avatar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';
import { updateProfile } from 'firebase/auth';
import FileUploadSection from './FileUploadSection';
import ImageCropper from './ImageCropper';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const ProfilePhotoUploader = ({ onPhotoUpdate, isSignup = false, onFileChange }) => {
  const { t } = useTranslation('common');
  const { currentUser } = useAuth();
  const [photo, setPhoto] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handlePhotoUpload = async () => {
    if (!currentUser || photo.length === 0) {
      setError('Please select a photo to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Upload photo to Firebase Storage
      const photoRef = ref(storage, `users/${currentUser.uid}/profile-picture/${photo[0].name}`);
      const uploadTask = await uploadBytes(photoRef, photo[0]);
      const downloadURL = await getDownloadURL(uploadTask.ref);

      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        photoURL: downloadURL
      });

      // Update user document in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL,
        updatedAt: serverTimestamp()
      });

      // Call the callback if provided
      if (onPhotoUpdate) {
        onPhotoUpdate(downloadURL);
      }

      // Clear the photo selection
      setPhoto([]);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setShowCropper(true);
    }
  };

  const handleCropComplete = (croppedFile) => {
    setPhoto([croppedFile]);
    setSelectedFile(null);
    setShowCropper(false);
    
    // For signup process, call the parent's onFileChange
    if (isSignup && onFileChange) {
      onFileChange([croppedFile]);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (name) => {
    if (!name) return '#B39DDB';
    
    const colors = [
      '#FFCCBC', // Peach
      '#FFECB3', // Light Amber
      '#C8E6C9', // Light Green
      '#B3E5FC', // Light Blue
      '#D1C4E9', // Light Purple
      '#F8BBD0', // Light Pink
      '#B2DFDB', // Light Teal
      '#DCEDC8', // Light Lime
    ];
    
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontFamily: '"Cormorant Garamond", serif' }}>
        {t('profile.photoTitle', 'Profile Photo')}
      </Typography>
      
      {/* Current Profile Photo Display - Only show for existing users */}
      {!isSignup && currentUser && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar 
            src={currentUser?.photoURL}
            sx={{ 
              width: 80, 
              height: 80, 
              mr: 2,
              bgcolor: getAvatarColor(currentUser?.displayName),
              color: 'white',
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              fontSize: '1.5rem'
            }}
          >
            {currentUser?.photoURL ? null : getInitials(currentUser?.displayName)}
          </Avatar>
          <Box>
            <Typography variant="body1" sx={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 500 }}>
              {currentUser?.displayName || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
              {currentUser?.photoURL ? 'Profile photo uploaded' : 'No profile photo yet'}
            </Typography>
          </Box>
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: '"Cormorant Garamond", serif' }}>
        {t('profile.photoDescription', 'Upload a clear, professional photo of yourself. You can crop it to a perfect circle.')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <FileUploadSection
        files={photo}
        onFilesChange={handleFileSelect}
        multiple={false}
        accept="image/*"
        icon={<AccountCircleIcon fontSize="large" />}
      />

      {/* Upload button - Only show for existing users */}
      {!isSignup && photo.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
            Photo selected: {photo[0].name}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePhotoUpload}
            disabled={loading}
            sx={{ 
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '1rem'
            }}
          >
            {loading ? <CircularProgress size={20} /> : t('profile.uploadPhoto', 'Upload Photo')}
          </Button>
        </Box>
      )}

      <ImageCropper
        open={showCropper}
        onClose={() => setShowCropper(false)}
        imageFile={selectedFile}
        onCropComplete={handleCropComplete}
        circular={true}
      />
    </Box>
  );
};

export default ProfilePhotoUploader; 