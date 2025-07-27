import React from 'react';
import {
    Box,
    IconButton,
    useTheme,
    useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const GenericModal = ({ 
    open, 
    onClose, 
    title,
    subtitle,
    children,
    maxWidth = 'md',
    fullWidth = true,
    showCloseButton = true,
    inline = false // New prop to determine if it should be inline
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    // Calculate responsive dimensions
    const getResponsiveDimensions = () => {
        if (inline) {
            // For inline modals (within chat box)
            return {
                width: '100%',
                height: '100%',
                maxHeight: '100%'
            };
        }
        
        if (isMobile) {
            return {
                maxWidth: '95vw',
                maxHeight: '90vh',
                width: '100%',
                height: '100%'
            };
        } else if (isTablet) {
            return {
                maxWidth: '90vw',
                maxHeight: '85vh',
                width: '100%',
                height: '100%'
            };
        } else {
            return {
                maxWidth: '80vw',
                maxHeight: '80vh',
                width: '100%',
                height: '100%'
            };
        }
    };

    const responsive = getResponsiveDimensions();

    if (inline) {
        // Inline modal (within chat box)
        return (
            <Box
                sx={{
                    // position: 'absolute',
                    top: 8, // Account for parent padding (p: 2 = 16px, so top: 8)
                    left: 8,
                    right: 8,
                    bottom: 8,
                    bgcolor: 'background.paper',
                    zIndex: 1000,
                    display: open ? 'flex' : 'none',
                    flexDirection: 'column',
                    borderRadius: 1,
                    boxShadow: 3
                }}
            >
                {/* Header */}
                {title && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: isMobile ? 2 : 3,
                            pb: 1,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            bgcolor: 'background.paper',
                            flexShrink: 0
                        }}
                    >
                        <Box sx={{ flex: 1 }}>
                            <Box
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: 600,
                                    fontSize: isMobile ? '1.1rem' : '1.25rem'
                                }}
                            >
                                {title}
                            </Box>
                            {subtitle && (
                                <Box
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: isMobile ? '0.8rem' : '0.875rem',
                                        mt: 0.5
                                    }}
                                >
                                    {subtitle}
                                </Box>
                            )}
                        </Box>
                        {showCloseButton && (
                            <IconButton
                                onClick={onClose}
                                sx={{
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        bgcolor: theme.palette.action.hover
                                    }
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        )}
                    </Box>
                )}

                {/* Content */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}
                >
                    {children}
                </Box>
            </Box>
        );
    }

    // Full-screen modal (original behavior)
    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2,
                visibility: open ? 'visible' : 'hidden',
                opacity: open ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out'
            }}
            onClick={onClose}
        >
            <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                    bgcolor: 'background.paper',
                    borderRadius: isMobile ? 0 : 2,
                    ...responsive,
                    // overflow: 'hidden'
                }}
            >
                {/* Header */}
                {title && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: isMobile ? 2 : 3,
                            pb: 1,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            bgcolor: 'background.paper'
                        }}
                    >
                        <Box sx={{ flex: 1 }}>
                            <Box
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: 600,
                                    fontSize: isMobile ? '1.1rem' : '1.25rem'
                                }}
                            >
                                {title}
                            </Box>
                            {subtitle && (
                                <Box
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: isMobile ? '0.8rem' : '0.875rem',
                                        mt: 0.5
                                    }}
                                >
                                    {subtitle}
                                </Box>
                            )}
                        </Box>
                        {showCloseButton && (
                            <IconButton
                                onClick={onClose}
                                sx={{
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        bgcolor: theme.palette.action.hover
                                    }
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        )}
                    </Box>
                )}

                {/* Content */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        // overflow: 'hidden'
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default GenericModal; 