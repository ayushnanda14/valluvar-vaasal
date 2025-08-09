import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Rating,
    Paper,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    useTheme
} from '@mui/material';
import Head from 'next/head';
import Testimonials from '../src/components/testimonials';
import { useAuth } from '../src/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../src/firebase/firebaseConfig';
import { useTranslation } from 'react-i18next';

export default function TestimonialsPage() {
    const theme = useTheme();
    const { currentUser } = useAuth();
    const { t } = useTranslation('common');

    const [testimonialText, setTestimonialText] = useState('');
    const [name, setName] = useState('');
    const [service, setService] = useState('');
    const [rating, setRating] = useState(5);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // List of available services
    const services = [
        'Marriage Matching',
        'Jathak Prediction',
        'Jathak Writing',
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        // Validate required fields
        if (!testimonialText.trim()) {
            setError(t('testimonials.validation.testimonialRequired'));
            setSubmitting(false);
            return;
        }

        if (!service) {
            setError(t('testimonials.validation.serviceRequired'));
            setSubmitting(false);
            return;
        }

        if (!isAnonymous && !name.trim()) {
            setError(t('testimonials.validation.nameRequired'));
            setSubmitting(false);
            return;
        }

        try {
            const submitFn = httpsCallable(functions, 'submitTestimonial');
            const testimonialData = {
                text: testimonialText.trim(),
                name: name || currentUser?.displayName || '',
                service,
                rating,
                isAnonymous
            };

            await submitFn(testimonialData);
            setSuccess(true);
            setTestimonialText('');
            setName('');
            setService('');
            setRating(5);
            setIsAnonymous(false);
            
            // Show additional message about approval
            setTimeout(() => {
                setSuccess(false);
            }, 3000);
        } catch (err) {
            console.error('Error submitting testimonial:', err);
            setError(t('testimonials.submitError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Head>
                <title>{t('brand')} - {t('testimonials.title')}</title>
                <meta name="description" content={t('testimonials.description')} />
            </Head>

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh'
            }}>
                <Box
                    sx={{
                        pt: { xs: 4, md: 6 },
                        pb: { xs: 2, md: 3 },
                        background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
                    }}
                >
                    <Container maxWidth="lg">
                        <Typography
                            variant="h1"
                            component="h1"
                            sx={{
                                fontFamily: '"Playfair Display", serif',
                                fontWeight: 600,
                                fontSize: { xs: '2rem', md: '2.8rem' },
                                mb: 2,
                                color: theme.palette.secondary.dark,
                                textAlign: 'center'
                            }}
                        >
                            {t('testimonials.heading')}
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                fontFamily: '"Cormorant Garamond", serif',
                                fontSize: { xs: '1.1rem', md: '1.25rem' },
                                mb: 4,
                                color: theme.palette.secondary.main,
                                textAlign: 'center',
                                maxWidth: '800px',
                                mx: 'auto'
                            }}
                        >
                            The cosmic journey is unique for each soul. Discover how our guidance has
                            illuminated paths for others, and share your own experience.
                        </Typography>
                    </Container>
                </Box>

                {/* Testimonials Component */}
                <Testimonials isTestimonialsPage={true} />

                {/* Submit Testimonial Section */}
                <Box
                    sx={{
                        py: { xs: 6, md: 8 },
                        background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,248,225,0.3) 100%)'
                    }}
                >
                    <Container maxWidth="md">
                        <Typography
                            variant="h2"
                            component="h2"
                            sx={{
                                fontFamily: '"Playfair Display", serif',
                                fontWeight: 600,
                                fontSize: { xs: '1.8rem', md: '2.2rem' },
                                mb: 3,
                                color: theme.palette.secondary.dark,
                                textAlign: 'center'
                            }}
                        >
                            {t('testimonials.shareExperience')}
                        </Typography>

                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, md: 4 },
                                borderRadius: 2,
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <form onSubmit={handleSubmit}>
                                <TextField
                                    label={t('testimonials.testimonial')}
                                    variant="outlined"
                                    fullWidth
                                    multiline
                                    rows={4}
                                    value={testimonialText}
                                    onChange={(e) => setTestimonialText(e.target.value)}
                                    sx={{ mb: 3 }}
                                    InputProps={{
                                        sx: { fontFamily: '"Cormorant Garamond", serif' }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontFamily: '"Cormorant Garamond", serif' }
                                    }}
                                    required
                                />

                                {!isAnonymous && (
                                <TextField
                                    label={t('testimonials.name')}
                                    variant="outlined"
                                    fullWidth
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    sx={{ mb: 3 }}
                                    InputProps={{
                                        sx: { fontFamily: '"Cormorant Garamond", serif' }
                                    }}
                                    InputLabelProps={{
                                        sx: { fontFamily: '"Cormorant Garamond", serif' }
                                    }}
                                    required
                                />
                                )}

                                <FormControl
                                    fullWidth
                                    variant="outlined"
                                    sx={{ mb: 3 }}
                                    required
                                >
                                    <InputLabel
                                        id="service-select-label"
                                        sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                    >
                                        {t('testimonials.service')}
                                    </InputLabel>
                                    <Select
                                        labelId="service-select-label"
                                        id="service-select"
                                        value={service}
                                        onChange={(e) => setService(e.target.value)}
                                        label={t('testimonials.service')}
                                        sx={{
                                            fontFamily: '"Cormorant Garamond", serif',
                                            '& .MuiSelect-select': {
                                                fontFamily: '"Cormorant Garamond", serif'
                                            }
                                        }}
                                    >
                                        {services.map((serviceName) => (
                                            <MenuItem
                                                key={serviceName}
                                                value={serviceName}
                                                sx={{ fontFamily: '"Cormorant Garamond", serif' }}
                                            >
                                                {serviceName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box sx={{ mb: 3 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontFamily: '"Cormorant Garamond", serif',
                                            mb: 1
                                        }}
                                    >
                                        {t('testimonials.rating')}
                                    </Typography>
                                    <Rating
                                        value={rating}
                                        onChange={(e, newValue) => setRating(newValue)}
                                        precision={0.5}
                                        size="large"
                                    />
                                </Box>

                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isAnonymous}
                                            onChange={(e) => setIsAnonymous(e.target.checked)}
                                            color="secondary"
                                        />
                                    }
                                    label={
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: '"Cormorant Garamond", serif',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            {t('testimonials.anonymous')}
                                        </Typography>
                                    }
                                    sx={{ mb: 3 }}
                                />

                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontFamily: '"Cormorant Garamond", serif',
                                        color: theme.palette.text.secondary,
                                        mb: 3,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {t('testimonials.review')}
                                </Typography>

                                {error && (
                                    <Alert severity="error" sx={{ mb: 3 }}>
                                        {error}
                                    </Alert>
                                )}

                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    disabled={submitting}
                                    sx={{
                                        fontFamily: '"Cinzel", serif',
                                        py: 1.5,
                                        px: 4,
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        color: '#FFF8E1',
                                    }}
                                >
                                    {submitting ? t('testimonials.submitting') : t('testimonials.submit')}
                                </Button>
                            </form>
                        </Paper>
                    </Container>
                </Box>
            </Box>

            <Snackbar
                open={success}
                autoHideDuration={6000}
                onClose={() => setSuccess(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSuccess(false)}
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    {t('testimonials.thankYou')}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setError('')}
                    severity="error"
                    sx={{ width: '100%' }}
                >
                    {error}
                </Alert>
            </Snackbar>
        </>
    );
} 