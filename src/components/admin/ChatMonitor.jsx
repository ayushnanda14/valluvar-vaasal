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
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import FilePreviewModal from '../FilePreviewModal';
import { SERVICE_TYPES } from '@/utils/constants';

const ChatMonitor = ({ userId }) => {
  const theme = useTheme();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Modal state for file preview
  const [modalOpen, setModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  
  // Effect for fetching chats list with real-time updates
  useEffect(() => {
    let unsubscribe;
    
    const fetchChats = async () => {
      try {
        setLoading(true);
        
        // Build the query based on whether we have a userId filter
        let q;
        const chatsRef = collection(db, 'chats');
        
        if (userId) {
          // If userId is provided, filter chats where the user is either client or astrologer
          q = query(
            chatsRef, 
            where('participants', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
          );
        } else {
          // Otherwise, get all chats
          q = query(chatsRef, orderBy('updatedAt', 'desc'));
        }
        
        // Set up real-time listener
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const chatsList = [];
          querySnapshot.forEach((doc) => {
            chatsList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setChats(chatsList);
          setLoading(false);
        }, (error) => {
          console.error('Error in chats listener:', error);
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
        // Get messages subcollection with real-time updates
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
        
        messagesUnsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
          const messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
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
          
          // Update the cleanup function to unsubscribe from both listeners
          messagesUnsubscribe = () => {
            chatUnsubscribe();
            messagesUnsubscribe();
          };
        });
      } catch (error) {
        console.error('Error setting up chat messages listener:', error);
      }
    };
    
    // If there's a selected chat ID, fetch its messages
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

  // Helper function to get appropriate icon for file type
  const getFileIcon = (fileType) => {
    if (!fileType) return <InsertDriveFileIcon />;
    
    if (fileType.startsWith('image/')) {
      return <ImageIcon />;
    } else if (fileType === 'application/pdf') {
      return <PictureAsPdfIcon />;
    } else {
      return <DescriptionIcon />;
    }
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
        
        <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ mr: 1 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedChat.clientName || 'Client'} and {selectedChat.astrologerName || 'Astrologer'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Service: {SERVICE_TYPES[selectedChat.serviceType] || 'General consultation'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Started: {selectedChat.createdAt?.toDate().toLocaleString() || 'Unknown date'}
              </Typography>
            </Box>
          </Box>
        </Paper>
        
        {/* ChatBox-style Messages Container */}
        <Paper 
          sx={{ 
            height: '70vh', 
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
                          {/* Message text */}
                          <Typography variant="body1">{message.text}</Typography>
                          
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
                          {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Unknown time'}
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
        
        {/* File Preview Modal */}
        <FilePreviewModal
          open={modalOpen}
          onClose={closeFilePreview}
          file={previewFile}
        />
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography 
        variant="h5" 
        sx={{ 
          fontFamily: '"Playfair Display", serif', 
          mb: 2 
        }}
      >
        Client-Astrologer Conversations
      </Typography>
      
      {chats.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
          No conversations found
        </Typography>
      ) : (
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Astrologer</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Last Updated</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chats.map((chat) => (
                <TableRow 
                  key={chat.id}
                  hover
                  onClick={() => handleSelectChat(chat)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{chat.clientName || 'Unknown'}</TableCell>
                  <TableCell>{chat.astrologerName || 'Unknown'}</TableCell>
                  <TableCell>{SERVICE_TYPES[chat.serviceType] || 'General'}</TableCell>
                  <TableCell>
                    {chat.updatedAt?.toDate().toLocaleString() || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={chat.status || 'Active'} 
                      color={
                        chat.status === 'completed' ? 'success' :
                        chat.status === 'inactive' ? 'default' :
                        'primary'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ChatMonitor; 