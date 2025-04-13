import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Button,
    CircularProgress,
    Divider,
    Tooltip,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActionArea
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import { useAuth } from '../context/AuthContext';
import {
    getChatMessages,
    sendTextMessage,
    sendFileMessage
} from '../services/chatService';
import FilePreviewModal from './FilePreviewModal';

export default function ChatBox({ chatId, otherUser }) {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sendingFile, setSendingFile] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const messagesContainerRef = useRef(null);

    // Load messages
    useEffect(() => {
        let unsubscribe;

        const fetchMessages = async () => {
            try {
                setLoading(true);

                // Use the real-time listener and store unsubscribe function
                unsubscribe = getChatMessages(chatId, (messages) => {
                    setMessages(messages);
                    setLoading(false);

                    // Scroll to bottom when messages change
                    scrollToBottom();
                });
            } catch (error) {
                console.error('Error in chat messages listener:', error);
                setLoading(false);
            }
        };

        if (chatId) {
            fetchMessages();
        }

        // Clean up listener when component unmounts or chatId changes
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [chatId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesContainerRef.current) {
                const scrollHeight = messagesContainerRef.current.scrollHeight;
                messagesContainerRef.current.scrollTop = scrollHeight;
            }
        }, 100);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            // Preserve the current width of the container before sending
            const containerWidth = messagesContainerRef.current?.clientWidth;
            if (containerWidth) {
                messagesContainerRef.current.style.minWidth = `${containerWidth}px`;
            }

            await sendTextMessage(chatId, currentUser.uid, newMessage);
            setNewMessage('');
            scrollToBottom();

            // Reset the min-width after a short delay
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.style.minWidth = '';
                }
            }, 300);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setSendingFile(true);
            await sendFileMessage(chatId, currentUser.uid, file);
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setSendingFile(false);
        }
    };

    const openFileSelector = () => {
        fileInputRef.current?.click();
    };

    const openFilePreview = (fileData) => {
        setPreviewFile(fileData);
        setModalOpen(true);
    };

    const closeFilePreview = () => {
        setModalOpen(false);
    };

    // Get file icon based on file type
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

    // Render file preview
    const renderFilePreview = (fileReference) => {
        // Make sure we have a valid file reference with all needed properties
        if (!fileReference || !fileReference.url) {
            console.warn('Invalid file reference:', fileReference);
            return null;
        }

        const { name, url, type } = fileReference;
        console.log('Rendering file preview for:', { name, url, type });

        // Image preview
        if (type && type.startsWith('image/')) {
            return (
                <Card sx={{ maxWidth: 300, mb: 1 }}>
                    <CardActionArea onClick={() => openFilePreview(fileReference)}>
                        <CardMedia
                            component="img"
                            height="140"
                            image={url}
                            alt={name}
                            sx={{ objectFit: 'cover' }}
                        />
                        <CardContent sx={{ py: 1 }}>
                            <Typography variant="body2" noWrap>
                                {name}
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>
            );
        }

        // PDF, document, or other file
        return (
            <Card sx={{ maxWidth: 300, mb: 1 }}>
                <CardActionArea onClick={() => openFilePreview(fileReference)}>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 2, color: 'primary.main' }}>
                            {getFileIcon(type)}
                        </Box>
                        <Box>
                            <Typography variant="body2" noWrap>
                                {name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Click to preview
                            </Typography>
                        </Box>
                    </Box>
                </CardActionArea>
            </Card>
        );
    };

    return (
        <>
            <Paper
                sx={{
                    height: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',  // Ensure full width
                    maxWidth: '100%' // Prevent overflow
                }}
            >
                {/* Messages area */}
                <Box
                    ref={messagesContainerRef}
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        p: 2,
                        width: '100%', // Ensure full width 
                        transition: 'none' // Prevent transitions that could cause layout shifts
                    }}
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <List>
                            {messages.map((message) => {
                                const isCurrentUser = message.senderId === currentUser.uid;
                                const isSystem = message.senderId === 'system';

                                return (
                                    <ListItem
                                        key={message.id}
                                        sx={{
                                            justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                                            alignItems: 'flex-start',
                                            mb: 1,
                                            px: 1
                                        }}
                                    >
                                        {isSystem ? (
                                            // System message
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    textAlign: 'center',
                                                    my: 1
                                                }}
                                            >
                                                <Paper
                                                    sx={{
                                                        display: 'inline-block',
                                                        px: 2,
                                                        py: 1,
                                                        bgcolor: 'grey.100',
                                                        maxWidth: '80%'
                                                    }}
                                                >
                                                    <Typography variant="body2">{message.text}</Typography>

                                                    {/* Render file attachments for system messages */}
                                                    {message.fileReferences && message.fileReferences.length > 0 && (
                                                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                                                            {message.fileReferences.map((fileRef, index) => {
                                                                // Make sure we log what's happening
                                                                console.log('System message file reference:', fileRef);

                                                                // For older messages that might not have type
                                                                if (!fileRef.type) {
                                                                    // Try to infer type from name if possible
                                                                    const extension = fileRef.name.split('.').pop().toLowerCase();
                                                                    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                                                                        fileRef.type = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
                                                                    } else if (extension === 'pdf') {
                                                                        fileRef.type = 'application/pdf';
                                                                    }
                                                                    // For other types, we'll use a generic type
                                                                    else {
                                                                        fileRef.type = 'application/octet-stream';
                                                                    }
                                                                }

                                                                return (
                                                                    <Button
                                                                        key={index}
                                                                        startIcon={getFileIcon(fileRef.type)}
                                                                        variant="text"
                                                                        size="small"
                                                                        onClick={() => openFilePreview(fileRef)}
                                                                        sx={{ mb: 1, textTransform: 'none' }}
                                                                    >
                                                                        {fileRef.name}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </Box>
                                                    )}
                                                </Paper>
                                            </Box>
                                        ) : (
                                            // User message
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                                                    alignItems: 'flex-start',
                                                    maxWidth: '80%'
                                                }}
                                            >
                                                {!isCurrentUser && (
                                                    <Avatar
                                                        src={otherUser?.photoURL}
                                                        alt={otherUser?.displayName || 'User'}
                                                        sx={{ width: 36, height: 36, mr: 1 }}
                                                    />
                                                )}

                                                <Box>
                                                    {/* File message */}
                                                    {message.type === 'file' && message.fileReference && (
                                                        renderFilePreview(message.fileReference)
                                                    )}

                                                    {/* Text message */}
                                                    {(!message.type || message.type === 'text') && (
                                                        <Paper
                                                            elevation={1}
                                                            sx={{
                                                                p: 1.5,
                                                                bgcolor: isCurrentUser ? 'primary.light' : 'background.paper',
                                                                color: isCurrentUser ? 'white' : 'inherit',
                                                                borderRadius: '8px',
                                                                maxWidth: '300px'
                                                            }}
                                                        >
                                                            <Typography variant="body2">{message.text}</Typography>
                                                        </Paper>
                                                    )}

                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            display: 'block',
                                                            mt: 0.5,
                                                            ml: isCurrentUser ? 0 : 1,
                                                            textAlign: isCurrentUser ? 'right' : 'left',
                                                            color: 'text.secondary'
                                                        }}
                                                    >
                                                        {message.timestamp?.toDate().toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </ListItem>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </List>
                    )}
                </Box>

                {/* Message input */}
                <Box
                    sx={{
                        p: 2,
                        borderTop: '1px solid #e0e0e0',
                        width: '100%' // Ensure full width
                    }}
                >
                    <form
                        onSubmit={handleSendMessage}
                        style={{ width: '100%' }} // Full width form
                    >
                        <Grid
                            container
                            spacing={1}
                            alignItems="center"
                            sx={{ width: '100%' }} // Full width grid
                        >
                            <Grid item>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                                <Tooltip title="Attach file">
                                    <IconButton
                                        color="primary"
                                        onClick={openFileSelector}
                                        disabled={sendingFile}
                                    >
                                        {sendingFile ? <CircularProgress size={24} /> : <AttachFileIcon />}
                                    </IconButton>
                                </Tooltip>
                            </Grid>
                            <Grid
                                item
                                xs
                                sx={{
                                    flex: 1,
                                    minWidth: 0 // Allow the text field to shrink properly
                                }}
                            >
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder="Type a message"
                                    size="small"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={sendingFile}
                                    sx={{
                                        width: '100%',
                                        '& .MuiInputBase-root': {
                                            width: '100%' // Ensure the input base is full width
                                        },
                                        '& .MuiInputBase-input': {
                                            width: '100%', // Ensure the actual input is full width
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }
                                    }}
                                    inputProps={{
                                        style: { width: '100%' } // Force full width on the input element
                                    }}
                                />
                            </Grid>
                            <Grid item>
                                <IconButton
                                    color="primary"
                                    type="submit"
                                    disabled={!newMessage.trim() || sendingFile}
                                >
                                    <SendIcon />
                                </IconButton>
                            </Grid>
                        </Grid>
                    </form>
                </Box>
            </Paper>

            {/* File Preview Modal */}
            <FilePreviewModal
                open={modalOpen}
                onClose={closeFilePreview}
                file={previewFile}
            />
        </>
    );
} 