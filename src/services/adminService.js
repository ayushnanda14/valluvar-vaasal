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
  arrayUnion,
  addDoc
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

// Get all support users
export const getAllSupportUsers = async () => {
  try {
    const supportQuery = query(
      collection(db, 'users'),
      where('roles', 'array-contains', 'support'),
      orderBy('displayName', 'asc')
    );
    
    const querySnapshot = await getDocs(supportQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all support users:', error);
    throw new Error(`Failed to get support users: ${error.message}`);
  }
};

// Get all users who can be assigned to chats (admins + support)
export const getAllAssignableUsers = async () => {
  try {
    const [admins, supportUsers] = await Promise.all([
      getAllAdmins(),
      getAllSupportUsers()
    ]);
    
    return {
      admins,
      supportUsers,
      allUsers: [
        ...admins.map(admin => ({ ...admin, userType: 'admin' })),
        ...supportUsers.map(support => ({ ...support, userType: 'support' }))
      ]
    };
  } catch (error) {
    console.error('Error getting assignable users:', error);
    throw error;
  }
};

// Create support user signup link
export const createSupportSignupLink = async (creator) => {
  try {
    if (!creator || !creator.uid) {
      throw new Error('Invalid creator object');
    }

    const linkData = {
      type: 'support_signup',
      createdBy: creator.uid,
      createdByName: creator.displayName || creator.email || 'Unknown',
      createdByEmail: creator.email || 'Unknown',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      used: false
    };
    
    const linkRef = await addDoc(collection(db, 'signupLinks'), linkData);
    
    return {
      id: linkRef.id,
      url: `/signup/support?token=${linkRef.id}`,
      ...linkData
    };
  } catch (error) {
    console.error('Error creating support signup link:', error);
    throw error;
  }
};

// Create partner signup link
export const createPartnerSignupLink = async (creator, commissionConfig = {}) => {
  try {
    if (!creator || !creator.uid) {
      throw new Error('Invalid creator object');
    }

    const linkData = {
      type: 'partner_signup',
      createdBy: creator.uid,
      createdByName: creator.displayName || creator.email || 'Unknown',
      createdByEmail: creator.email || 'Unknown',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      used: false,
      commissionMode: commissionConfig.mode || 'percent', // 'percent' | 'fixed' | 'both'
      percent: typeof commissionConfig.percent === 'number' ? commissionConfig.percent : 10,
      fixedAmount: typeof commissionConfig.fixedAmount === 'number' ? commissionConfig.fixedAmount : 0,
    };

    const linkRef = await addDoc(collection(db, 'signupLinks'), linkData);

    return {
      id: linkRef.id,
      url: `/signup/partner?token=${linkRef.id}`,
      ...linkData
    };
  } catch (error) {
    console.error('Error creating partner signup link:', error);
    throw error;
  }
};

// Validate partner signup link
export const validatePartnerSignupLink = async (token) => {
  try {
    const linkDoc = await getDoc(doc(db, 'signupLinks', token));
    if (!linkDoc.exists()) throw new Error('Invalid signup link');
    const linkData = linkDoc.data();
    if (linkData.used) throw new Error('This signup link has already been used');
    if (linkData.type !== 'partner_signup') throw new Error('Invalid link type');
    const now = new Date();
    const expiresAt = linkData.expiresAt?.toDate ? linkData.expiresAt.toDate() : linkData.expiresAt;
    if (now > expiresAt) throw new Error('This signup link has expired');
    return linkData;
  } catch (error) {
    console.error('Error validating partner signup link:', error);
    throw error;
  }
};

// Validate support signup link
export const validateSupportSignupLink = async (token) => {
  try {
    const linkDoc = await getDoc(doc(db, 'signupLinks', token));
    
    if (!linkDoc.exists()) {
      throw new Error('Invalid signup link');
    }
    
    const linkData = linkDoc.data();
    
    if (linkData.used) {
      throw new Error('This signup link has already been used');
    }
    
    if (linkData.type !== 'support_signup') {
      throw new Error('Invalid link type');
    }
    
    const now = new Date();
    const expiresAt = linkData.expiresAt?.toDate ? linkData.expiresAt.toDate() : linkData.expiresAt;
    
    if (now > expiresAt) {
      throw new Error('This signup link has expired');
    }
    
    return linkData;
  } catch (error) {
    console.error('Error validating support signup link:', error);
    throw error;
  }
};

// Mark signup link as used
export const markSignupLinkAsUsed = async (token) => {
  try {
    await updateDoc(doc(db, 'signupLinks', token), {
      used: true,
      usedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking signup link as used:', error);
    throw error;
  }
};

// Get all signup links
export const getAllSignupLinks = async () => {
  try {
    const linksQuery = query(
      collection(db, 'signupLinks'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(linksQuery);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure createdAt is properly handled
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        // Ensure expiresAt is properly handled
        expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : data.expiresAt
      };
    });
  } catch (error) {
    console.error('Error getting signup links:', error);
    throw error;
  }
}; 