import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp,
    doc,
    getDoc,
    updateDoc,
    where,
    onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';

// Get all chats for a user
export const getUserChats = (userId, callback) => {
    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, async (snapshot) => {
        const chats = [];
        
        for (const _doc of snapshot.docs) {
            const chatData = _doc.data();
            
            // Get other participant details
            const otherParticipantId = chatData.participants.find(id => id !== userId);
            let otherParticipant = null;
            
            if (otherParticipantId) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        otherParticipant = {
                            id: otherParticipantId,
                            displayName: userData.displayName || 'User',
                            photoURL: userData.photoURL || null
                        };
                    }
                } catch (error) {
                    console.error("Error fetching other participant:", error);
                }
            }
            
            chats.push({
                id: _doc.id,
                ...chatData,
                otherParticipant
            });
        }
        
        callback(chats);
    }, (error) => {
        console.error("Error listening to user chats:", error);
    });
};

// Get messages for a specific chat
export const getChatMessages = (chatId, callback) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    // Return the unsubscribe function so we can clean up when component unmounts
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp
        }));
        callback(messages);
    }, (error) => {
        console.error("Error listening to chat messages:", error);
    });
};

// Send a text message
export const sendTextMessage = async (chatId, senderId, text) => {
    try {
        // Add the message to messages subcollection
        const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
            senderId,
            text,
            timestamp: serverTimestamp(),
            read: false,
            type: 'text'
        });

        // Update the last message in the chat document
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: {
                text: text.length > 50 ? text.substring(0, 50) + '...' : text,
                timestamp: serverTimestamp(),
                senderId
            },
            updatedAt: serverTimestamp()
        });

        return messageRef.id;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// Upload a file and send as a message
export const sendFileMessage = async (chatId, senderId, file, description = '') => {
    try {
        // Get the chat document to determine service type
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        const chatData = chatDoc.exists() ? chatDoc.data() : {};
        const serviceType = chatData.serviceType || 'general';
        
        // Determine appropriate file naming based on service type
        let newFileName;
        const fileExtension = file.name.split('.').pop();
        
        // Query existing files to determine appropriate numbering
        const filesQuery = query(collection(db, 'chats', chatId, 'files'));
        const filesSnapshot = await getDocs(filesQuery);
        const existingFiles = filesSnapshot.docs.map(doc => doc.data());
        
        if (serviceType === 'marriageMatching') {
            // For marriage matching, try to determine if this is bride or groom
            // Default to "Jathak" if we can't determine
            const brideFiles = existingFiles.filter(f => f.name.startsWith('Bride_'));
            const groomFiles = existingFiles.filter(f => f.name.startsWith('Groom_'));
            
            if (brideFiles.length <= groomFiles.length) {
                newFileName = `Bride_Jathak_${brideFiles.length + 1}.${fileExtension}`;
            } else {
                newFileName = `Groom_Jathak_${groomFiles.length + 1}.${fileExtension}`;
            }
        } else {
            // For other services, just number sequentially
            const jathakFiles = existingFiles.filter(f => f.name.startsWith('Jathak_'));
            newFileName = `Jathak_${jathakFiles.length + 1}.${fileExtension}`;
        }
        
        // 1. Upload file to Firebase Storage
        const storageRef = ref(storage, `chats/${chatId}/files/${newFileName}`);
        const uploadTask = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        // 2. Create file reference in files subcollection
        const fileRef = await addDoc(collection(db, 'chats', chatId, 'files'), {
            name: newFileName,
            originalName: file.name,
            type: file.type,
            size: file.size,
            url: downloadURL,
            uploadedBy: senderId,
            uploadedAt: serverTimestamp(),
            serviceType: serviceType // Include the service type
        });
        
        // 3. Add message referencing the file
        const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
            senderId,
            timestamp: serverTimestamp(),
            read: false,
            type: 'file',
            fileReference: {
                id: fileRef.id,
                name: newFileName,
                url: downloadURL,
                type: file.type
            },
            text: description || `Sent a file: ${file.name}`
        });
        
        // 4. Update the last message in the chat document
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: {
                text: `Sent a file: ${newFileName}`,
                timestamp: serverTimestamp(),
                senderId
            },
            updatedAt: serverTimestamp()
        });
        
        return messageRef.id;
    } catch (error) {
        console.error('Error sending file message:', error);
        throw error;
    }
};

// Get all files shared in a chat
export const getChatFiles = async (chatId) => {
    try {
        const filesRef = collection(db, 'chats', chatId, 'files');
        const q = query(filesRef, orderBy('uploadedAt', 'desc'));

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting chat files:', error);
        throw error;
    }
};

// Mark messages as read
export const markMessagesAsRead = async (chatId, userId) => {
    try {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(
            messagesRef,
            where('read', '==', false),
            where('senderId', '!=', userId)
        );

        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);
        querySnapshot.docs.forEach(document => {
            batch.update(document.ref, { read: true });
        });

        await batch.commit();
        return querySnapshot.docs.length; // Return number of messages marked as read
    } catch (error) {
        console.error('Error marking messages as read:', error);
        throw error;
    }
};

// Send a voice message
export const sendVoiceMessage = async (chatId, senderId, audioBlob, duration) => {
    try {
        // Create a unique filename for the voice message
        const timestamp = new Date().getTime();
        const fileName = `voice_message_${timestamp}.webm`;
        
        // 1. Upload audio file to Firebase Storage
        const storageRef = ref(storage, `chats/${chatId}/voice/${fileName}`);
        const uploadTask = await uploadBytes(storageRef, audioBlob);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        // 2. Add message referencing the voice file
        const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
            senderId,
            timestamp: serverTimestamp(),
            read: false,
            type: 'voice',
            voiceReference: {
                url: downloadURL,
                duration: duration, // Duration in seconds
                fileName: fileName
            },
            text: 'Voice message' // Default text for the message
        });
        
        // 3. Update the last message in the chat document
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: {
                text: 'Voice message',
                timestamp: serverTimestamp(),
                senderId
            },
            updatedAt: serverTimestamp()
        });
        
        return messageRef.id;
    } catch (error) {
        console.error('Error sending voice message:', error);
        throw error;
    }
}; 