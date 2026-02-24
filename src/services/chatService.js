import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
  startAfter,
    serverTimestamp,
    doc,
    getDoc,
    updateDoc,
    where,
    onSnapshot,
    writeBatch,
    Timestamp,
    arrayUnion
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

// Real-time listener for the most recent chats with pagination size
export const listenUserChatsPage = (userId, pageSize = 10, callback) => {
    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc'),
        limit(pageSize)
    );

    return onSnapshot(q, async (snapshot) => {
        const docs = snapshot.docs;
        const chats = await Promise.all(docs.map(async (_doc) => {
            const chatData = _doc.data();
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
            return {
                id: _doc.id,
                ...chatData,
                otherParticipant
            };
        }));

        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        callback({ chats, lastDoc });
    }, (error) => {
        console.error('Error listening to paginated user chats:', error);
    });
};

// Fetch older chats (next page) after the last document from previous page
export const fetchMoreUserChats = async (userId, lastDoc, pageSize = 10) => {
    if (!lastDoc) return { chats: [], lastDoc: null, hasMore: false };

    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc'),
        limit(pageSize),
        // Use the document snapshot cursor
        startAfter(lastDoc)
    );

    try {
        const snapshot = await getDocs(q);
        const docs = snapshot.docs;
        const chats = await Promise.all(docs.map(async (_doc) => {
            const chatData = _doc.data();
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
            return {
                id: _doc.id,
                ...chatData,
                otherParticipant
            };
        }));

        const newLastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        return { chats, lastDoc: newLastDoc, hasMore: docs.length === pageSize };
    } catch (error) {
        console.error('Error fetching more user chats:', error);
        return { chats: [], lastDoc: null, hasMore: false };
    }
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

// Submit feedback for a chat (after expiry)
export const submitFeedback = async (chatId, feedbackData) => {
    try {
        await updateDoc(doc(db, 'chats', chatId), {
            feedback: {
                rating: feedbackData.rating,
                comment: feedbackData.comment,
                submittedAt: serverTimestamp(),
                visibleToAstrologer: false // Default to false, admin can change this
            },
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        throw error;
    }
};

// Assign an admin to a chat
export const assignAdminToChat = async (chatId, adminId, assignedBy) => {
    try {
        const adminAssignment = {
            adminId,
            assignedBy,
            assignedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'chats', chatId), {
            adminId,
            adminAssignmentHistory: arrayUnion(adminAssignment),
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error assigning admin to chat:', error);
        throw error;
    }
};

// Extend chat expiry by a specified number of hours
export const extendChatExpiry = async (chatId, extensionHours, extendedBy) => {
    try {
        console.log('Extending chat expiry', chatId);
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (!chatDoc.exists()) {
            console.log('Chat not found', chatId);
            throw new Error('Chat not found');
        }

        const chatData = chatDoc.data();
        
        // Handle expiryTimestamp - it could be a Firestore Timestamp or a number (milliseconds)
        let currentExpiryMillis;
        if (chatData.expiryTimestamp) {
            // If it's a Firestore Timestamp, convert to milliseconds
            if (chatData.expiryTimestamp.toMillis) {
                currentExpiryMillis = chatData.expiryTimestamp.toMillis();
            } else if (typeof chatData.expiryTimestamp === 'number') {
                currentExpiryMillis = chatData.expiryTimestamp;
            } else {
                // Fallback: try to convert
                currentExpiryMillis = new Date(chatData.expiryTimestamp).getTime();
            }
        } else {
            // Fallback to planDurationHours or default 24 hours
            const planDurationHours = chatData.planDurationHours || 24;
            const createdAtMillis = chatData.createdAt?.toMillis ? chatData.createdAt.toMillis() : 
                                    (chatData.createdAt?.toDate ? chatData.createdAt.toDate().getTime() : Date.now());
            currentExpiryMillis = createdAtMillis + (planDurationHours * 60 * 60 * 1000);
        }

        const newExpiryMillis = currentExpiryMillis + (extensionHours * 60 * 60 * 1000);

        await updateDoc(doc(db, 'chats', chatId), {
            expiryTimestamp: Timestamp.fromMillis(newExpiryMillis),
            extensionHistory: arrayUnion({
                extendedBy,
                extensionHours,
                extendedAt: new Date().toISOString(),
                previousExpiry: Timestamp.fromMillis(currentExpiryMillis)
            }),
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error extending chat expiry:', error);
        throw error;
    }
};

// Create a separate admin-client chat thread
export const createAdminClientChat = async (mainChatId, clientId, adminId = null) => {
    try {
        // Get client details
        const clientDoc = await getDoc(doc(db, 'users', clientId));

        if (!clientDoc.exists()) {
            throw new Error('Client not found');
        }

        const clientData = clientDoc.data();

        // If no adminId provided, auto-assign one
        let adminData = null;
        let actualAdminId = adminId;

        if (!actualAdminId) {
            try {
                const { autoAssignAdminToChat } = await import('./adminService');
                const assignedAdmin = await autoAssignAdminToChat(mainChatId);
                actualAdminId = assignedAdmin.id;
                adminData = assignedAdmin;
            } catch (error) {
                console.error('Error auto-assigning admin:', error);
                // Create a mock admin if no real admin is available
                actualAdminId = 'system-admin';
                adminData = {
                    displayName: 'Admin Support',
                    photoURL: null
                };
            }
        } else {
            // Get admin details if adminId is provided
            const adminDoc = await getDoc(doc(db, 'users', actualAdminId));
            if (!adminDoc.exists()) {
                throw new Error('Admin not found');
            }
            adminData = adminDoc.data();
        }

        // Create the admin-client chat
        const adminChatRef = await addDoc(collection(db, 'adminClientChats'), {
            mainChatId,
            participants: [clientId, actualAdminId],
            clientId,
            clientName: clientData.displayName || 'Client',
            adminId: actualAdminId,
            adminName: adminData.displayName || 'Admin',
            participantNames: {
                [clientId]: clientData.displayName || 'Client',
                [actualAdminId]: adminData.displayName || 'Admin'
            },
            participantAvatars: {
                [clientId]: clientData.photoURL || null,
                [actualAdminId]: adminData.photoURL || null
            },
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: {
                text: 'Admin support chat initiated',
                timestamp: serverTimestamp(),
                senderId: actualAdminId
            }
        });

        // Add initial system message to admin chat
        await addDoc(collection(db, 'adminClientChats', adminChatRef.id, 'messages'), {
            text: `Support chat initiated by ${adminData.displayName}. How can we help you?`,
            senderId: 'system',
            timestamp: serverTimestamp(),
            read: false,
            type: 'text'
        });

        // Notify admin about the new client chat
        await notifyAdminAboutClientChat(adminChatRef.id, clientId, clientData.displayName || 'Client');

        // Add system message to main chat about admin chat creation
        await addDoc(collection(db, 'chats', mainChatId, 'messages'), {
            text: `Admin support chat created. Click to open admin chat.`,
            senderId: 'system',
            timestamp: serverTimestamp(),
            read: false,
            type: 'text',
            adminChatId: adminChatRef.id,
            isAdminChatLink: true
        });

        return adminChatRef.id;
    } catch (error) {
        console.error('Error creating admin-client chat:', error);
        throw error;
    }
};

// Check if admin chat exists for a main chat
export const getExistingAdminChat = async (mainChatId) => {
    try {
        const adminChatsQuery = query(
            collection(db, 'adminClientChats'),
            where('mainChatId', '==', mainChatId),
            where('status', '==', 'active')
        );

        const querySnapshot = await getDocs(adminChatsQuery);

        if (!querySnapshot.empty) {
            const adminChatDoc = querySnapshot.docs[0];
            return {
                id: adminChatDoc.id,
                ...adminChatDoc.data()
            };
        }

        return null;
    } catch (error) {
        console.error('Error checking for existing admin chat:', error);
        return null;
    }
};

// Check for unresolved admin chats for a main chat
export const getUnresolvedAdminChats = async (mainChatId) => {
    try {
        const adminChatsQuery = query(
            collection(db, 'adminClientChats'),
            where('mainChatId', '==', mainChatId),
            where('status', '==', 'active')
        );

        const querySnapshot = await getDocs(adminChatsQuery);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error checking for unresolved admin chats:', error);
        return [];
    }
};

// Mark admin chat as resolved
export const markAdminChatResolved = async (adminChatId) => {
    try {
        await updateDoc(doc(db, 'adminClientChats', adminChatId), {
            status: 'resolved',
            resolvedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error marking admin chat as resolved:', error);
        throw error;
    }
};

// Notify admin about new client chat
export const notifyAdminAboutClientChat = async (adminChatId, clientId, clientName) => {
    try {
        // Add a system message to notify admin
        await addDoc(collection(db, 'adminClientChats', adminChatId, 'messages'), {
            text: `Client ${clientName} has opened an admin support chat. Please respond promptly.`,
            senderId: 'system',
            timestamp: serverTimestamp(),
            read: false,
            type: 'text'
        });
    } catch (error) {
        console.error('Error notifying admin about client chat:', error);
        throw error;
    }
};

// Get admin-client chat messages
export const getAdminClientChatMessages = (adminChatId, callback) => {
    const messagesRef = collection(db, 'adminClientChats', adminChatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp
        }));
        callback(messages);
    }, (error) => {
        console.error("Error listening to admin chat messages:", error);
    });
};

// Send message in admin-client chat
export const sendAdminClientMessage = async (adminChatId, senderId, text) => {
    try {
        // Add the message to messages subcollection
        const messageRef = await addDoc(collection(db, 'adminClientChats', adminChatId, 'messages'), {
            senderId,
            text,
            timestamp: serverTimestamp(),
            read: false,
            type: 'text'
        });

        // Update the last message in the chat document
        await updateDoc(doc(db, 'adminClientChats', adminChatId), {
            lastMessage: {
                text: text.length > 50 ? text.substring(0, 50) + '...' : text,
                timestamp: serverTimestamp(),
                senderId
            },
            updatedAt: serverTimestamp()
        });

        return messageRef.id;
    } catch (error) {
        console.error('Error sending admin client message:', error);
        throw error;
    }
};

// Get all admin-client chats for an admin
export const getAdminClientChats = (adminId, callback) => {
    const chatsRef = collection(db, 'adminClientChats');
    const q = query(
        chatsRef,
        where('adminId', '==', adminId),
        orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
        const chats = [];

        for (const _doc of snapshot.docs) {
            const chatData = _doc.data();

            // Get other participant details
            const otherParticipantId = chatData.participants.find(id => id !== adminId);
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
        console.error("Error listening to admin client chats:", error);
    });
};

// Toggle feedback visibility to astrologer
export const toggleFeedbackVisibility = async (chatId, visibleToAstrologer) => {
    try {
        await updateDoc(doc(db, 'chats', chatId), {
            'feedback.visibleToAstrologer': visibleToAstrologer,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error toggling feedback visibility:', error);
        throw error;
    }
};

// Get chat expiry status
export const getChatExpiryStatus = async (chatId) => {
    try {
        console.log('Getting chat expiry status', chatId);
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (!chatDoc.exists()) {
            throw new Error('Chat not found');
        }

        const chatData = chatDoc.data();
        
        // Handle expiryTimestamp - it could be a Firestore Timestamp or a number (milliseconds)
        let expiryMillis;
        if (chatData.expiryTimestamp) {
            // If it's a Firestore Timestamp, convert to milliseconds
            if (chatData.expiryTimestamp.toMillis) {
                expiryMillis = chatData.expiryTimestamp.toMillis();
            } else if (typeof chatData.expiryTimestamp === 'number') {
                expiryMillis = chatData.expiryTimestamp;
            } else {
                // Fallback: try to convert
                expiryMillis = new Date(chatData.expiryTimestamp).getTime();
            }
        } else {
            // Fallback to planDurationHours or default 24 hours
            const planDurationHours = chatData.planDurationHours || 24;
            const createdAtMillis = chatData.createdAt?.toMillis ? chatData.createdAt.toMillis() : 
                                    (chatData.createdAt?.toDate ? chatData.createdAt.toDate().getTime() : Date.now());
            expiryMillis = createdAtMillis + (planDurationHours * 60 * 60 * 1000);
        }

        const now = Date.now();
        const isExpired = now > expiryMillis;
        const timeUntilExpiry = Math.max(0, expiryMillis - now);

        return {
            isExpired,
            timeUntilExpiry,
            expiryTimestamp: Timestamp.fromMillis(expiryMillis),
            hasBeenExtended: !!chatData.expiryTimestamp
        };
    } catch (error) {
        console.error('Error getting chat expiry status:', error);
        throw error;
    }
};

// Mark chat as completed
export const markChatAsCompleted = async (chatId, completedBy) => {
    try {
        await updateDoc(doc(db, 'chats', chatId), {
            status: 'completed',
            completedAt: serverTimestamp(),
            completedBy: completedBy,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error marking chat as completed:', error);
        throw error;
    }
};

// Assign a support user to a chat
export const assignSupportUserToChat = async (chatId, supportUserId, assignedBy) => {
    try {
        const supportAssignment = {
            supportUserId,
            assignedBy,
            assignedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'chats', chatId), {
            supportUserId,
            supportAssignmentHistory: arrayUnion(supportAssignment),
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error assigning support user to chat:', error);
        throw error;
    }
};

// Assign astrologer to chat (updates chat, payment, and serviceRequest)
export const assignAstrologerToChat = async (chatId, astrologerId, assignedBy) => {
    try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (!chatDoc.exists()) {
            throw new Error('Chat not found');
        }

        const chatData = chatDoc.data();
        const clientId = chatData.clientId || chatData.userId;
        if (!clientId) {
            throw new Error('Client ID not found in chat');
        }

        const astrologerDoc = await getDoc(doc(db, 'users', astrologerId));
        if (!astrologerDoc.exists()) {
            throw new Error('Astrologer not found');
        }

        const astrologerData = astrologerDoc.data();
        const previousAstrologerId = chatData.astrologerId;
        const previousAstrologerName = chatData.astrologerName || 'Previous Astrologer';
        const isReassignment = previousAstrologerId && previousAstrologerId !== astrologerId;

        const batch = writeBatch(db);

        // Build participantNames and participantAvatars, removing old astrologer if reassigning
        const participantNames = { ...chatData.participantNames };
        const participantAvatars = { ...chatData.participantAvatars };
        
        // Remove old astrologer from participantNames and participantAvatars if reassigning
        if (isReassignment && previousAstrologerId) {
            delete participantNames[previousAstrologerId];
            delete participantAvatars[previousAstrologerId];
        }
        
        // Add new astrologer
        participantNames[astrologerId] = astrologerData.displayName || 'Astrologer';
        participantAvatars[astrologerId] = astrologerData.photoURL || null;

        // Update chat document - replace participants array to ensure only client + new astrologer
        const chatRef = doc(db, 'chats', chatId);
        batch.update(chatRef, {
            astrologerId: astrologerId,
            astrologerName: astrologerData.displayName || 'Astrologer',
            participants: [clientId, astrologerId], // Replace instead of arrayUnion to remove old astrologer
            participantNames: participantNames,
            participantAvatars: participantAvatars,
            updatedAt: serverTimestamp()
        });

        // Update payment document if serviceRequestId exists
        if (chatData.serviceRequestId) {
            const serviceRequestDoc = await getDoc(doc(db, 'serviceRequests', chatData.serviceRequestId));
            if (serviceRequestDoc.exists()) {
                // Update serviceRequest
                const serviceRequestRef = doc(db, 'serviceRequests', chatData.serviceRequestId);
                batch.update(serviceRequestRef, {
                    astrologerId: astrologerId,
                    updatedAt: serverTimestamp()
                });

                // Find and update payment document
                const paymentsQuery = query(
                    collection(db, 'payments'),
                    where('serviceRequestId', '==', chatData.serviceRequestId)
                );
                const paymentsSnapshot = await getDocs(paymentsQuery);
                if (!paymentsSnapshot.empty) {
                    const paymentDoc = paymentsSnapshot.docs[0];
                    const paymentRef = doc(db, 'payments', paymentDoc.id);
                    batch.update(paymentRef, {
                        astrologerId: astrologerId,
                        astrologerName: astrologerData.displayName || 'Astrologer',
                        updatedAt: serverTimestamp()
                    });
                }
            }
        }

        // Add system message about astrologer assignment or reassignment
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const systemMessageText = isReassignment
            ? `Astrologer reassigned from ${previousAstrologerName} to ${astrologerData.displayName || 'Astrologer'}.`
            : `Astrologer assigned: ${astrologerData.displayName || 'Astrologer'}.`;
        
        batch.set(doc(messagesRef), {
            senderId: 'system',
            text: systemMessageText,
            timestamp: serverTimestamp(),
            read: false,
            type: 'text'
        });

        // Update last message
        batch.update(chatRef, {
            lastMessage: {
                text: isReassignment 
                    ? `Astrologer reassigned to ${astrologerData.displayName || 'Astrologer'}.`
                    : `Astrologer assigned: ${astrologerData.displayName || 'Astrologer'}.`,
                timestamp: serverTimestamp(),
                senderId: 'system'
            }
        });

        await batch.commit();
        return true;
    } catch (error) {
        console.error('Error assigning astrologer to chat:', error);
        throw error;
    }
};

// Send message on behalf of astrologer (for support users)
export const sendMessageOnBehalfOfAstrologer = async (chatId, messageText, supportUserId) => {
    try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (!chatDoc.exists()) {
            throw new Error('Chat not found');
        }

        const chatData = chatDoc.data();
        const astrologerId = chatData.astrologerId;

        // if (!astrologerId) {
        //     throw new Error('No astrologer found for this chat');
        // }

        // Add message to chat
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesRef, {
            text: messageText,
            senderId: astrologerId, // Message appears to come from astrologer
            actualSenderId: supportUserId, // Track who actually sent it
            timestamp: serverTimestamp(),
            type: 'text',
            sentBySupport: true
        });

        // Update chat's last message
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: {
                text: messageText,
                timestamp: serverTimestamp(),
                senderId: supportUserId
            },
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error sending message on behalf of astrologer:', error);
        throw error;
    }
};

// Send message to astrologer (for support users)
export const sendMessageToAstrologer = async (chatId, messageText, supportUserId) => {
    try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (!chatDoc.exists()) {
            throw new Error('Chat not found');
        }

        const chatData = chatDoc.data();
        const astrologerId = chatData.astrologerId;

        if (!astrologerId) {
            throw new Error('No astrologer found for this chat');
        }

        // Add message to chat
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesRef, {
            text: messageText,
            senderId: supportUserId, // Message appears to come from support user
            timestamp: serverTimestamp(),
            type: 'text',
            sentToAstrologer: true
        });

        // Update chat's last message
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: {
                text: messageText,
                timestamp: serverTimestamp(),
                senderId: supportUserId
            },
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error sending message to astrologer:', error);
        throw error;
    }
};

// Get chats assigned to a support user
export const getSupportUserAssignedChats = async (supportUserId) => {
    try {
        const chatsQuery = query(
            collection(db, 'chats'),
            where('supportUserId', '==', supportUserId),
            orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(chatsQuery);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting support user assigned chats:', error);
        throw error;
    }
};

// Get chats assigned to a user as either support or admin (merged, deduped, sorted by updatedAt)
export const getChatsAssignedToUser = async (userId) => {
    try {
        const [supportChats, adminChats] = await Promise.all([
            getSupportUserAssignedChats(userId),
            (async () => {
                const q = query(
                    collection(db, 'chats'),
                    where('adminId', '==', userId),
                    orderBy('updatedAt', 'desc')
                );
                const snap = await getDocs(q);
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            })()
        ]);

        const seen = new Set();
        const merged = [];
        for (const chat of [...supportChats, ...adminChats]) {
            if (seen.has(chat.id)) continue;
            seen.add(chat.id);
            merged.push(chat);
        }
        merged.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis?.() ?? a.updatedAt?.toDate?.()?.getTime?.() ?? 0;
            const bTime = b.updatedAt?.toMillis?.() ?? b.updatedAt?.toDate?.()?.getTime?.() ?? 0;
            return bTime - aTime;
        });
        return merged;
    } catch (error) {
        console.error('Error getting chats assigned to user:', error);
        throw error;
    }
}; 