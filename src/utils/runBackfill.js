import { backfillChatData, checkChatsForBackfill } from '../services/backfillChatData';

// Function to run backfill with progress reporting
export const runBackfill = async () => {
  try {
    console.log('Starting chat data backfill...');
    
    // First check what needs to be backfilled
    const checkResult = await checkChatsForBackfill();
    console.log('Backfill check result:', checkResult);
    
    if (checkResult.needsBackfill.length === 0) {
      console.log('No chats need backfilling. All chats are up to date!');
      return checkResult;
    }
    
    // Run the backfill
    const result = await backfillChatData();
    console.log('Backfill completed:', result);
    
    return result;
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  }
};

// Function to check backfill status without running it
export const checkBackfillStatus = async () => {
  try {
    const result = await checkChatsForBackfill();
    console.log('Backfill status:', result);
    return result;
  } catch (error) {
    console.error('Error checking backfill status:', error);
    throw error;
  }
};

// Function to run backfill with detailed progress
export const runBackfillWithProgress = async (onProgress) => {
  try {
    console.log('Starting chat data backfill with progress tracking...');
    
    const { needsBackfill } = await checkChatsForBackfill();
    
    if (needsBackfill.length === 0) {
      console.log('No chats need backfilling');
      return { updated: 0, skipped: 0, total: 0 };
    }
    
    let updatedCount = 0;
    
    for (let i = 0; i < needsBackfill.length; i++) {
      const chat = needsBackfill[i];
      
      try {
        // Import the necessary functions
        const { doc, getDoc, updateDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
        const { db } = await import('../firebase/firebaseConfig');
        
        const chatDoc = await getDoc(doc(db, 'chats', chat.id));
        const chatData = chatDoc.data();
        
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
        
        console.log(`Updated chat ${chat.id} (${i + 1}/${needsBackfill.length})`);
        
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

// Make functions available globally for browser console access
if (typeof window !== 'undefined') {
  window.runBackfill = runBackfill;
  window.checkBackfillStatus = checkBackfillStatus;
  window.runBackfillWithProgress = runBackfillWithProgress;
} 