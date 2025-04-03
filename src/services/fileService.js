import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

// Upload a single file to Firebase Storage
export const uploadFile = async (file, path) => {
  try {
    // Create a unique filename to prevent collisions
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const fullPath = `${path}/${fileName}`;
    
    // Create a reference to the file location
    const fileRef = ref(storage, fullPath);
    
    // Upload the file
    const snapshot = await uploadBytes(fileRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      path: fullPath,
      url: downloadURL
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Upload multiple files to Firebase Storage
export const uploadFiles = async (files, path) => {
  try {
    const uploadPromises = files.map(file => uploadFile(file, path));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading files:', error);
    throw new Error(`Failed to upload files: ${error.message}`);
  }
}; 