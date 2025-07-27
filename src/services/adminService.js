import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { assignAdminToChat } from './chatService';

// Get all admins
export const getAllAdmins = async () => {
  try {
    const adminsQuery = query(
      collection(db, 'users'),
      where('roles', 'array-contains', 'admin'),
      orderBy('displayName', 'asc')
    );
    
    const querySnapshot = await getDocs(adminsQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all admins:', error);
    throw new Error(`Failed to get admins: ${error.message}`);
  }
};

// Get available admins (online/active)
export const getAvailableAdmins = async () => {
  try {
    const adminsQuery = query(
      collection(db, 'users'),
      where('roles', 'array-contains', 'admin'),
      orderBy('displayName', 'asc')
    );
    
    const querySnapshot = await getDocs(adminsQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting available admins:', error);
    // Fallback to all admins if status field doesn't exist
    return getAllAdmins();
  }
};

// Automatically assign an admin to a chat (round-robin or least busy)
export const autoAssignAdminToChat = async (chatId) => {
  try {
    const admins = await getAvailableAdmins();
    
    if (admins.length === 0) {
      throw new Error('No available admins found');
    }
    
    // Simple round-robin assignment
    // In a production system, you might want to consider:
    // - Current workload of each admin
    // - Admin's expertise/availability
    // - Time zone considerations
    
    const assignedAdmin = admins[0]; // For now, just pick the first available admin
    
    await assignAdminToChat(chatId, assignedAdmin.id, 'system');
    
    return assignedAdmin;
  } catch (error) {
    console.error('Error auto-assigning admin:', error);
    throw error;
  }
};

// Get admin's current workload (number of active chats)
export const getAdminWorkload = async (adminId) => {
  try {
    const chatsQuery = query(
      collection(db, 'chats'),
      where('adminId', '==', adminId),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(chatsQuery);
    
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('Error getting admin workload:', error);
    return 0;
  }
};

// Get admin's assigned chats
export const getAdminAssignedChats = async (adminId) => {
  try {
    const chatsQuery = query(
      collection(db, 'chats'),
      where('adminId', '==', adminId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(chatsQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting admin assigned chats:', error);
    throw new Error(`Failed to get admin chats: ${error.message}`);
  }
};

// Update admin status (online/offline/busy)
export const updateAdminStatus = async (adminId, status) => {
  try {
    await updateDoc(doc(db, 'users', adminId), {
      status,
      lastStatusUpdate: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating admin status:', error);
    throw error;
  }
};

// Get admin profile
export const getAdminProfile = async (adminId) => {
  try {
    const adminDoc = await getDoc(doc(db, 'users', adminId));
    
    if (!adminDoc.exists()) {
      throw new Error('Admin not found');
    }
    
    const adminData = adminDoc.data();
    
    // Don't return sensitive information
    const { email, phoneNumber, ...safeData } = adminData;
    
    return {
      id: adminDoc.id,
      ...safeData
    };
  } catch (error) {
    console.error('Error getting admin profile:', error);
    throw new Error(`Failed to get admin profile: ${error.message}`);
  }
};

// Check if user is an admin
export const isUserAdmin = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    return userData.roles && userData.roles.includes('admin');
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
};

// Get admin statistics
export const getAdminStats = async (adminId) => {
  try {
    const [assignedChats, adminClientChats] = await Promise.all([
      getAdminAssignedChats(adminId),
      getAdminClientChats(adminId)
    ]);
    
    const activeChats = assignedChats.filter(chat => chat.status === 'active');
    const expiredChats = assignedChats.filter(chat => chat.status === 'expired');
    
    return {
      totalAssignedChats: assignedChats.length,
      activeChats: activeChats.length,
      expiredChats: expiredChats.length,
      adminClientChats: adminClientChats.length,
      workload: activeChats.length
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    throw error;
  }
}; 