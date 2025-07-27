import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Backfill existing chats with new fields
export const backfillChatData = async () => {
  try {
    console.log('Starting chat data backfill...');
    
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const chatDoc of querySnapshot.docs) {
      const chatData = chatDoc.data();
      
      // Check if chat already has the new fields
      if (chatData.expiryTimestamp && chatData.adminId !== undefined) {
        console.log(`Chat ${chatDoc.id} already has new fields, skipping...`);
        skippedCount++;
        continue;
      }
      
      // Calculate expiry timestamp (24 hours from createdAt)
      const createdAt = chatData.createdAt?.toDate();
      if (!createdAt) {
        console.log(`Chat ${chatDoc.id} has no createdAt, skipping...`);
        skippedCount++;
        continue;
      }
      
      const expiryTimestamp = new Date(createdAt);
      expiryTimestamp.setHours(expiryTimestamp.getHours() + 24);
      
      // Prepare update data
      const updateData = {
        updatedAt: serverTimestamp()
      };
      
      // Add expiry timestamp if not present
      if (!chatData.expiryTimestamp) {
        updateData.expiryTimestamp = Timestamp.fromMillis(expiryTimestamp.getTime());
      }
      
      // Add admin fields if not present
      if (chatData.adminId === undefined) {
        updateData.adminId = null;
        updateData.adminAssignmentHistory = [];
      }
      
      // Add feedback fields if not present
      if (chatData.feedback === undefined) {
        updateData.feedback = null;
      }
      
      // Add extension history if not present
      if (chatData.extensionHistory === undefined) {
        updateData.extensionHistory = [];
      }
      
      // Update the chat document
      await updateDoc(doc(db, 'chats', chatDoc.id), updateData);
      
      console.log(`Updated chat ${chatDoc.id}`);
      updatedCount++;
    }
    
    console.log(`Backfill completed. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    
    return {
      updated: updatedCount,
      skipped: skippedCount,
      total: querySnapshot.docs.length
    };
  } catch (error) {
    console.error('Error during chat data backfill:', error);
    throw error;
  }
};

// Check which chats need backfilling
export const checkChatsForBackfill = async () => {
  try {
    console.log('Checking chats for backfill...');
    
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const needsBackfill = [];
    const alreadyUpdated = [];
    
    for (const chatDoc of querySnapshot.docs) {
      const chatData = chatDoc.data();
      
      const missingFields = [];
      
      if (!chatData.expiryTimestamp) {
        missingFields.push('expiryTimestamp');
      }
      
      if (chatData.adminId === undefined) {
        missingFields.push('adminId');
      }
      
      if (chatData.feedback === undefined) {
        missingFields.push('feedback');
      }
      
      if (chatData.extensionHistory === undefined) {
        missingFields.push('extensionHistory');
      }
      
      if (missingFields.length > 0) {
        needsBackfill.push({
          id: chatDoc.id,
          missingFields,
          createdAt: chatData.createdAt
        });
      } else {
        alreadyUpdated.push(chatDoc.id);
      }
    }
    
    console.log(`Chats needing backfill: ${needsBackfill.length}`);
    console.log(`Chats already updated: ${alreadyUpdated.length}`);
    
    return {
      needsBackfill,
      alreadyUpdated,
      total: querySnapshot.docs.length
    };
  } catch (error) {
    console.error('Error checking chats for backfill:', error);
    throw error;
  }
};

// Run backfill with progress tracking
export const runBackfillWithProgress = async (onProgress) => {
  try {
    const { needsBackfill } = await checkChatsForBackfill();
    
    if (needsBackfill.length === 0) {
      console.log('No chats need backfilling');
      return { updated: 0, skipped: 0, total: 0 };
    }
    
    let updatedCount = 0;
    
    for (let i = 0; i < needsBackfill.length; i++) {
      const chat = needsBackfill[i];
      
      try {
        const chatData = (await getDocs(doc(db, 'chats', chat.id))).data();
        
        // Calculate expiry timestamp
        const createdAt = chatData.createdAt?.toDate();
        if (!createdAt) {
          console.log(`Skipping chat ${chat.id} - no createdAt`);
          continue;
        }
        
        const expiryTimestamp = new Date(createdAt);
        expiryTimestamp.setHours(expiryTimestamp.getHours() + 24);
        
        // Update the chat
        await updateDoc(doc(db, 'chats', chat.id), {
          expiryTimestamp: Timestamp.fromMillis(expiryTimestamp.getTime()),
          adminId: null,
          adminAssignmentHistory: [],
          feedback: null,
          extensionHistory: [],
          updatedAt: serverTimestamp()
        });
        
        updatedCount++;
        
        // Report progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: needsBackfill.length,
            chatId: chat.id,
            updatedCount
          });
        }
        
      } catch (error) {
        console.error(`Error updating chat ${chat.id}:`, error);
      }
    }
    
    console.log(`Backfill completed. Updated: ${updatedCount}`);
    return { updated: updatedCount, skipped: needsBackfill.length - updatedCount, total: needsBackfill.length };
    
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  }
}; 