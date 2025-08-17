import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  useTheme,
  CircularProgress,
  List,
  ListItem,
  IconButton,
  Tooltip,
  Link,
  Grid,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  Rating,
  Card,
  CardContent,
  Badge,
  Checkbox
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SupportIcon from '@mui/icons-material/Support';
import { collection, query, where, orderBy, onSnapshot, doc, getDocs, getDoc, updateDoc, serverTimestamp, Timestamp, arrayUnion, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import FilePreviewModal from '../FilePreviewModal';
import RefundDialog from '../RefundDialog';
import { SERVICE_TYPES } from '@/utils/constants';
import { formatLocalDate, formatLocalTime } from '@/utils/utils';
import {
  getAllAdmins,
  autoAssignAdminToChat,
  getAdminWorkload,
  getAllAssignableUsers
} from '../../services/adminService';
import {
  assignAdminToChat,
  assignSupportUserToChat,
  extendChatExpiry,
  toggleFeedbackVisibility,
  getChatExpiryStatus
} from '../../services/chatService';
import { convertTimestampToTime } from '@/utils/utils';
import { playNotificationSound } from '@/utils/notificationSound';

const ChatMonitor = ({ userId, userType }) => {
  const theme = useTheme();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Modal state for file preview
  const [modalOpen, setModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Voice message playback states
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioProgress, setAudioProgress] = useState({});
  const audioRefs = useRef({});

  // Admin features state
  const [admins, setAdmins] = useState([]);
  const [supportUsers, setSupportUsers] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState({ admins: [], supportUsers: [], allUsers: [] });
  const [adminAssignmentDialog, setAdminAssignmentDialog] = useState(false);
  const [extensionDialog, setExtensionDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [extensionHours, setExtensionHours] = useState(24);
  const [loadingAdminAction, setLoadingAdminAction] = useState(false);
  const [chatExpiryStatus, setChatExpiryStatus] = useState(null);

  // Admin-client chat state
  const [adminChats, setAdminChats] = useState({}); // Map of mainChatId -> adminChatId
  const [showAdminChat, setShowAdminChat] = useState(false);
  const [selectedAdminChatId, setSelectedAdminChatId] = useState(null);
  const [adminChatMessages, setAdminChatMessages] = useState([]);
  const [loadingAdminChat, setLoadingAdminChat] = useState(false);
  const [adminMessageText, setAdminMessageText] = useState('');
  const [sendingAdminMessage, setSendingAdminMessage] = useState(false);
  const adminChatMessagesEndRef = useRef(null);

  // Admin notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  // Admin-controlled per-chat sound preference for astrologer-client chats
  const [soundEnabledForChat, setSoundEnabledForChat] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('adminSoundEnabledForChat');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const toggleSoundForChat = (chatId) => {
    const newPrefs = { ...soundEnabledForChat, [chatId]: !soundEnabledForChat[chatId] };
    setSoundEnabledForChat(newPrefs);
    try { localStorage.setItem('adminSoundEnabledForChat', JSON.stringify(newPrefs)); } catch {}
  };

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('adminChatNotificationPrefs');
    return saved ? JSON.parse(saved) : {};
  });

  const toggleNotificationPref = (chatId) => {
    const newPrefs = {
      ...notificationPrefs,
      [chatId]: !notificationPrefs[chatId]
    };
    setNotificationPrefs(newPrefs);
    localStorage.setItem('adminChatNotificationPrefs', JSON.stringify(newPrefs));
  };

  // Add state for chat filtering
  const [chatFilters, setChatFilters] = useState({
    showRegularChats: true,
    showAdminChats: true,
    showDemoChats: true
  });

  // Compute sorted chats with admin chats at the top
  const sortedChats = React.useMemo(() => {
    const chatsWithAdminChats = chats.map(chat => {
      const adminChat = adminChats[chat.id];
      return {
        ...chat,
        hasAdminChat: !!adminChat,
        adminChatId: adminChat?.id,
        hasNewMessages: adminChat?.hasNewMessages || false
      };
    });

    // Sort: admin chats first, then by last message time
    return chatsWithAdminChats.sort((a, b) => {
      // Admin chats first
      if (a.hasAdminChat && !b.hasAdminChat) return -1;
      if (!a.hasAdminChat && b.hasAdminChat) return 1;
      
      // Then by last message time
      const aTime = a.lastMessage?.timestamp?.toDate?.() || a.updatedAt?.toDate?.() || new Date(0);
      const bTime = b.lastMessage?.timestamp?.toDate?.() || b.updatedAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
  }, [chats, adminChats]);

  // Filter chats based on selected filters
  const filteredChats = React.useMemo(() => {
    return sortedChats.filter(chat => {
      if (!chatFilters.showRegularChats && !chat.isDemoUser && !adminChats[chat.id]) {
        return false;
      }
      if (!chatFilters.showAdminChats && adminChats[chat.id]) {
        return false;
      }
      if (!chatFilters.showDemoChats && chat.isDemoUser) {
        return false;
      }
      return true;
    });
  }, [sortedChats, chatFilters, adminChats]);

  // Effect for fetching chats list with real-time updates
  useEffect(() => {
    let unsubscribe;

    const fetchChats = async () => {
      try {
        setLoading(true);

        // Build the query for regular chats
        let regularChatsQuery;
        const chatsRef = collection(db, 'chats');

        if (userId && userType !== 'admin') {
          // If userId is provided, filter chats where the user is either client or astrologer
          regularChatsQuery = query(
            chatsRef,
            where('participants', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
          );
        } else {
          // Otherwise, get all chats
          regularChatsQuery = query(chatsRef, orderBy('updatedAt', 'desc'));
        }

        // Set up real-time listener for regular chats
        unsubscribe = onSnapshot(regularChatsQuery, async (querySnapshot) => {
          const chatsList = [];

          // Process each chat and fetch user data
          for (const doc of querySnapshot.docs) {
            const chatData = doc.data();
            const chat = {
              id: doc.id,
              ...chatData,
              chatType: 'regular' // Mark as regular chat
            };

            // Try to fetch user names if not already available
            if (!chat.clientName && chat.clientId) {
              try {
                const clientDocRef = doc(db, 'users', chat.clientId);
                const clientDoc = await getDoc(clientDocRef);
                if (clientDoc.exists()) {
                  const clientData = clientDoc.data();
                  chat.clientName = clientData.displayName || clientData.email || 'Unknown Client';
                }
              } catch (error) {
                console.error('Error fetching client data:', error);
              }
            }

            if (!chat.astrologerName && chat.astrologerId) {
              try {
                const astrologerDocRef = doc(db, 'users', chat.astrologerId);
                const astrologerDoc = await getDoc(astrologerDocRef);
                if (astrologerDoc.exists()) {
                  const astrologerData = astrologerDoc.data();
                  chat.astrologerName = astrologerData.displayName || astrologerData.email || 'Unknown Astrologer';
                }
              } catch (error) {
                console.error('Error fetching astrologer data:', error);
              }
            }

            chatsList.push(chat);
          }

          setChats(chatsList);
          setLoading(false);
        }, (error) => {
          console.error('Error in regular chats listener:', error);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up chats listener:', error);
        setLoading(false);
      }
    };

    fetchChats();

    // Clean up listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  // Effect for fetching selected chat messages with real-time updates
  useEffect(() => {
    let messagesUnsubscribe;

    const fetchChatMessages = async (chatId) => {
      if (!chatId) return;

      try {
        // Check if we have cached messages for this chat
        const cacheKey = `chatMessages_${chatId}`;
        const cachedMessages = sessionStorage.getItem(cacheKey);

        if (cachedMessages) {
          const parsedMessages = JSON.parse(cachedMessages);
          // Load cached messages immediately for better UX
          setSelectedChat(prev => ({
            ...prev,
            messages: parsedMessages
          }));
          scrollToBottom();
        }

        // Get messages subcollection with real-time updates
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

        messagesUnsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
          const messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Cache the messages
          sessionStorage.setItem(cacheKey, JSON.stringify(messages));

          // Get the chat document for metadata
          const chatDocRef = doc(db, 'chats', chatId);
          const chatUnsubscribe = onSnapshot(chatDocRef, (chatDoc) => {
            if (chatDoc.exists()) {
              setSelectedChat({
                ...chatDoc.data(),
                id: chatDoc.id,
                messages: messages
              });

              // Scroll to bottom after the messages are loaded
              scrollToBottom();
            }
          });

          // Store the original messagesUnsubscribe function
          const originalMessagesUnsubscribe = messagesUnsubscribe;

          // Update the cleanup function to unsubscribe from both listeners
          messagesUnsubscribe = () => {
            chatUnsubscribe();
            originalMessagesUnsubscribe();
          };
        });
      } catch (error) {
        console.error('Error setting up chat messages listener:', error);
      }
    };

    // If there's a selected chat ID, fetch its messages
    // console.log('selectedChat', selectedChat);
    if (selectedChat?.id) {
      fetchChatMessages(selectedChat.id);
    }

    // Clean up listener when component unmounts or selected chat changes
    return () => {
      if (messagesUnsubscribe) {
        messagesUnsubscribe();
      }
    };
  }, [selectedChat?.id]);

  // Clean up old cache entries on component mount
  useEffect(() => {
    const cleanupOldCache = () => {
      const keys = Object.keys(sessionStorage);
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hour

      keys.forEach(key => {
        if (key.startsWith('chatMessages_') || key.startsWith('adminChatMessages_') || key.startsWith('messageListeners_')) {
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              // If it's a timestamp, check if it's old
              if (parsed.timestamp && parsed.timestamp < oneHourAgo) {
                sessionStorage.removeItem(key);
              }
            }
          } catch (e) {
            // If parsing fails, remove the key
            sessionStorage.removeItem(key);
          }
        }
      });
    };

    cleanupOldCache();
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const scrollHeight = messagesContainerRef.current.scrollHeight;
        messagesContainerRef.current.scrollTop = scrollHeight;
      }
    }, 100);
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
  };

  const openFilePreview = (fileData) => {
    setPreviewFile(fileData);
    setModalOpen(true);
  };

  const closeFilePreview = () => {
    setModalOpen(false);
  };

  // Load assignable users for assignment
  useEffect(() => {
    const loadAssignableUsers = async () => {
      try {
        const users = await getAllAssignableUsers();
        setAssignableUsers(users);
        // console.log('users', users);
        setAdmins(users.admins); // Keep for backward compatibility
        setSupportUsers(users.supportUsers.concat(users.admins));
      } catch (error) {
        console.error('Error loading assignable users:', error);
      }
    };

    loadAssignableUsers();
  }, []);

  // Listen for admin-client chat notifications
  useEffect(() => {
    if (!userId) return; // Only listen if we have a specific admin user

    let unsubscribe;

    const listenForAdminChats = async () => {
      try {
        // Query admin-client chats where this admin is assigned
        const adminChatsQuery = query(
          collection(db, 'adminClientChats'),
          where('adminId', '==', userId),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(adminChatsQuery, (querySnapshot) => {
          const newNotifications = [];

          querySnapshot.forEach((doc) => {
            const chatData = doc.data();
            // Check if this is a new chat (created in the last 5 minutes)
            const chatTime = chatData.createdAt?.toDate() || new Date();
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            if (chatTime > fiveMinutesAgo) {
              newNotifications.push({
                id: doc.id,
                type: 'new_admin_chat',
                message: `New client support request from ${chatData.clientName || 'Client'}`,
                chatId: doc.id,
                mainChatId: chatData.mainChatId,
                timestamp: chatData.createdAt,
                read: false
              });
            }
          });

          if (newNotifications.length > 0) {
            setNotifications(prev => [...newNotifications, ...prev]);
            setShowNotifications(true);
          }
        });
      } catch (error) {
        console.error('Error listening for admin chat notifications:', error);
      }
    };

    listenForAdminChats();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  // Listen for new messages in admin-client chats
  useEffect(() => {
    if (!userId) return;

    let unsubscribe;

    const listenForNewMessages = async () => {
      try {
        // Check if we already have active listeners
        const cacheKey = `messageListeners_${userId}`;
        if (sessionStorage.getItem(cacheKey)) {
          return; // Skip if already listening
        }

        // Get all admin-client chats for this admin
        const adminChatsQuery = query(
          collection(db, 'adminClientChats'),
          where('adminId', '==', userId),
          where('status', '==', 'active')
        );

        const adminChatsSnapshot = await getDocs(adminChatsQuery);

        // Set up listeners for each admin chat's messages
        const unsubscribers = [];

        adminChatsSnapshot.forEach((chatDoc) => {
          const messagesQuery = query(
            collection(db, 'adminClientChats', chatDoc.id, 'messages'),
            orderBy('timestamp', 'desc'),
            where('senderId', '!=', userId) // Only listen for messages not from this admin
          );

          const unsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
            messagesSnapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const messageData = change.doc.data();
                const messageTime = messageData.timestamp?.toDate() || new Date();
                const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

                // Only notify for very recent messages (last minute)
                if (messageTime > oneMinuteAgo && messageData.senderId !== userId) {
                  const newNotification = {
                    id: `${chatDoc.id}_${change.doc.id}`,
                    type: 'new_message',
                    message: `New message from client in support chat`,
                    chatId: chatDoc.id,
                    mainChatId: chatDoc.data().mainChatId,
                    timestamp: messageData.timestamp,
                    read: false
                  };

                  setNotifications(prev => [newNotification, ...prev]);
                  setShowNotifications(true);
                  playNotificationSound();
                }
              }
            });
          });

          unsubscribers.push(unsubscribe);
        });

        // Mark that we have active listeners
        sessionStorage.setItem(cacheKey, 'true');

        unsubscribe = () => {
          unsubscribers.forEach(unsub => unsub());
          sessionStorage.removeItem(cacheKey);
        };
      } catch (error) {
        console.error('Error listening for new admin chat messages:', error);
      }
    };

    listenForNewMessages();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  // Listen for new messages in regular astrologer-client chats. Only play sound if admin enabled.
  useEffect(() => {
    if (!userId) return;

    let unsubscribe;

    const listenForRegularChatMessages = async () => {
      try {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified' || change.type === 'added') {
              const chat = change.doc.data();
              const chatId = change.doc.id;
              if (!soundEnabledForChat[chatId]) return;
              const lastMessage = chat.lastMessage;
              if (lastMessage && lastMessage.senderId && lastMessage.senderId !== userId) {
                playNotificationSound();
              }
            }
          });
        });
      } catch (error) {
        console.error('Error listening for regular chat messages:', error);
      }
    };

    listenForRegularChatMessages();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, soundEnabledForChat]);

  // Load admin-client chats for all main chats
  useEffect(() => {
    const loadAdminChats = async () => {
      try {
        const adminChatsQuery = query(
          collection(db, 'adminClientChats'),
          where('status', '==', 'active')
        );

        const adminChatsSnapshot = await getDocs(adminChatsQuery);
        const adminChatsMap = {};

        adminChatsSnapshot.forEach((doc) => {
          const chatData = doc.data();
          if (chatData.mainChatId) {
            adminChatsMap[chatData.mainChatId] = {
              id: doc.id,
              ...chatData
            };
          }
        });

        setAdminChats(adminChatsMap);
        //  console.log('Admin chats loaded:', adminChatsMap);
      } catch (error) {
        console.error('Error loading admin chats:', error);
      }
    };

    if (chats.length > 0) {
      loadAdminChats();
    }
  }, [chats]); // Reload when chats change

  // Get chat expiry status
  useEffect(() => {
    const loadExpiryStatus = async () => {
      if (selectedChat?.id) {
        try {
          const status = await getChatExpiryStatus(selectedChat.id);
          setChatExpiryStatus(status);
        } catch (error) {
          console.error('Error loading expiry status:', error);
        }
      }
    };

    loadExpiryStatus();
  }, [selectedChat?.id]);

  // Handle user assignment
  const handleAssignUser = async () => {
    if (!selectedChat?.id || !selectedUser) return;

    setLoadingAdminAction(true);
    try {
      const selectedUserData = assignableUsers.allUsers.find(user => user.id === selectedUser);

      if (selectedUserData.userType === 'admin') {
        await assignAdminToChat(selectedChat.id, selectedUser, 'manual');
        // Refresh the selected chat to show updated admin
        const updatedChat = { ...selectedChat, adminId: selectedUser };
        setSelectedChat(updatedChat);
      } else if (selectedUserData.userType === 'support') {
        await assignSupportUserToChat(selectedChat.id, selectedUser, 'manual');
        // Refresh the selected chat to show updated support user
        const updatedChat = { ...selectedChat, supportUserId: selectedUser };
        setSelectedChat(updatedChat);
      }

      setAdminAssignmentDialog(false);
      setSelectedUser('');
    } catch (error) {
      console.error('Error assigning user:', error);
    } finally {
      setLoadingAdminAction(false);
    }
  };

  // Handle auto-assign admin
  const handleAutoAssignAdmin = async () => {
    if (!selectedChat?.id) return;

    setLoadingAdminAction(true);
    try {
      const assignedAdmin = await autoAssignAdminToChat(selectedChat.id);
      setAdminAssignmentDialog(false);
      // Refresh the selected chat to show updated admin
      const updatedChat = { ...selectedChat, adminId: assignedAdmin.id };
      setSelectedChat(updatedChat);
    } catch (error) {
      console.error('Error auto-assigning admin:', error);
    } finally {
      setLoadingAdminAction(false);
    }
  };

  // Handle chat extension
  const handleExtendChat = async () => {
    if (!selectedChat?.id) return;

    setLoadingAdminAction(true);
    try {
      await extendChatExpiry(selectedChat.id, extensionHours, 'admin');
      setExtensionDialog(false);
      setExtensionHours(24);
      // Refresh expiry status
      const status = await getChatExpiryStatus(selectedChat.id);
      setChatExpiryStatus(status);
    } catch (error) {
      console.error('Error extending chat:', error);
    } finally {
      setLoadingAdminAction(false);
    }
  };

  // Handle feedback visibility toggle
  const handleToggleFeedbackVisibility = async (visible) => {
    if (!selectedChat?.id) return;

    try {
      await toggleFeedbackVisibility(selectedChat.id, visible);
      // Refresh the selected chat
      const updatedChat = {
        ...selectedChat,
        feedback: {
          ...selectedChat.feedback,
          visibleToAstrologer: visible
        }
      };
      setSelectedChat(updatedChat);
    } catch (error) {
      console.error('Error toggling feedback visibility:', error);
    }
  };

  // Handle opening admin-client chat
  const handleOpenAdminChat = (mainChatId) => {
    const adminChat = adminChats[mainChatId];
    if (adminChat) {
      setSelectedAdminChatId(adminChat.id);
      setShowAdminChat(true);
      loadAdminChatMessages(adminChat.id);
    }
  };

  // Load admin chat messages with caching
  const loadAdminChatMessages = async (adminChatId) => {
    if (!adminChatId) return;

    try {
      setLoadingAdminChat(true);

      // Check if we have cached messages for this chat
      const cacheKey = `adminChatMessages_${adminChatId}`;
      const cachedMessages = sessionStorage.getItem(cacheKey);

      if (cachedMessages) {
        const parsedMessages = JSON.parse(cachedMessages);
        setAdminChatMessages(parsedMessages);
        setLoadingAdminChat(false);

        // Scroll to bottom after messages load
        setTimeout(() => {
          if (adminChatMessagesEndRef.current) {
            adminChatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }

      // Set up real-time listener for new messages only
      const messagesRef = collection(db, 'adminClientChats', adminChatId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
        const messages = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setAdminChatMessages(messages);
        setLoadingAdminChat(false);

        // Cache the messages
        sessionStorage.setItem(cacheKey, JSON.stringify(messages));

        // Scroll to bottom after messages load
        setTimeout(() => {
          if (adminChatMessagesEndRef.current) {
            adminChatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      });

      // Store unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error('Error loading admin chat messages:', error);
      setLoadingAdminChat(false);
    }
  };

  // Send admin message to client
  const sendAdminMessage = async (messageText) => {
    if (!selectedAdminChatId || !messageText.trim() || !userId) {
      console.error('Missing required data:', { selectedAdminChatId, messageText, userId });
      return;
    }

    try {
      setSendingAdminMessage(true);
      const messagesRef = collection(db, 'adminClientChats', selectedAdminChatId, 'messages');
      await addDoc(messagesRef, {
        text: messageText.trim(),
        senderId: userId,
        timestamp: serverTimestamp(),
        type: 'text'
      });
      setAdminMessageText(''); // Clear input after sending
    } catch (error) {
      console.error('Error sending admin message:', error);
    } finally {
      setSendingAdminMessage(false);
    }
  };

  // Handle admin message form submission
  const handleAdminMessageSubmit = (e) => {
    e.preventDefault();
    if (adminMessageText.trim()) {
      sendAdminMessage(adminMessageText);
    }
  };

  // Handle resolving admin chat
  const handleResolveAdminChat = async () => {
    if (!selectedAdminChatId) return;

    try {
      setLoadingAdminAction(true);

      // Mark admin chat as resolved
      const { markAdminChatResolved } = await import('../../services/chatService');
      await markAdminChatResolved(selectedAdminChatId);

      // Add a system message to indicate resolution
      const messagesRef = collection(db, 'adminClientChats', selectedAdminChatId, 'messages');
      await addDoc(messagesRef, {
        text: 'This support conversation has been resolved by the admin.',
        senderId: 'system',
        timestamp: serverTimestamp(),
        type: 'text'
      });

      // Close the admin chat panel
      handleCloseAdminChat();

      // Refresh admin chats list
      const adminChatsQuery = query(
        collection(db, 'adminClientChats'),
        where('status', '==', 'active')
      );
      const adminChatsSnapshot = await getDocs(adminChatsQuery);
      const adminChatsMap = {};
      adminChatsSnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.mainChatId) {
          adminChatsMap[chatData.mainChatId] = {
            id: doc.id,
            ...chatData
          };
        }
      });
      setAdminChats(adminChatsMap);

    } catch (error) {
      console.error('Error resolving admin chat:', error);
    } finally {
      setLoadingAdminAction(false);
    }
  };

  // Handle closing admin-client chat
  const handleCloseAdminChat = () => {
    setShowAdminChat(false);
    setSelectedAdminChatId(null);
    setAdminChatMessages([]);
    setAdminMessageText('');
  };

  // Load payment info for selected chat
  useEffect(() => {
    const loadPaymentInfo = async () => {
      if (!selectedChat?.id) {
        setPaymentInfo(null);
        return;
      }

      try {
        const { getPaymentForChat } = await import('../../services/refundService');
        //  console.log('selectedChat', selectedChat);
        const payment = await getPaymentForChat(selectedChat.id);
        setPaymentInfo(payment);
      } catch (error) {
        console.error('Error loading payment info:', error);
        setPaymentInfo(null);
      }
    };

    loadPaymentInfo();
  }, [selectedChat?.id]);

  // Helper function to get appropriate icon for file type
  const getFileIcon = (fileType) => {
    if (!fileType) return <InsertDriveFileIcon />;

    if (fileType.startsWith('image/')) {
      return <ImageIcon />;
    } else if (fileType === 'application/pdf') {
      return <PictureAsPdfIcon />;
    } else if (fileType.startsWith('video/')) {
      return <VideoFileIcon />;
    } else if (fileType.startsWith('audio/')) {
      return <AudioFileIcon />;
    } else {
      return <DescriptionIcon />;
    }
  };

  // Handle audio playback
  const handleAudioPlay = (messageId, audioUrl) => {
    const currentAudioRef = audioRefs.current[messageId];

    if (playingAudio === messageId) {
      // Stop current audio
      if (currentAudioRef) {
        currentAudioRef.pause();
      }
      setPlayingAudio(null);
    } else {
      // Stop any currently playing audio
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio].pause();
        audioRefs.current[playingAudio].currentTime = 0;
        setAudioProgress(prev => ({ ...prev, [playingAudio]: 0 }));
      }

      // Play new audio
      if (currentAudioRef) {
        currentAudioRef.play();
        setPlayingAudio(messageId);
      }
    }
  };

  // Handle audio progress update
  const handleAudioProgress = (messageId, event) => {
    const audio = event.target;
    const progress = (audio.currentTime / audio.duration) * 100;
    setAudioProgress(prev => ({ ...prev, [messageId]: progress }));
  };

  // Handle audio end
  const handleAudioEnd = (messageId) => {
    setPlayingAudio(null);
    setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
  };

  // Format time in MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render voice message
  const renderVoiceMessage = (message) => {
    const isPlaying = playingAudio === message.id;
    const progress = audioProgress[message.id] || 0;
    const audioRef = audioRefs.current[message.id];
    const currentTime = audioRef ? audioRef.currentTime : 0;
    const duration = message.voiceReference?.duration || 0;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: '220px', py: 1 }}>
        <IconButton
          onClick={() => handleAudioPlay(message.id, message.voiceReference.url)}
          color={isPlaying ? 'secondary' : 'primary'}
          size="small"
          sx={{
            border: '2px solid',
            borderColor: isPlaying ? 'secondary.main' : 'primary.main',
            background: isPlaying ? 'rgba(25, 118, 210, 0.08)' : 'white',
            width: 40,
            height: 40
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 100 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(25, 118, 210, 0.08)',
              '& .MuiLinearProgress-bar': {
                background: isPlaying ? theme.palette.secondary.main : theme.palette.primary.main,
              },
              mb: 0.5
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {formatTime(currentTime)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatTime(duration)}
            </Typography>
          </Box>
        </Box>
        <audio
          ref={el => audioRefs.current[message.id] = el}
          src={message.voiceReference?.url}
          onTimeUpdate={(e) => handleAudioProgress(message.id, e)}
          onEnded={() => handleAudioEnd(message.id)}
          style={{ display: 'none' }}
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading chats...</Typography>
      </Box>
    );
  }

  if (selectedChat) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToChats}
          sx={{ mb: 2 }}
        >
          Back to All Chats
        </Button>

        {/* Admin Chat Button */}
        {adminChats[selectedChat.id] && (
          <Button
            variant="contained"
            color="warning"
            startIcon={
              <Badge
                color="error"
                variant="dot"
                invisible={!adminChats[selectedChat.id]?.hasNewMessages}
                sx={{
                  '& .MuiBadge-dot': {
                    right: -3,
                    top: -3,
                    display: { xs: 'block', md: 'none' }
                  }
                }}
              >
                <SupportIcon />
              </Badge>
            }
            onClick={() => handleOpenAdminChat(selectedChat.id)}
            sx={{ mb: 2, ml: 2 }}
          >
            Open Admin Support Chat
          </Button>
        )}

        <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ mr: 1 }}>
              <PersonIcon />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">
                {selectedChat.clientName || 'Client'} and {selectedChat.astrologerName || 'Astrologer'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Service: {SERVICE_TYPES[selectedChat.serviceType] || 'General consultation'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Started: {selectedChat.createdAt?.toDate().toLocaleString() || 'Unknown date'}
              </Typography>
              {chatExpiryStatus && (
                <Typography variant="body2" color="text.secondary">
                  Status: {chatExpiryStatus.isExpired ? 'Expired' : 'Active'}
                  {!chatExpiryStatus.isExpired && chatExpiryStatus.timeUntilExpiry > 0 && (
                    ` (${Math.floor(chatExpiryStatus.timeUntilExpiry / (1000 * 60 * 60))}h ${Math.floor((chatExpiryStatus.timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60))}m remaining)`
                  )}
                </Typography>
              )}
            </Box>

            {/* Admin Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Admin Assignment */}
              <Tooltip title="Assign Admin">
                <IconButton
                  color="primary"
                  onClick={() => setAdminAssignmentDialog(true)}
                  disabled={loadingAdminAction}
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', border: '1px dashed #e67e22', padding: 1, borderRadius: 1 }}
                >
                  <AdminPanelSettingsIcon />
                  <Typography variant="body2" color="text.secondary">
                    Assign Admin
                  </Typography>
                </IconButton>
              </Tooltip>
              {/* Chat Extension */}
              <Tooltip title="Extend Chat">
                <IconButton
                  color="primary"
                  onClick={() => setExtensionDialog(true)}
                  disabled={loadingAdminAction}
                  sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', border: '1px dashed #e67e22', padding: 1, borderRadius: 1 }}
                >
                  <AccessTimeIcon />
                  <Typography variant="body2" color="text.secondary">Extend Chat</Typography>
                </IconButton>
              </Tooltip>
              {/* Feedback Visibility Toggle */}
              {selectedChat.feedback && (
                <Tooltip title={selectedChat.feedback.visibleToAstrologer ? "Hide from Astrologer" : "Show to Astrologer"}>
                  <IconButton
                    color="primary"
                    onClick={() => handleToggleFeedbackVisibility(!selectedChat.feedback.visibleToAstrologer)}
                    disabled={loadingAdminAction}
                  >
                    {selectedChat.feedback.visibleToAstrologer ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Assignment Status */}
          {(selectedChat.adminId || selectedChat.supportUserId) && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="body2" color="white">
                Assigned Support: {supportUsers.find(a => a.id === selectedChat.supportUserId || a.id === selectedChat.adminId)?.displayName || 'Unknown'}
              </Typography>
            </Box>
          )}

          {/* Feedback Display */}
          {selectedChat.feedback && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Client Feedback:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Rating value={selectedChat.feedback.rating} readOnly size="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {selectedChat.feedback.rating}/5 stars
                </Typography>
              </Box>
              {selectedChat.feedback.comment && (
                <Typography variant="body2" color="text.secondary">
                  "{selectedChat.feedback.comment}"
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Submitted: {selectedChat.feedback.submittedAt?.toDate().toLocaleString()}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Chat Display Area */}
        <Box sx={{ display: 'flex', gap: 2, height: '70vh' }}>
          {/* Main Chat */}
          <Paper
            sx={{
              flex: showAdminChat ? 1 : 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: '100%'
            }}
          >
            <Box
              ref={messagesContainerRef}
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                width: '100%',
                transition: 'none'
              }}
            >
              {selectedChat.messages && selectedChat.messages.length > 0 ? (
                <List>
                  {selectedChat.messages.map((message, index) => {
                    const isClient = message.senderId === selectedChat.clientId;
                    const isSystem = message.senderId === 'system';
                    const senderName = isClient
                      ? selectedChat.clientName || 'Client'
                      : isSystem
                        ? 'System'
                        : selectedChat.astrologerName || 'Astrologer';

                    return (
                      <ListItem
                        key={index}
                        sx={{
                          flexDirection: 'column',
                          alignItems: isClient ? 'flex-start' : isSystem ? 'center' : 'flex-end',
                          p: 1
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '80%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isClient ? 'flex-start' : isSystem ? 'center' : 'flex-end',
                            width: '100%'
                          }}
                        >
                          {/* Sender name */}
                          <Typography
                            variant="caption"
                            sx={{
                              mb: 0.5,
                              fontWeight: 'medium',
                              color: isSystem ? 'text.secondary' : 'primary.main'
                            }}
                          >
                            {senderName}
                          </Typography>

                          {/* Message bubble */}
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: isSystem
                                ? 'background.paper'
                                : isClient
                                  ? '#f0f0f0'
                                  : theme.palette.primary.light,
                              color: isSystem
                                ? 'text.secondary'
                                : isClient
                                  ? 'text.primary'
                                  : 'white',
                              border: isSystem ? '1px dashed #ccc' : 'none',
                              width: 'fit-content',
                              maxWidth: '100%'
                            }}
                          >
                            {/* Voice message */}
                            {message.type === 'voice' && message.voiceReference && (
                              renderVoiceMessage(message)
                            )}

                            {/* Message text (only show if not a voice message) */}
                            {message.type !== 'voice' && (
                              <>
                                <Typography variant="body1" sx={{ mb: message.metadata ? 1 : 0 }}>{message.text}</Typography>
                                {message.metadata && (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                    {message.metadata.jathakWriting && (
                                      <>
                                        <Chip size="small" label={`Name: ${message.metadata.jathakWriting.name}`} />
                                        <Chip size="small" label={`Birth Place: ${message.metadata.jathakWriting.birthPlace}`} />
                                        <Chip size="small" label={`DOB: ${formatLocalDate(message.metadata.jathakWriting.birthDate)}`} />
                                        <Chip size="small" label={`Time: ${formatLocalTime(message.metadata.jathakWriting.birthTime)}`} />
                                      </>
                                    )}
                                    {message.metadata.jathakPrediction && (
                                      <>
                                        <Chip size="small" label={`Name: ${message.metadata.jathakPrediction.name}`} />
                                        <Chip size="small" label={`DOB: ${formatLocalDate(message.metadata.jathakPrediction.birthDate)}`} />
                                        {message.metadata.jathakPrediction.birthTime && (
                                          <Chip size="small" label={`Time: ${formatLocalTime(message.metadata.jathakPrediction.birthTime)}`} />
                                        )}
                                        {message.metadata.jathakPrediction.zodiac && (
                                          <Chip size="small" label={`Zodiac: ${message.metadata.jathakPrediction.zodiac}`} />
                                        )}
                                      </>
                                    )}
                                  </Box>
                                )}
                              </>
                            )}

                            {/* Single file reference */}
                            {message.fileReference && (
                              <Box sx={{ mt: 1 }}>
                                <Button
                                  startIcon={getFileIcon(message.fileReference.type)}
                                  size="small"
                                  variant="text"
                                  onClick={() => openFilePreview(message.fileReference)}
                                  sx={{
                                    color: theme.palette.primary.main,
                                    textDecoration: 'underline',
                                    textTransform: 'none'
                                  }}
                                >
                                  {message.fileReference.name}
                                </Button>
                              </Box>
                            )}

                            {/* Multiple file references */}
                            {message.fileReferences && message.fileReferences.length > 0 && (
                              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column' }}>
                                {message.fileReferences.map((fileRef, fileIndex) => (
                                  <Button
                                    key={fileIndex}
                                    startIcon={getFileIcon(fileRef.type)}
                                    size="small"
                                    variant="text"
                                    onClick={() => openFilePreview(fileRef)}
                                    sx={{
                                      color: theme.palette.primary.main,
                                      textDecoration: 'underline',
                                      textTransform: 'none',
                                      justifyContent: 'flex-start',
                                      mb: 0.5
                                    }}
                                  >
                                    {fileRef.name}
                                  </Button>
                                ))}
                              </Box>
                            )}
                          </Paper>

                          {/* Timestamp */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            {convertTimestampToTime(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Unknown time'}
                          </Typography>
                        </Box>
                      </ListItem>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </List>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="body1" color="text.secondary">
                    No messages in this conversation
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Admin message footer - shows this is monitoring mode */}
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#f9f9f9' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', fontStyle: 'italic' }}
              >
                Admin monitoring mode - Read only
              </Typography>
            </Box>
          </Paper>

          {/* Admin Chat Panel */}
          {showAdminChat && selectedAdminChatId && (
            <Paper
              sx={{
                position: { xs: 'fixed', md: 'relative' },
                top: { xs: 0, md: 'auto' },
                left: { xs: 0, md: 'auto' },
                right: { xs: 0, md: 'auto' },
                bottom: { xs: 0, md: 'auto' },
                zIndex: { xs: 1300, md: 'auto' },
                display: 'flex',
                flexDirection: 'column',
                width: { xs: '100vw', md: '100%' },
                height: { xs: '100vh', md: '100%' },
                flex: { md: 1 },
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: 'warning.light' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                      Admin Support Chat
                    </Typography>
                    {paymentInfo && (
                      <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
                        Payment: ₹{paymentInfo.amount} • {paymentInfo.timestamp?.toDate().toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {paymentInfo && (
                      <Button
                        size="small"
                        variant="contained"
                        color="info"
                        onClick={() => setRefundDialogOpen(true)}
                        sx={{
                          bgcolor: 'info.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'info.dark' }
                        }}
                      >
                        Refund
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={handleResolveAdminChat}
                      disabled={loadingAdminAction}
                      sx={{
                        bgcolor: 'success.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'success.dark' },
                        '&:disabled': { bgcolor: 'grey.400' }
                      }}
                    >
                      {loadingAdminAction ? 'Resolving...' : 'Resolve'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleCloseAdminChat}
                      sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                      Close Chat
                    </Button>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {loadingAdminChat ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                ) : adminChatMessages.length > 0 ? (
                  <List>
                    {adminChatMessages.map((message, index) => {
                      const isClient = message.senderId !== userId;
                      const isSystem = message.senderId === 'system';
                      const senderName = isClient
                        ? 'Client'
                        : isSystem
                          ? 'System'
                          : 'Admin';

                      return (
                        <ListItem
                          key={index}
                          sx={{
                            flexDirection: 'column',
                            alignItems: isClient ? 'flex-start' : isSystem ? 'center' : 'flex-end',
                            p: 1
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '80%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isClient ? 'flex-start' : isSystem ? 'center' : 'flex-end',
                              width: '100%'
                            }}
                          >
                            {/* Sender name */}
                            <Typography
                              variant="caption"
                              sx={{
                                mb: 0.5,
                                fontWeight: 'medium',
                                color: isSystem ? 'text.secondary' : 'primary.main'
                              }}
                            >
                              {senderName}
                            </Typography>

                            {/* Message bubble */}
                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: isSystem
                                  ? 'background.paper'
                                  : isClient
                                    ? '#f0f0f0'
                                    : theme.palette.warning.light,
                                color: isSystem
                                  ? 'text.secondary'
                                  : isClient
                                    ? 'text.primary'
                                    : 'white',
                                border: isSystem ? '1px dashed #ccc' : 'none',
                                width: 'fit-content',
                                maxWidth: '100%'
                              }}
                            >
                              <Typography variant="body1">{message.text}</Typography>
                            </Paper>

                            {/* Timestamp */}
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {message.timestamp && (convertTimestampToTime(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Unknown time')}
                            </Typography>
                          </Box>
                        </ListItem>
                      );
                    })}
                    <div ref={adminChatMessagesEndRef} />
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No messages in admin support chat yet.
                  </Typography>
                )}
              </Box>

              {/* Admin Message Input */}
              <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: 'background.paper' }}>
                {!userId ? (
                  <Typography variant="body2" color="error" sx={{ textAlign: 'center', py: 2 }}>
                    Error: Admin user ID not available. Cannot send messages.
                  </Typography>
                ) : (
                  <form onSubmit={handleAdminMessageSubmit}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Type your message to the client..."
                        value={adminMessageText}
                        onChange={(e) => setAdminMessageText(e.target.value)}
                        disabled={sendingAdminMessage}
                        variant="outlined"
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        color="warning"
                        disabled={!adminMessageText.trim() || sendingAdminMessage || !userId}
                        sx={{ minWidth: 'auto', px: 2 }}
                      >
                        {sendingAdminMessage ? <CircularProgress size={20} /> : 'Send'}
                      </Button>
                    </Box>
                  </form>
                )}
              </Box>
            </Paper>
          )}
        </Box>

        {/* File Preview Modal */}
        <FilePreviewModal
          open={modalOpen}
          onClose={closeFilePreview}
          file={previewFile}
        />

        {/* Refund Dialog */}
        <RefundDialog
          open={refundDialogOpen}
          onClose={() => setRefundDialogOpen(false)}
          chatId={selectedChat?.id}
          clientId={selectedChat?.clientId}
        />

        {/* User Assignment Dialog */}
        <Dialog open={adminAssignmentDialog} onClose={() => setAdminAssignmentDialog(false)}>
          <DialogTitle>Assign Support to Chat</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a user to assign to this chat. Support users can transcribe voice notes and respond on behalf of astrologers.
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select User</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="Select User"
              >
                {assignableUsers.allUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.displayName || user.email}
                      <Chip
                        label={user.userType}
                        size="small"
                        color={user.userType === 'admin' ? 'primary' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mb: 2 }}>
              Support users can transcribe voice notes and respond on behalf of astrologers.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdminAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignUser}
              disabled={!selectedUser || loadingAdminAction}
              variant="contained"
            >
              {loadingAdminAction ? 'Assigning...' : 'Assign Selected'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Chat Extension Dialog */}
        <Dialog open={extensionDialog} onClose={() => setExtensionDialog(false)}>
          <DialogTitle>Extend Chat Duration</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Extend the chat expiry time to allow continued communication.
            </Typography>

            <TextField
              fullWidth
              type="number"
              label="Extension Hours"
              value={extensionHours}
              onChange={(e) => setExtensionHours(Number(e.target.value))}
              inputProps={{ min: 1, max: 168 }} // 1 hour to 1 week
              sx={{ mb: 2 }}
            />

            <Alert severity="info">
              Current expiry: {chatExpiryStatus?.isExpired ? 'Expired' : 'Active'}
              {!chatExpiryStatus?.isExpired && chatExpiryStatus?.timeUntilExpiry > 0 && (
                ` (${Math.floor(chatExpiryStatus.timeUntilExpiry / (1000 * 60 * 60))}h ${Math.floor((chatExpiryStatus.timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60))}m remaining)`
              )}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExtensionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExtendChat}
              disabled={loadingAdminAction}
              variant="contained"
            >
              {loadingAdminAction ? 'Extending...' : 'Extend Chat'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box>
      {/* Admin Notifications */}
      {showNotifications && notifications.length > 0 && (
        <Paper sx={{ mb: 2, p: 2, bgcolor: 'primary.light', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              New Support Requests ({notifications.length})
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowNotifications(false)}
              sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Dismiss
            </Button>
          </Box>
          <List dense>
            {notifications.slice(0, 3).map((notification) => (
              <ListItem
                key={notification.id}
                sx={{ py: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                onClick={() => {
                  if (notification.mainChatId) {
                    handleOpenAdminChat(notification.mainChatId);
                    setShowNotifications(false);
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <SupportIcon sx={{ fontSize: '1rem' }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {notification.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </ListItem>
            ))}
            {notifications.length > 3 && (
              <ListItem sx={{ py: 0.5, justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  +{notifications.length - 3} more requests
                </Typography>
              </ListItem>
            )}
          </List>
        </Paper>
      )}

      {/* Chat Type Legend and Filters */}
      <Paper sx={{ mb: 2, p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", serif' }}>
            Chat Type Legend
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={chatFilters.showRegularChats}
                  onChange={(e) => setChatFilters(prev => ({ ...prev, showRegularChats: e.target.checked }))}
                  size="small"
                />
              }
              label="Regular"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={chatFilters.showAdminChats}
                  onChange={(e) => setChatFilters(prev => ({ ...prev, showAdminChats: e.target.checked }))}
                  size="small"
                />
              }
              label="Client Enquiry"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={chatFilters.showDemoChats}
                  onChange={(e) => setChatFilters(prev => ({ ...prev, showDemoChats: e.target.checked }))}
                  size="small"
                />
              }
              label="Demo"
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: 'inherit', border: '1px solid #ccc' }} />
            <Typography variant="body2">Regular Client-Astrologer Chat</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#FFE28A' }} />
            <Typography variant="body2">Client Enquiry (Admin Support)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#E8F5E8' }} />
            <Typography variant="body2">Demo User Chat</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {chats.length === 0 ? 'No chats found' : 'No chats match the selected filters'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Astrologer</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Last Message</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredChats.map((chat) => {
                const hasAdminChat = adminChats[chat.id];
                const isDemoChat = chat.isDemoUser;
                
                // Determine background color based on chat type
                let bgColor = 'inherit';
                if (hasAdminChat) {
                  bgColor = '#FFE28A'; // Amber for admin support chats
                } else if (isDemoChat) {
                  bgColor = '#E8F5E8'; // Light green for demo chats
                }
                
                return (
                  <TableRow
                    key={chat.id}
                    hover
                    onClick={() => handleSelectChat(chat)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: bgColor,
                      '&:hover': {
                        bgcolor: hasAdminChat ? 'warning.main' : 
                                  isDemoChat ? 'success.light' : 
                                  'action.hover'
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isDemoChat && (
                          <Chip
                            label="Demo"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                        {chat.clientName || chat.clientId || 'Unknown Client'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {chat.chatType === 'admin' ?
                        (chat.astrologerName || 'Admin Support') :
                        (chat.astrologerName || chat.astrologerId || 'Unknown Astrologer')
                      }
                    </TableCell>
                    <TableCell>
                      {chat.chatType === 'admin' ? 'Admin Support' : (SERVICE_TYPES[chat.serviceType] || 'General')}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {chat.lastMessage?.text || 'No messages yet'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {chat.lastMessage?.timestamp?.toDate ? 
                            chat.lastMessage.timestamp.toDate().toLocaleString() :
                            chat.updatedAt?.toDate ? 
                              chat.updatedAt.toDate().toLocaleString() :
                              'Unknown time'
                          }
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {hasAdminChat && (
                          <Badge
                            color="error"
                            variant="dot"
                            invisible={!hasAdminChat?.hasNewMessages}
                            sx={{
                              '& .MuiBadge-dot': {
                                right: -3,
                                top: -3,
                                display: { xs: 'block', md: 'none' }
                              }
                            }}
                          >
                            <SupportIcon />
                          </Badge>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectChat(chat);
                          }}
                        >
                          View
                        </Button>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!!soundEnabledForChat[chat.id]}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSoundForChat(chat.id);
                              }}
                              size="small"
                            />
                          }
                          onClick={(e) => e.stopPropagation()}
                          label="Sound"
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ChatMonitor; 