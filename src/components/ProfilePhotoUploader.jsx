import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';
import { updateProfile } from 'firebase/auth';
import FileUploadSection from './FileUploadSection';
import ImageCropper from './ImageCropper';

const ProfilePhotoUploader = ({ onPhotoUpdate }) => {
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
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {t('profile.photoTitle', 'Profile Photo')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('profile.photoDescription', 'Upload a clear, professional photo of yourself.')}
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
      />

      <Button
        variant="contained"
        color="primary"
        onClick={handlePhotoUpload}
        disabled={loading || photo.length === 0}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : t('profile.uploadPhoto', 'Upload Photo')}
      </Button>

      <ImageCropper
        open={showCropper}
        onClose={() => setShowCropper(false)}
        imageFile={selectedFile}
        onCropComplete={handleCropComplete}
      />
    </Box>
  );
};

export default ProfilePhotoUploader; 