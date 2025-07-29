import React, { useState, useRef } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    Button,
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { sendMessageOnBehalfOfAstrologer, sendMessageToAstrologer, sendVoiceMessage } from '../services/chatService';
import ChatBox from './ChatBox';

export default function SupportChatBox({ chatId, otherUser, chat }) {
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [messageType, setMessageType] = useState('to_client'); // 'to_client' or 'to_astrologer'

    // Voice recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [isRecordingComplete, setIsRecordingComplete] = useState(false);
    const recordingTimerRef = useRef(null);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !chatId) return;

        try {
            setSending(true);

            if (messageType === 'to_client') {
                // Send message on behalf of astrologer to client
                await sendMessageOnBehalfOfAstrologer(chatId, messageText, otherUser.uid);
            } else {
                // Send message to astrologer
                await sendMessageToAstrologer(chatId, messageText, otherUser.uid);
            }

            setMessageText('');
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    // Voice recording functions
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
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);
            setIsRecordingComplete(false);
            setRecordedAudio(null);

            // Start timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);
        }
    };

    const deleteRecording = () => {
        if (recordedAudio?.url) {
            URL.revokeObjectURL(recordedAudio.url);
        }
        setRecordedAudio(null);
        setIsRecordingComplete(false);
        setRecordingTime(0);
    };

    const handleVoiceMessageSend = async () => {
        if (!recordedAudio?.blob) return;

        try {
            setSending(true);

            if (messageType === 'to_client') {
                // Send voice message on behalf of astrologer to client
                await sendVoiceMessage(chatId, otherUser.uid, recordedAudio.blob, recordingTime);
            } else {
                // Send voice message to astrologer
                await sendVoiceMessage(chatId, otherUser.uid, recordedAudio.blob, recordingTime);
            }

            setRecordingTime(0);
            setIsRecordingComplete(false);
            setRecordedAudio(null);
        } catch (error) {
            console.error('Error sending voice message:', error);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ChatBox for displaying messages */}
            <Box sx={{ flex: 1 }}>
                <ChatBox
                    chatId={chatId}
                    otherUser={otherUser}
                    chat={chat}
                    disableInput={true} // Disable the default input since we'll add our own
                />
            </Box>

            {/* Custom Support Message Input */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mr: 2 }}>
                        Message Type:
                    </Typography>
                    <ToggleButtonGroup
                        value={messageType}
                        exclusive
                        onChange={(e, newValue) => newValue && setMessageType(newValue)}
                        size="small"
                    >
                        <ToggleButton value="to_client">
                            To Client (as Astrologer)
                        </ToggleButton>
                        <ToggleButton value="to_astrologer">
                            To Astrologer
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {!isRecording && !isRecordingComplete && (
                    <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Record voice message">
                                <IconButton
                                    color="primary"
                                    onClick={startRecording}
                                    disabled={sending}
                                    size="large"
                                >
                                    <MicIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder={
                                messageType === 'to_client'
                                    ? "Type message to send on behalf of astrologer..."
                                    : "Type message to send to astrologer..."
                            }
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            disabled={sending}
                            multiline
                            maxRows={4}
                            sx={{ minHeight: '56px' }}
                        />
                        <IconButton
                            type="submit"
                            color="primary"
                            disabled={!messageText.trim() || sending}
                            size="large"
                        >
                            {sending ? <CircularProgress size={24} /> : <SendIcon />}
                        </IconButton>
                    </Box>
                )}

                {/* Recording UI */}
                {isRecording && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                                color="error"
                                onClick={stopRecording}
                                size="large"
                            >
                                <StopIcon />
                            </IconButton>
                            <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                                Recording... {formatTime(recordingTime)}
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* Recording preview UI */}
                {isRecordingComplete && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <IconButton
                                color="primary"
                                onClick={() => {
                                    // Play preview audio
                                    const audio = new Audio(recordedAudio?.url);
                                    audio.play();
                                }}
                                size="large"
                            >
                                <PlayArrowIcon />
                            </IconButton>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatTime(recordingTime)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                                color="error"
                                onClick={deleteRecording}
                                size="large"
                            >
                                <DeleteIcon />
                            </IconButton>
                            <IconButton
                                color="primary"
                                onClick={handleVoiceMessageSend}
                                disabled={sending}
                                size="large"
                            >
                                {sending ? <CircularProgress size={20} /> : <SendIcon />}
                            </IconButton>
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
} 