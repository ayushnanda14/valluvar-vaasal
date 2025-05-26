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
    CardActionArea,
    LinearProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import {
    getChatMessages,
    sendTextMessage,
    sendFileMessage,
    sendVoiceMessage
} from '../services/chatService';
import FilePreviewModal from './FilePreviewModal';

export default function ChatBox({ chatId, otherUser }) {
    const { currentUser, hasRole } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sendingFile, setSendingFile] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const messagesContainerRef = useRef(null);
    
    // Voice recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const recordingTimerRef = useRef(null);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isRecordingComplete, setIsRecordingComplete] = useState(false);
    
    // Audio playback states
    const [playingAudio, setPlayingAudio] = useState(null);
    const [audioProgress, setAudioProgress] = useState({});
    const audioRefs = useRef({});
    const [isAstrologer, setIsAstrologer] = useState(false);
    const [previewAudioProgress, setPreviewAudioProgress] = useState(0);

    // Add new state for sound wave animation
    const [soundWaveHeight, setSoundWaveHeight] = useState(0);
    const soundWaveIntervalRef = useRef(null);

    // Check if user is an astrologer
    useEffect(() => {
        const checkAstrologerRole = async () => {
            if (currentUser) {
                console.log('[ChatBox] Checking astrologer role. currentUser.uid:', currentUser.uid);
                // Log roles if they exist on the currentUser object provided by AuthContext
                if (currentUser.roles) {
                    console.log('[ChatBox] currentUser.roles from AuthContext:', JSON.stringify(currentUser.roles));
                } else {
                    console.log('[ChatBox] currentUser.roles is not directly available on the currentUser object in ChatBox.');
                }
                const astrologerCheckResult = await hasRole('astrologer');
                console.log('[ChatBox] Result of hasRole("astrologer"):', astrologerCheckResult);
                setIsAstrologer(astrologerCheckResult);
            } else {
                console.log('[ChatBox] No currentUser available for role check.');
                setIsAstrologer(false); // Ensure isAstrologer is false if no currentUser
            }
        };
        checkAstrologerRole();
    }, [currentUser, hasRole]);

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

    // Format time in MM:SS format
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Start voice recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudio({ blob: audioBlob, url: audioUrl });
                setIsRecordingComplete(true);
                setAudioChunks([]);
                // Stop sound wave animation
                if (soundWaveIntervalRef.current) {
                    clearInterval(soundWaveIntervalRef.current);
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setAudioChunks(chunks);
            setIsRecording(true);
            setRecordingTime(0);
            setIsRecordingComplete(false);
            setRecordedAudio(null);

            // Start sound wave animation
            soundWaveIntervalRef.current = setInterval(() => {
                setSoundWaveHeight(Math.random() * 30 + 10); // Random height between 10 and 40
            }, 100);

            // Start timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    };

    // Stop voice recording
    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);
            // Stop sound wave animation
            if (soundWaveIntervalRef.current) {
                clearInterval(soundWaveIntervalRef.current);
            }
        }
    };

    // Delete recorded audio
    const deleteRecording = () => {
        if (recordedAudio?.url) {
            URL.revokeObjectURL(recordedAudio.url);
        }
        setRecordedAudio(null);
        setIsRecordingComplete(false);
        setRecordingTime(0);
    };

    // Handle voice message send
    const handleVoiceMessageSend = async () => {
        if (!recordedAudio?.blob) return;

        try {
            setSendingFile(true);
            await sendVoiceMessage(chatId, currentUser.uid, recordedAudio.blob, recordingTime);
            setRecordingTime(0);
            setIsRecordingComplete(false);
            setRecordedAudio(null);
        } catch (error) {
            console.error('Error sending voice message:', error);
        } finally {
            setSendingFile(false);
        }
    };

    // Handle audio playback
    const handleAudioPlay = (messageId, audioUrl) => {
        const isPreview = messageId === 'preview';
        const currentAudioRef = audioRefs.current[messageId];

        if (playingAudio === messageId) {
            // Stop current audio
            if (currentAudioRef) {
                currentAudioRef.pause();
            }
            setPlayingAudio(null);
        } else {
            // Stop any currently playing audio (except preview)
            if (playingAudio && playingAudio !== 'preview' && audioRefs.current[playingAudio]) {
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
        if (messageId === 'preview') {
            setPreviewAudioProgress(progress);
        } else {
            setAudioProgress(prev => ({ ...prev, [messageId]: progress }));
        }
    };

    // Handle audio end
    const handleAudioEnd = (messageId) => {
        setPlayingAudio(null);
        if (messageId === 'preview') {
            setPreviewAudioProgress(0);
            if (audioRefs.current['preview']) {
                 audioRefs.current['preview'].currentTime = 0;
            }
        } else {
            setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
        }
    };

    // Render voice message
    const renderVoiceMessage = (message) => {
        const isPlaying = playingAudio === message.id;
        const progress = audioProgress[message.id] || 0;

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '200px' }}>
                <IconButton
                    onClick={() => handleAudioPlay(message.id, message.voiceReference.url)}
                    color="primary"
                    size="small"
                >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 4, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        {formatTime(message.voiceReference.duration)}
                    </Typography>
                </Box>
                <audio
                    ref={el => audioRefs.current[message.id] = el}
                    src={message.voiceReference.url}
                    onTimeUpdate={(e) => handleAudioProgress(message.id, e)}
                    onEnded={() => handleAudioEnd(message.id)}
                    style={{ display: 'none' }}
                />
            </Box>
        );
    };

    return (
        <>
            <Paper
                sx={{
                    height: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%'
                }}
            >
                {/* Messages area */}
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
                                                    {/* Voice message */}
                                                    {message.type === 'voice' && message.voiceReference && (
                                                        <Paper
                                                            elevation={1}
                                                            sx={{
                                                                p: 1.5,
                                                                bgcolor: isCurrentUser ? 'primary.light' : 'background.paper',
                                                                color: isCurrentUser ? 'white' : 'inherit',
                                                                borderRadius: '8px',
                                                                minWidth: '200px'
                                                            }}
                                                        >
                                                            {renderVoiceMessage(message)}
                                                        </Paper>
                                                    )}

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
                        width: '100%',
                        minHeight: '70px', // Fixed height to prevent wobble
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <form
                        onSubmit={handleSendMessage}
                        style={{ width: '100%' }}
                    >
                        <Grid
                            container
                            spacing={1}
                            alignItems="center"
                            // sx={{ width: '100%', flexWrap: 'nowrap' }} // Ensure items stay in one line
                        >
                            {!isRecording && !isRecordingComplete && (
                                <>
                                
                                    <Grid item>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
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

                                            {/* Voice recording button - only for astrologers */}
                                            {isAstrologer && (
                                                <Tooltip title="Record voice message">
                                                    <IconButton
                                                        color="primary"
                                                        onClick={startRecording}
                                                        disabled={sendingFile}
                                                    >
                                                        <MicIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Grid>

                                    <Grid item> {/* Allow TextField to grow to maximum width */}
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
                                                    width: '100%'
                                                },
                                                '& .MuiInputBase-input': {
                                                    width: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }
                                            }}
                                            inputProps={{
                                                style: { width: '100%' }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <IconButton
                                            color="primary"
                                            type="submit"
                                            disabled={!newMessage.trim() || sendingFile}
                                        >
                                            <SendIcon />
                                        </IconButton>
                                    </Grid>
                                </>
                            )}

                            {/* Recording UI */}
                            {isRecording && (
                                <Grid item xs sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconButton
                                            color="error"
                                            onClick={stopRecording}
                                            size="small"
                                        >
                                            <StopIcon />
                                        </IconButton>
                                        <Typography variant="body2" color="error">
                                            Recording... {formatTime(recordingTime)}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.5,
                                        flex: 1,
                                        justifyContent: 'center'
                                    }}>
                                        {[...Array(20)].map((_, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    width: 3,
                                                    height: soundWaveHeight,
                                                    bgcolor: 'primary.main',
                                                    borderRadius: 1,
                                                    transition: 'height 0.1s ease-in-out'
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Grid>
                            )}

                            {/* Recording preview UI */}
                            {isRecordingComplete && (
                                <Grid item xs sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                        <IconButton
                                            color="primary"
                                            onClick={() => {
                                                handleAudioPlay('preview', recordedAudio?.url)
                                            }}
                                            size="small"
                                        >
                                            {playingAudio === 'preview' ? <PauseIcon /> : <PlayArrowIcon />}
                                        </IconButton>
                                        <Typography variant="body2">
                                            {formatTime(recordingTime)}
                                        </Typography>
                                        <Box sx={{ flex: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={previewAudioProgress} // Use previewAudioProgress for preview
                                                sx={{ height: 4, borderRadius: 2 }}
                                            />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton
                                            color="error"
                                            onClick={deleteRecording}
                                            size="small"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                        <IconButton
                                            color="primary"
                                            onClick={handleVoiceMessageSend}
                                            disabled={sendingFile}
                                            size="small"
                                        >
                                            {sendingFile ? <CircularProgress size={20} /> : <SendIcon />}
                                        </IconButton>
                                    </Box>
                                    <audio
                                        ref={el => audioRefs.current['preview'] = el}
                                        src={recordedAudio?.url}
                                        onTimeUpdate={(e) => handleAudioProgress('preview', e)}
                                        onEnded={() => handleAudioEnd('preview')}
                                        style={{ display: 'none' }}
                                    />
                                </Grid>
                            )}
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