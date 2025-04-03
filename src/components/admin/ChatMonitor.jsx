import React, { useState, useEffect } from 'react';
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
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';

const ChatMonitor = () => {
  const theme = useTheme();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        // Fetch all chats
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const chatsList = [];
        querySnapshot.forEach((doc) => {
          chatsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setChats(chatsList);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChats();
  }, []);
  
  const fetchChatMessages = async (chatId) => {
    try {
      // Get chat document with messages
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      
      if (chatDoc.exists()) {
        setSelectedChat(chatDoc.data());
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };
  
  const handleSelectChat = (chat) => {
    fetchChatMessages(chat.id);
  };
  
  const handleBackToChats = () => {
    setSelectedChat(null);
  };
  
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Loading chats...</Typography>
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
            <Typography variant="h6">
              {selectedChat.clientName || 'Client'} and {selectedChat.astrologerName || 'Astrologer'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Started on: {selectedChat.createdAt?.toDate().toLocaleString() || 'Unknown date'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Service: {selectedChat.serviceType || 'General consultation'}
          </Typography>
        </Paper>
        
        <Box sx={{ maxHeight: '60vh', overflow: 'auto', p: 2, border: '1px solid #eee', borderRadius: 1 }}>
          {selectedChat.messages && selectedChat.messages.length > 0 ? (
            selectedChat.messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.senderId === selectedChat.clientId ? 'flex-start' : 'flex-end'
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    maxWidth: '80%',
                    bgcolor: message.senderId === selectedChat.clientId 
                      ? '#f0f0f0' 
                      : theme.palette.primary.light,
                    color: message.senderId === selectedChat.clientId 
                      ? 'text.primary' 
                      : 'white',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body1">{message.text}</Typography>
                </Paper>
                <Typography variant="caption" sx={{ mt: 0.5 }}>
                  {message.timestamp?.toDate().toLocaleTimeString() || 'Unknown time'} - 
                  {message.senderId === selectedChat.clientId ? ' Client' : ' Astrologer'}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography sx={{ textAlign: 'center', py: 4 }}>
              No messages in this conversation
            </Typography>
          )}
        </Box>
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
                  <TableCell>{chat.serviceType || 'General'}</TableCell>
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