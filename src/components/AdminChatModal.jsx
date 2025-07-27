import React from 'react';
import {
    Box,
    Avatar,
    Typography,
    useTheme,
    useMediaQuery
} from '@mui/material';
import SupportIcon from '@mui/icons-material/Support';
import { useTranslation } from 'react-i18next';
import ChatBox from './ChatBox';
import GenericModal from './GenericModal';

const AdminChatModal = ({ 
    open, 
    onClose, 
    chatId, 
    clientId, 
    adminId, 
    mode = 'admin-chat', // 'admin-chat' or 'feedback'
    title,
    subtitle
}) => {
    const { t } = useTranslation('common');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Mock admin user for the chat
    const adminUser = {
        displayName: t('chat.admin'),
        photoURL: null,
        uid: adminId || 'admin'
    };

    return (
        <GenericModal
            open={open}
            onClose={onClose}
            title={title || t('chat.adminSupport')}
            subtitle={subtitle}
            maxWidth={false}
            fullWidth={true}
        >
            {chatId ? (
                <ChatBox
                    chatId={chatId}
                    otherUser={adminUser}
                    isAdminChat={true}
                />
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        p: 3
                    }}
                >
                    <SupportIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2, opacity: 0.6 }} />
                    <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
                        {t('chat.connectingToAdmin')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        {t('chat.adminWillRespond')}
                    </Typography>
                </Box>
            )}
        </GenericModal>
    );
};

export default AdminChatModal; 