import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Rating,
    TextField,
    Divider,
    Alert,
    useTheme,
    useMediaQuery
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import SupportIcon from '@mui/icons-material/Support';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from 'react-i18next';

const FeedbackPrompt = ({ onSubmit, onSkip, onContactAdmin, submittedFeedback = null }) => {
    const { t } = useTranslation('common');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // If feedback has been submitted, show the submitted feedback instead of the form
    if (submittedFeedback) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    width: '100%',
                    p: 2
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        justifyContent: 'space-between'
                    }}
                >
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            {t('feedback.thankYou')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('feedback.expiredMessage')}
                        </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                            {t('feedback.yourRating')}
                        </Typography>
                        <Rating
                            value={submittedFeedback.rating}
                            readOnly
                            size="large"
                            sx={{
                                '& .MuiRating-iconFilled': {
                                    color: theme.palette.primary.main
                                }
                            }}
                        />
                    </Box>

                    {submittedFeedback.comment && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                                {t('feedback.yourComment')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                "{submittedFeedback.comment}"
                            </Typography>
                        </Box>
                    )}

                    <Divider />

                    <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {t('feedback.helpTitle')}
                        </Typography>
                        <Button
                            variant="text"
                            onClick={onContactAdmin}
                            startIcon={<SupportIcon />}
                            color="primary"
                        >
                            {t('feedback.contactAdminButton')}
                        </Button>
                    </Box>
                </Box>
            </Box>
        );
    }

    const handleSubmit = async () => {
        if (rating === 0) {
            return; // Require at least 1 star
        }

        setSubmitting(true);
        try {
            await onSubmit({
                rating,
                comment: comment.trim()
            });
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = () => {
        onSkip();
    };

    const handleContactAdmin = () => {
        onContactAdmin();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                width: '100%',
                p: 2
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    justifyContent: 'space-between'
                }}
            >
                {/* Rating Section */}
                <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                        {t('feedback.ratingLabel')}
                    </Typography>
                    <Rating
                        value={rating}
                        onChange={(event, newValue) => setRating(newValue)}
                        size="large"
                        sx={{
                            '& .MuiRating-iconFilled': {
                                color: theme.palette.primary.main
                            },
                            '& .MuiRating-iconHover': {
                                color: theme.palette.primary.light
                            }
                        }}
                    />
                </Box>
                {rating === 0 && (
                    <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
                        {t('feedback.ratingRequired')}
                    </Alert>
                )}

                {/* Comment Section */}
                <Box>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder={t('feedback.commentPlaceholder')}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        variant="outlined"
                        size="small"
                    />
                </Box>

                {/* Desktop Layout: Help section on right, buttons below */}
                {!isMobile ? (
                    <>
                        {/* Help Section - Right side */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                            gap: 1
                        }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('feedback.helpTitle')}
                            </Typography>
                            <Button
                                variant="text"
                                onClick={handleContactAdmin}
                                startIcon={<SupportIcon />}
                                color="primary"
                                size="small"
                            >
                                {t('feedback.contactAdminButton')}
                            </Button>
                        </Box>

                        {/* Action Buttons - Below */}
                        <Box sx={{
                            display: 'flex',
                            gap: 2,
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <Button
                                variant="outlined"
                                onClick={handleSkip}
                                disabled={submitting}
                                size="medium"
                                sx={{ minWidth: 100 }}
                            >
                                {t('feedback.skipButton')}
                            </Button>

                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={rating === 0 || submitting}
                                startIcon={<SendIcon />}
                                size="medium"
                                sx={{ minWidth: 100 }}
                            >
                                {submitting ? t('feedback.submittingButton') : t('feedback.submitButton')}
                            </Button>
                        </Box>
                    </>
                ) : (
                    /* Mobile Layout: Help section before buttons */
                    <>
                        {/* Help Section - Before buttons */}
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {t('feedback.helpTitle')}
                            </Typography>
                            <Button
                                variant="text"
                                onClick={handleContactAdmin}
                                startIcon={<SupportIcon />}
                                color="primary"
                                size="small"
                            >
                                {t('feedback.contactAdminButton')}
                            </Button>
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{
                            display: 'flex',
                            gap: 2,
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <Button
                                variant="outlined"
                                onClick={handleSkip}
                                disabled={submitting}
                                size="medium"
                                sx={{ minWidth: 100 }}
                            >
                                {t('feedback.skipButton')}
                            </Button>

                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={rating === 0 || submitting}
                                startIcon={<SendIcon />}
                                size="medium"
                                sx={{ minWidth: 100 }}
                            >
                                {submitting ? t('feedback.submittingButton') : t('feedback.submitButton')}
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default FeedbackPrompt; 