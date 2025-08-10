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
    Button,
    CircularProgress,
    Tooltip,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActionArea,
    LinearProgress,
    Collapse,
    Chip,
    Skeleton
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
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SupportIcon from '@mui/icons-material/Support';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    getChatMessages,
    sendTextMessage,
    sendFileMessage,
    sendVoiceMessage,
    getChatFiles,
    getChatExpiryStatus,
    submitFeedback
} from '../services/chatService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { formatLocalDate, formatLocalTime } from '@/utils/utils';
import FilePreviewModal from './FilePreviewModal';
import FeedbackPrompt from './FeedbackPrompt';
import GenericModal from './GenericModal';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';


export default function ChatBox({ chatId, otherUser, isAdminChat = false, disableInput = false, chat = null, onLoadingChange }) {
    const { t } = useTranslation('common');
    const { currentUser, hasRole, userRoles } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sendingFile, setSendingFile] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const messagesContainerRef = useRef(null);

    // Files section state
    const [showFiles, setShowFiles] = useState(false);
    const [chatFiles, setChatFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

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

    // Notification state
    const [showNewMessageSnackbar, setShowNewMessageSnackbar] = useState(false);
    const [newMessageContent, setNewMessageContent] = useState('');
    const [windowFocused, setWindowFocused] = useState(true);
    const [atBottom, setAtBottom] = useState(true);
    const lastMessageIdRef = useRef(null);

    // 24-hour window control – allow sending only within 24 h for clients
    const [sendAllowed, setSendAllowed] = useState(true);
    const [chatExpiryStatus, setChatExpiryStatus] = useState(null);

    // Admin chat state
    const [adminChatId, setAdminChatId] = useState(null);
    const [showAdminChatPrompt, setShowAdminChatPrompt] = useState(false);
    const [adminChatAvailableForChat, setAdminChatAvailableForChat] = useState(new Set());

    // Feedback modal state
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [submittedFeedbackData, setSubmittedFeedbackData] = useState(null);
    const [modalMode, setModalMode] = useState('feedback'); // 'feedback' or 'admin-chat'
    const [issueResolved, setIssueResolved] = useState(false);

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

    // Check 24-hour window for clients
    useEffect(() => {
        let intervalId;

        const checkWindow = async () => {
            if (!chatId || isAstrologer) {
                // Astrologers are always allowed to send
                setSendAllowed(true);
                setChatExpiryStatus(null);
                return;
            }

            // For admin chats, don't check expiry (admin chats don't expire)
            if (isAdminChat) {
                setSendAllowed(true);
                setChatExpiryStatus(null);
                return;
            }

            try {
                console.log('Checking chat expiry status', chatId);
                const expiryStatus = await getChatExpiryStatus(chatId);
                setChatExpiryStatus(expiryStatus);
                setSendAllowed(!expiryStatus.isExpired);

                // If chat is expired, check for unresolved admin chats
                if (expiryStatus.isExpired) {
                    const { getUnresolvedAdminChats } = await import('../services/chatService');
                    const unresolvedAdminChats = await getUnresolvedAdminChats(chatId);

                    if (unresolvedAdminChats.length > 0) {
                        setFeedbackModalOpen(false);
                        // There are unresolved admin chats, show admin chat prompt
                        setAdminChatAvailableForChat(prev => new Set([...prev, chatId]));
                    } else {
                        // No unresolved admin chats, check feedback status
                        if (!feedbackSubmitted) {
                            // Show feedback modal if feedback hasn't been submitted
                            setFeedbackModalOpen(true);
                        }
                        // If feedback is submitted, just show the expired message (no prompt needed)
                    }
                }
            } catch (err) {
                console.error('[ChatBox] Error checking 24-hour window:', err);
                setSendAllowed(true);
                setChatExpiryStatus(null);
            }
        };

        checkWindow();
        // Re-evaluate every 30 seconds for more responsive updates
        intervalId = setInterval(checkWindow, 30 * 1000);

        return () => clearInterval(intervalId);
    }, [chatId, isAstrologer, feedbackSubmitted, isAdminChat]);

    // Listen for chat document changes (like expiry extensions)
    useEffect(() => {
        if (!chatId || isAstrologer || isAdminChat) return;

        let unsubscribe;

        const listenToChatChanges = async () => {
            try {
                const chatDocRef = doc(db, 'chats', chatId);
                unsubscribe = onSnapshot(chatDocRef, (chatDoc) => {
                    if (chatDoc.exists()) {
                        const chatData = chatDoc.data();
                        console.log('Chat document updated:', chatData);

                        // Re-check expiry status when chat document changes
                        const checkExpiryAfterUpdate = async () => {
                            try {
                                const expiryStatus = await getChatExpiryStatus(chatId);
                                setChatExpiryStatus(expiryStatus);
                                setSendAllowed(!expiryStatus.isExpired);

                                // If chat is no longer expired, hide feedback modal and admin chat prompt
                                if (!expiryStatus.isExpired) {
                                    setFeedbackModalOpen(false);
                                    setFeedbackSubmitted(false);
                                    setAdminChatAvailableForChat(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(chatId);
                                        return newSet;
                                    });
                                }
                            } catch (error) {
                                console.error('Error checking expiry after chat update:', error);
                            }
                        };

                        checkExpiryAfterUpdate();
                    }
                });
            } catch (error) {
                console.error('Error setting up chat document listener:', error);
            }
        };

        listenToChatChanges();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [chatId, isAstrologer, isAdminChat]);

    // Load messages
    useEffect(() => {
        let unsubscribe;

        const fetchMessages = async () => {
            try {
                setLoading(true);

                // Use the appropriate message function based on chat type
                if (isAdminChat) {
                    const { getAdminClientChatMessages } = await import('../services/chatService');
                    unsubscribe = getAdminClientChatMessages(chatId, (messages) => {
                        setMessages(messages);
                        setLoading(false);
                        scrollToBottom();
                    });
                } else {
                    // Use the real-time listener and store unsubscribe function
                    unsubscribe = getChatMessages(chatId, (messages) => {
                        setMessages(messages);
                        setLoading(false);
                        scrollToBottom();
                    });
                }
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
    }, [chatId, isAdminChat]);

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

            if (isAdminChat) {
                const { sendAdminClientMessage } = await import('../services/chatService');
                await sendAdminClientMessage(chatId, currentUser.uid, newMessage);
            } else {
                await sendTextMessage(chatId, currentUser.uid, newMessage);
            }
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
            // Reload chat files to update the files section
            const files = await getChatFiles(chatId);
            setChatFiles(files);
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

    // Handle feedback submission
    const handleFeedbackSubmit = async (feedbackData) => {
        try {
            await submitFeedback(chatId, feedbackData);
            setFeedbackSubmitted(true);
            setSubmittedFeedbackData(feedbackData);
            setFeedbackModalOpen(false);
            // You could show a success message here
        } catch (error) {
            console.error('Error submitting feedback:', error);
            // You could show an error message here
        }
    };

    // Handle feedback skip
    const handleFeedbackSkip = () => {
        setFeedbackSubmitted(true);
        setFeedbackModalOpen(false);
    };

    // Handle contact admin
    // Handle clicking on admin chat system message
    const handleAdminChatClick = async (adminChatId) => {
        try {
            setAdminChatId(adminChatId);
            setModalMode('admin-chat');
            setFeedbackModalOpen(true);
        } catch (error) {
            console.error('Error opening admin chat:', error);
        }
    };

    // Check if admin chat issue is resolved
    const checkIssueResolution = async () => {
        if (!adminChatId) return;

        try {
            const { getUnresolvedAdminChats } = await import('../services/chatService');
            const unresolvedChats = await getUnresolvedAdminChats(chatId);

            if (unresolvedChats.length === 0) {
                // Issue is resolved, don't show admin chat prompt
                setIssueResolved(true);
                setAdminChatAvailableForChat(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(chatId);
                    return newSet;
                });
            } else {
                // Issue is not resolved, show admin chat prompt
                setIssueResolved(false);
                setAdminChatAvailableForChat(prev => new Set([...prev, chatId]));
            }
        } catch (error) {
            console.error('Error checking issue resolution:', error);
        }
    };

    const handleContactAdmin = async () => {
        try {
            // Check if admin chat already exists
            const { getExistingAdminChat, createAdminClientChat } = await import('../services/chatService');
            let adminChat = await getExistingAdminChat(chatId);

            if (adminChat) {
                // Use existing admin chat
                setAdminChatId(adminChat.id);
            } else {
                // Create new admin-client chat
                const newAdminChatId = await createAdminClientChat(chatId, currentUser.uid);
                setAdminChatId(newAdminChatId);
            }

            // Set modal to admin chat mode and open it
            setModalMode('admin-chat');
            setFeedbackModalOpen(true);

            // Remove this chat from admin chat available set
            setAdminChatAvailableForChat(prev => {
                const newSet = new Set(prev);
                newSet.delete(chatId);
                return newSet;
            });

            // Hide feedback modal if it was triggered from there
            if (feedbackModalOpen && modalMode === 'feedback') {
                setFeedbackSubmitted(true);
            }
        } catch (error) {
            console.error('Error creating admin chat:', error);
            // You might want to show an error message to the user
        }
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

        const { name, url, type, size } = fileReference;
        // Helper to format file size
        const formatSize = (bytes) => {
            if (!bytes) return '';
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
        };

        // Image preview (large thumbnail)
        if (type && type.startsWith('image/')) {
            return (
                <Card sx={{ maxWidth: 340, mb: 1, boxShadow: 3 }}>
                    <CardActionArea onClick={() => openFilePreview(fileReference)}>
                        <Tooltip title={name} arrow>
                            <CardMedia
                                component="img"
                                height="180"
                                image={url}
                                alt={name}
                                sx={{ objectFit: 'cover', background: '#fafafa' }}
                            />
                        </Tooltip>
                        <CardContent sx={{ py: 1 }}>
                            <Typography variant="body2" noWrap>{name}</Typography>
                            <Typography variant="caption" color="text.secondary">{formatSize(size)}</Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>
            );
        }

        // PDF preview (show icon, and try to show a preview image if available in the future)
        if (type === 'application/pdf') {
            return (
                <Card sx={{ maxWidth: 340, mb: 1, boxShadow: 3 }}>
                    <CardActionArea onClick={() => openFilePreview(fileReference)}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }}>
                            <PictureAsPdfIcon sx={{ fontSize: 60, color: 'error.main', mb: 1 }} />
                        </Box>
                        <CardContent sx={{ py: 1 }}>
                            <Typography variant="body2" noWrap>{name}</Typography>
                            <Typography variant="caption" color="text.secondary">PDF &bull; {formatSize(size)}</Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>
            );
        }

        // Other files (show icon, type, and size)
        return (
            <Card sx={{ maxWidth: 340, mb: 1, boxShadow: 3 }}>
                <CardActionArea onClick={() => openFilePreview(fileReference)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }}>
                        <Tooltip title={type || 'Unknown file type'} arrow>
                            <Box sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}>
                                {getFileIcon(type)}
                            </Box>
                        </Tooltip>
                    </Box>
                    <CardContent sx={{ py: 1 }}>
                        <Typography variant="body2" noWrap>{name}</Typography>
                        <Tooltip title={type || 'Unknown file type'} arrow>
                            <Typography variant="caption" color="text.secondary">
                                {type ? `${type.split('/').pop().toUpperCase()}` : 'File'} &bull; {formatTime(size)}
                            </Typography>
                        </Tooltip>
                    </CardContent>
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

    // Get sender name for display
    const getSenderName = (message) => {
        if (message.senderId === currentUser?.uid) {
            return 'You';
        }

        // For support messages sent on behalf of astrologer, show astrologer's name
        if (message.sentBySupport && message.senderId !== currentUser?.uid) {
            return chat?.astrologerName || 'Astrologer';
        }

        // For support messages to astrologer, show support name
        if (message.sentToAstrologer) {
            return 'Support';
        }

        // For other users, show their display name
        return otherUser?.displayName || 'User';
    };

    // Check if we should show sender name (hide for clients on support messages)
    const shouldShowSenderName = (message) => {
        // If user is astrologer, support, or admin, always show names
        const isSupport = userRoles.includes('support');
        const isAdmin = userRoles.includes('admin');

        if (isAstrologer || isSupport || isAdmin) {
            return true;
        }

        // For clients, hide names on support messages (sent on behalf of astrologer)
        if (message.sentBySupport && message.senderId !== currentUser?.uid) {
            return false;
        }

        return true;
    };

    // Filter messages based on user role and message type
    const getFilteredMessages = () => {
        if (!messages) return [];

        // Check if current user has support or admin role
        const isSupport = userRoles.includes('support');
        const isAdmin = userRoles.includes('admin');

        // If user is astrologer, support, or admin, show all messages
        if (isAstrologer || isSupport || isAdmin) {
            return messages;
        }

        // For clients, hide support-to-astrologer messages
        return messages.filter(message => !message.sentToAstrologer);
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
        console.log('handleAudioPlay', messageId, audioUrl, audioRefs.current);
        const isPreview = messageId === 'preview';
        const currentAudioRef = audioRefs.current[messageId];

        // If the audio element is not yet in the DOM (user clicked very fast),
        // create a temporary one so playback still works.
        let audioEl = currentAudioRef;
        if (!audioEl) {
            if (!audioUrl) {
                console.warn('[ChatBox] Audio element not ready and no URL provided for messageId:', messageId);
                return;
            }

            // Dynamically create an Audio element
            audioEl = new Audio(audioUrl);
            audioEl.preload = 'auto';

            // Wire up progress and end listeners so UI stays in sync
            audioEl.addEventListener('timeupdate', (e) => handleAudioProgress(messageId, e));
            audioEl.addEventListener('ended', () => handleAudioEnd(messageId));

            // Store in ref map so subsequent controls work normally
            audioRefs.current[messageId] = audioEl;
        }

        // If the same audio is playing – pause/stop it
        if (playingAudio === messageId) {
            try {
                audioEl.pause();
            } catch (err) {
                console.error('[ChatBox] Error pausing audio:', err);
            }
            setPlayingAudio(null);
            return;
        }

        // Stop any currently playing audio (except preview)
        if (playingAudio && playingAudio !== 'preview' && audioRefs.current[playingAudio]) {
            try {
                audioRefs.current[playingAudio].pause();
                audioRefs.current[playingAudio].currentTime = 0;
            } catch (err) {
                console.error('[ChatBox] Error stopping existing audio:', err);
            }
            setAudioProgress(prev => ({ ...prev, [playingAudio]: 0 }));
        }

        // Ensure the audio is reloaded (helps on some browsers)
        try {
            audioEl.load();
            const playPromise = audioEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => {
                    console.error('[ChatBox] Audio play() error:', err);
                });
            }
            setPlayingAudio(messageId);
        } catch (err) {
            console.error('[ChatBox] Error playing audio:', err);
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
        // Calculate current time for display
        const audioRef = audioRefs.current[message.id];
        const currentTime = audioRef ? audioRef.currentTime : 0;
        const duration = message.voiceReference?.duration || 0;

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: '220px', py: 1 }}>
                <IconButton
                    onClick={() => handleAudioPlay(message.id, message.voiceReference.url)}
                    color={isPlaying ? 'secondary' : 'primary'}
                    size="large"
                    sx={{
                        border: '2px solid',
                        borderColor: isPlaying ? 'secondary.main' : 'primary.main',
                        background: isPlaying ? 'rgba(25, 118, 210, 0.08)' : 'white',
                        width: 48,
                        height: 48,
                        mr: 1
                    }}
                >
                    {isPlaying ? <PauseIcon sx={{ fontSize: 32 }} /> : <PlayArrowIcon sx={{ fontSize: 32 }} />}
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 100 }}>
                    {/* Waveform/progress bar */}
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            background: 'rgba(25, 118, 210, 0.08)',
                            '& .MuiLinearProgress-bar': {
                                background: isPlaying ? theme => theme.palette.secondary.main : theme => theme.palette.primary.main,
                            },
                            mb: 0.5
                        }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            {formatTime(currentTime)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatTime(duration)}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    };

    // Track window/tab focus
    useEffect(() => {
        const handleFocus = () => setWindowFocused(true);
        const handleBlur = () => setWindowFocused(false);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Track scroll position in chat
    useEffect(() => {
        const handleScroll = () => {
            if (!messagesContainerRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            // Consider at bottom if within 40px of bottom
            setAtBottom(scrollHeight - scrollTop - clientHeight < 40);
        };
        const container = messagesContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [messagesContainerRef]);

    // Request browser notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Listen for new messages and show notifications
    useEffect(() => {
        if (!messages || messages.length === 0) return;
        const lastMessage = messages[messages.length - 1];
        // Only notify if the last message is not from the current user
        if (lastMessage.senderId !== currentUser?.uid && lastMessage.id !== lastMessageIdRef.current) {
            lastMessageIdRef.current = lastMessage.id;
            let content = lastMessage.text || 'New message';

            // Handle single file reference
            if (lastMessage.fileReference?.name) {
                content = `Sent a file: ${lastMessage.fileReference.name}`;
            }
            // Handle multiple file references
            else if (lastMessage.fileReferences && lastMessage.fileReferences.length > 0) {
                content = `Sent ${lastMessage.fileReferences.length} file(s)`;
            }

            setNewMessageContent(content);
            // If window not focused or not at bottom, show snackbar
            if (!windowFocused || !atBottom) {
                setShowNewMessageSnackbar(true);
            }
            // Browser notification if permission granted and window not focused
            if ('Notification' in window && Notification.permission === 'granted' && !windowFocused) {
                const notif = new Notification(otherUser?.displayName || 'New Message', {
                    body: content,
                    icon: otherUser?.photoURL || '/images/default-avatar.png',
                });
                notif.onclick = () => {
                    window.focus();
                    notif.close();
                };
            }
        }
    }, [messages, windowFocused, atBottom, currentUser, otherUser]);

    // Handler for snackbar click (scroll to bottom)
    const handleSnackbarClick = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
        setShowNewMessageSnackbar(false);
    };

    // Load chat files when component mounts or chatId changes
    useEffect(() => {
        const loadChatFiles = async () => {
            if (!chatId) return;

            try {
                setLoadingFiles(true);
                const files = await getChatFiles(chatId);
                setChatFiles(files);
            } catch (error) {
                console.error('Error loading chat files:', error);
            } finally {
                setLoadingFiles(false);
            }
        };

        loadChatFiles();
    }, [chatId]);

    const toggleFilesSection = () => {
        setShowFiles(!showFiles);
    };

    // Notify parent about loading state changes
    useEffect(() => {
        if (typeof onLoadingChange === 'function') {
            onLoadingChange(loading);
        }
    }, [loading, onLoadingChange]);

    return (
        <>
            {modalMode === 'admin-chat' && feedbackModalOpen ? (
                <Paper
                    sx={{
                        // height: {
                        //     xs: 'calc(100vh - 150px)',
                        //     sm: 'calc(100vh - 180px)',
                        //     md: '70vh',
                        // },
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        maxWidth: '100%',
                        position: 'relative',
                        backgroundColor: 'transparent',
                        boxShadow: 'none'
                    }}
                >
                    {/* // Admin chat takes over the entire messages container */}
                    <GenericModal
                        open={feedbackModalOpen}
                        onClose={() => {
                            setFeedbackModalOpen(false);
                            setModalMode('feedback');
                            // Check if issue is resolved when closing admin chat
                            checkIssueResolution();
                        }}
                        title={t('chat.adminSupport')}
                        subtitle={t('chat.adminWillRespond')}
                        maxWidth={false}
                        fullWidth={true}
                        inline={true}
                    >
                        <ChatBox
                            chatId={adminChatId}
                            otherUser={{
                                displayName: t('chat.admin'),
                                photoURL: null,
                                uid: 'admin'
                            }}
                            isAdminChat={true}
                        />
                    </GenericModal>
                </Paper>
            ) : modalMode === 'feedback' && feedbackModalOpen ? (
                <Paper
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        maxWidth: '100%',
                        position: 'relative'
                    }}
                >
                    <GenericModal
                        open={feedbackModalOpen}
                        onClose={() => setFeedbackModalOpen(false)}
                        title={t('feedback.title')}
                        subtitle={t('feedback.subtitle')}
                        maxWidth="sm"
                        fullWidth={true}
                        inline={true}
                    >
                        <FeedbackPrompt
                            onSubmit={handleFeedbackSubmit}
                            onSkip={handleFeedbackSkip}
                            onContactAdmin={handleContactAdmin}
                            submittedFeedback={submittedFeedbackData}
                        />
                    </GenericModal>
                </Paper>
            ) : (
                <Paper
                    sx={{
                        height: {
                            xs: 'calc(100vh - 150px)',
                            sm: 'calc(100vh - 180px)',
                            md: '70vh'
                        },
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        maxWidth: '100%',
                        position: 'relative'
                    }}
                >
                    {/* Files section header */}
                    <Box sx={{ borderBottom: '1px solid #e0e0e0', p: 1 }}>
                        <Button
                            startIcon={<FolderIcon />}
                            endIcon={showFiles ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            onClick={toggleFilesSection}
                            size="small"
                            sx={{ textTransform: 'none' }}
                        >
                            Files ({chatFiles.length})
                        </Button>

                        <Collapse in={showFiles}>
                            <Box sx={{ mt: 1, maxHeight: '150px', overflow: 'auto' }}>
                                {loadingFiles ? (
                                    <CircularProgress size={20} />
                                ) : chatFiles.length > 0 ? (
                                    <Grid container spacing={1}>
                                        {chatFiles.map((file) => (
                                            <Grid item xs={12} sm={6} md={4} key={file.id}>
                                                <Button
                                                    startIcon={getFileIcon(file.type)}
                                                    onClick={() => openFilePreview(file)}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        textTransform: 'none',
                                                        justifyContent: 'flex-start',
                                                        width: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {file.name}
                                                </Button>
                                            </Grid>
                                        ))}
                                    </Grid>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No files uploaded yet
                                    </Typography>
                                )}
                            </Box>
                        </Collapse>
                    </Box>

                    {/* Messages area */}
                    <Box
                        ref={messagesContainerRef}
                        sx={{
                            flex: 1,
                            overflow: 'auto',
                            p: 2,
                            width: '100%',
                            transition: 'none',
                            position: 'relative',
                            // minHeight: '500px', // Increased to 500px as requested
                            // height: 'max-content'

                        }}
                    >
                        <>
                            {loading ? (
                                <List sx={{ height: '100%' }}>
                                    {Array.from({ length: 8 }).map((_, idx) => (
                                        <ListItem key={idx} sx={{ alignItems: 'flex-start' }}>
                                            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                                                <Skeleton variant="circular" width={40} height={40} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Skeleton variant="rectangular" height={22} sx={{ mb: 1, maxWidth: 300 }} />
                                                    <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                                                </Box>
                                            </Box>
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <List sx={{ height: '100%' }}>
                                    {/* {console.log(messages)} */}
                                    {getFilteredMessages().map((message) => {
                                        const isCurrentUser = message.senderId === currentUser.uid;
                                        const isSystem = message.senderId === 'system';
                                        const isSupportChat = message.sentToAstrologer;

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
                                                        {message.isAdminChatLink ? (
                                                            // Clickable admin chat system message
                                                            <Paper
                                                                sx={{
                                                                    display: 'inline-block',
                                                                    px: 2,
                                                                    py: 1,
                                                                    bgcolor: 'primary.light',
                                                                    color: 'white',
                                                                    maxWidth: '80%',
                                                                    cursor: 'pointer',
                                                                    '&:hover': {
                                                                        bgcolor: 'primary.main'
                                                                    }
                                                                }}
                                                                onClick={() => handleAdminChatClick(message.adminChatId)}
                                                            >
                                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <SupportIcon sx={{ fontSize: '1rem' }} />
                                                                    {message.text}
                                                                </Typography>
                                                            </Paper>
                                                        ) : (
                                                            // Regular system message with structured metadata chips
                                                            <Paper
                                                                sx={{
                                                                    display: 'inline-block',
                                                                    px: 2,
                                                                    py: 1,
                                                                    bgcolor: 'grey.100',
                                                                    maxWidth: '90%'
                                                                }}
                                                            >
                                                                <Typography variant="body2" sx={{ mb: message.metadata ? 1 : 0 }}>{message.text}</Typography>
                                                                {message.metadata && (
                                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
                                                            </Paper>
                                                        )}
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
                                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1 }}>
                                                                <Avatar
                                                                    src={message.sentBySupport ? chat?.astrologerPhotoURL : otherUser?.photoURL}
                                                                    alt={getSenderName(message)}
                                                                    sx={{ width: 54, height: 54, mb: 0.5 }}
                                                                />
                                                                {shouldShowSenderName(message) && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 500,
                                                                            color: 'text.secondary',
                                                                            textAlign: 'center',
                                                                            maxWidth: 60,
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                    >
                                                                        {getSenderName(message)}
                                                                    </Typography>
                                                                )}
                                                            </Box>
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

                                                            {/* Multiple file references (from initial upload) */}
                                                            {message.fileReferences && message.fileReferences.length > 0 && (
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                                    {message.fileReferences.map((fileRef, index) => (
                                                                        <Box key={index}>
                                                                            {renderFilePreview(fileRef)}
                                                                        </Box>
                                                                    ))}
                                                                </Box>
                                                            )}

                                                            {/* Text message */}
                                                            {(!message.type || message.type === 'text') && (
                                                                <Paper
                                                                    elevation={1}
                                                                    sx={{
                                                                        p: 1.5,
                                                                        bgcolor: isCurrentUser ? 'primary.light' : isSupportChat ? 'background.support' : 'background.paper',
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
                        </>
                    </Box>

                    {/* Admin Chat Prompt */}
                    {adminChatAvailableForChat.has(chatId) && !issueResolved && (
                        <Box
                            sx={{
                                p: 2,
                                borderTop: '1px solid #e0e0e0',
                                bgcolor: 'primary.light',
                                color: 'white',
                                // position: 'sticky',
                                // bottom: 0,
                                zIndex: 10
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: 'primary.main',
                                        borderRadius: 1,
                                        px: 1
                                    }
                                }}
                                onClick={handleContactAdmin}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">
                                        {t('chat.adminChatAvailable')}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    {t('chat.clickToOpenAdminChat')}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Message input */}
                    {!disableInput && (
                        <Box
                            sx={{
                                p: 2,
                                borderTop: '1px solid #e0e0e0',
                                width: '100%',
                                minHeight: '70px',
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: 'background.paper',
                                // position: 'sticky',
                                // bottom: 0,
                                zIndex: 5
                            }}
                        >
                            {(!isAstrologer && !sendAllowed) ? (
                                <Box sx={{ textAlign: 'center', width: '100%', p: 2 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {feedbackSubmitted ?
                                            t('chat.expiredWithFeedback') :
                                            t('chat.expiredWithoutFeedback')
                                        }
                                    </Typography>
                                    {feedbackSubmitted && (
                                        <Typography variant="caption" color="text.secondary">
                                            {t('chat.thankYouForFeedback')}
                                        </Typography>
                                    )}
                                </Box>
                            ) : (
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
                                            <Grid container spacing={1} alignItems="center" sx={{ width: '100%', flexWrap: 'nowrap' }}>

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
                                                        {/* {isAstrologer && ( */}
                                                        <Tooltip title="Record voice message">
                                                            <IconButton
                                                                color="primary"
                                                                onClick={startRecording}
                                                                disabled={sendingFile}
                                                            >
                                                                <MicIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {/* )} */}
                                                    </Box>
                                                </Grid>

                                                <Grid item sx={{ flex: 1 }}>
                                                    <TextField
                                                        variant="outlined"
                                                        placeholder="Type a message"
                                                        size="small"
                                                        value={newMessage}
                                                        onChange={(e) => setNewMessage(e.target.value)}
                                                        disabled={sendingFile || (!isAstrologer && !sendAllowed)}
                                                        fullWidth
                                                    />
                                                </Grid>

                                                <Grid item sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <IconButton
                                                        color="primary"
                                                        type="submit"
                                                        disabled={!newMessage.trim() || sendingFile || (!isAstrologer && !sendAllowed)}
                                                    >
                                                        <SendIcon />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
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
                            )}
                        </Box>
                    )}
                </Paper>
            )}


            {/* File Preview Modal */}
            <FilePreviewModal
                open={modalOpen}
                onClose={closeFilePreview}
                file={previewFile}
            />



            {/* Snackbar for new messages */}
            <Snackbar
                open={showNewMessageSnackbar}
                autoHideDuration={6000}
                onClose={() => setShowNewMessageSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <MuiAlert
                    elevation={6}
                    variant="filled"
                    onClick={handleSnackbarClick}
                    severity="info"
                    sx={{ cursor: 'pointer' }}
                >
                    New message: {newMessageContent} (Click to view)
                </MuiAlert>
            </Snackbar>
        </>
    );
} 