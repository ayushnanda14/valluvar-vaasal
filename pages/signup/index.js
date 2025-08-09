import React, { useState, useRef } from 'react';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    Link as MuiLink,
    CircularProgress,
    useTheme,
    Tabs,
    Tab,
    InputAdornment,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { useTranslation } from 'react-i18next';

export default function Signup() {
    const theme = useTheme();
    const router = useRouter();
    const { signupWithEmail, sendVerificationCode, verifyCodeAndSignUp } = useAuth();
    const { t } = useTranslation('common');

    const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'phone'

    // Email signup state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Phone signup state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [phoneStep, setPhoneStep] = useState(0); // 0: enter phone, 1: enter code

    // Common state
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Ref for reCAPTCHA container
    const recaptchaContainerRef = useRef(null);

    const handleAuthMethodChange = (event, newValue) => {
        setAuthMethod(newValue);
        setError('');
    };

    const handleEmailSignup = async (e) => {
        e.preventDefault();

        // Validation
        if (!email || !password || !confirmPassword || !displayName) {
            setError(t('signup.errors.fillAll'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('signup.errors.passwordMismatch'));
            return;
        }

        try {
            setError('');
            setLoading(true);

            // Client signup
            await signupWithEmail(email, password, displayName, ['client']);
            router.push('/dashboard');
        } catch (err) {
            console.log('[pages/signup.js] Entered catch block for handleEmailSignup');
            console.error('[pages/signup.js] Raw signup error object:', err);

            let errorMessage = t('signup.errors.createFailed');

            if (err && err.code === 'auth/email-already-in-use') {
                errorMessage = t('signup.errors.emailInUse');
            } else if (err && err.code === 'auth/weak-password') {
                errorMessage = t('signup.errors.weakPassword');
            } else if (err && typeof err.message === 'string') {
                errorMessage = t('signup.errors.createFailed');
            }

            console.log(`[pages/signup.js] Setting error state to: "${errorMessage}"`);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const validateIndianPhoneNumber = (phone) => {
        // Remove any non-digit characters
        const digitsOnly = phone.replace(/\D/g, '');

        // Check if it's a valid Indian phone number (10 digits, optionally with +91 prefix)
        if (digitsOnly.length === 10) {
            return true;
        } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
            return true;
        } else if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
            return true;
        }

        return false;
    };

    const formatIndianPhoneNumber = (phone) => {
        // Remove any non-digit characters
        const digitsOnly = phone.replace(/\D/g, '');

        // If it's just 10 digits, add the +91 prefix
        if (digitsOnly.length === 10) {
            return `+91${digitsOnly}`;
        }

        // If it already has 91 prefix but no +, add it
        if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
            return `+${digitsOnly}`;
        }

        // If it has 091 prefix, convert to +91
        if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
            return `+91${digitsOnly.substring(3)}`;
        }

        // Otherwise, just add + if it's missing
        return phone.startsWith('+') ? phone : `+${phone}`;
    };

    const handleSendVerificationCode = async (e) => {
        e.preventDefault();

        if (!phoneNumber) {
            setError(t('signup.errors.phoneRequired'));
            return;
        }

        // Validate Indian phone number
        if (!validateIndianPhoneNumber(phoneNumber)) {
            setError(t('signup.errors.invalidIndianNumber'));
            return;
        }

        try {
            setError('');
            setLoading(true);

            // Format to E.164 format with Indian country code
            const formattedPhoneNumber = formatIndianPhoneNumber(phoneNumber);

            // Explicitly pass the correct ID for this page
            const result = await sendVerificationCode(formattedPhoneNumber, 'recaptcha-container');
            setConfirmationResult(result);
            setPhoneStep(1);
        } catch (err) {
            console.error('Phone verification error:', err);

            // Display user-friendly error message
            setError(err.message || t('signup.errors.sendCodeFailed'));

            // If it's the "not enabled" error, show additional guidance
            if (err.message && err.message.includes('not enabled')) {
                setError(`${err.message} 
                            Note for developers: You need to enable Phone Authentication in the Firebase Console:
                            1. Go to Firebase Console > Authentication > Sign-in method
                            2. Enable "Phone" provider
                            3. Add your app's domain to the authorized domains`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();

        if (!verificationCode || !displayName) {
            setError(t('signup.errors.fillAll'));
            return;
        }

        try {
            setError('');
            setLoading(true);

            await verifyCodeAndSignUp(confirmationResult, verificationCode, displayName, ['client']);
            router.push('/dashboard');
        } catch (err) {
            console.error('Code verification error:', err);
            setError(t('signup.errors.verifyCodeFailed', { message: err.message }));
        } finally {
            setLoading(false);
        }
    };

    const handleAstrologerRedirect = () => {
        router.push('/signup/astrologer');
    };

    const handleRefresh = () => {
        // Reset state
        setError('');
        setPhoneStep(0);
        setConfirmationResult(null);

        // Reload the page to get fresh Firebase configuration
        window.location.reload();
    };

    return (
        <>
            <Head>
                <title>{t('signup.title')} | {t('brand')}</title>
                <meta name="description" content={t('signup.description')} />
            </Head>

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh'
            }}>
                <Box
                    sx={{
                        flexGrow: 1,
                        py: { xs: 4, md: 8 },
                        background: 'linear-gradient(135deg, rgba(255,248,225,0.6) 0%, rgba(255,236,179,0.3) 100%)'
                    }}
                >
                    <Container maxWidth="sm">
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, md: 4 },
                                borderRadius: 2,
                                boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)'
                            }}
                        >
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{
                                    fontFamily: '"Playfair Display", serif',
                                    fontWeight: 600,
                                    mb: 3,
                                    color: theme.palette.secondary.dark,
                                    textAlign: 'center'
                                }}
                            >
                                {t('signup.heading')}
                            </Typography>

                            {error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        mb: 3,
                                        whiteSpace: 'pre-line' // This will preserve line breaks in the error message
                                    }}
                                    action={
                                        error.includes('Invalid app credential') || error.includes('billing') ? (
                                            <Button color="inherit" size="small" onClick={handleRefresh}>
                                                Refresh
                                            </Button>
                                        ) : null
                                    }
                                >
                                    {error}
                                </Alert>
                            )}

                            <Tabs
                                value={authMethod}
                                onChange={handleAuthMethodChange}
                                variant="fullWidth"
                                sx={{ mb: 3 }}
                            >
                                <Tab
                                    icon={<EmailIcon />}
                                    label={t('signup.tabEmail')}
                                    value="email"
                                    sx={{
                                        fontFamily: '"Cormorant Garamond", serif',
                                        fontSize: '1rem'
                                    }}
                                />
                                <Tab
                                    icon={<PhoneIcon />}
                                    label={t('signup.tabPhone')}
                                    value="phone"
                                    sx={{
                                        fontFamily: '"Cormorant Garamond", serif',
                                        fontSize: '1rem'
                                    }}
                                />
                            </Tabs>

                            {authMethod === 'email' ? (
                                <form onSubmit={handleEmailSignup} autoComplete="off">
                                    {/* Hidden fields to prevent autofill */}
                                    <input type="text" style={{ display: 'none' }} />
                                    <input type="password" style={{ display: 'none' }} />

                                    <TextField
                                        label={t('signup.fullName')}
                                        variant="outlined"
                                        fullWidth
                                        margin="normal"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        required
                                        autoComplete="new-name"
                                        inputProps={{ autoComplete: 'new-name' }}
                                    />

                                    <TextField
                                        label={t('signup.emailAddress')}
                                        variant="outlined"
                                        fullWidth
                                        margin="normal"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="new-email"
                                        inputProps={{ autoComplete: 'new-email' }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <TextField
                                        label={t('signup.password')}
                                        variant="outlined"
                                        fullWidth
                                        margin="normal"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        inputProps={{ autoComplete: 'new-password' }}
                                    />

                                    <TextField
                                        label={t('signup.confirmPassword')}
                                        variant="outlined"
                                        fullWidth
                                        margin="normal"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        inputProps={{ autoComplete: 'new-password' }}
                                    />

                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        disabled={loading}
                                        sx={{
                                            mt: 3,
                                            mb: 2,
                                            py: 1.5,
                                            fontFamily: '"Cormorant Garamond", serif',
                                            fontSize: '1.1rem'
                                        }}
                                    >
                                        {loading ? <CircularProgress size={24} /> : t('signup.createAccount')}
                                    </Button>
                                </form>
                            ) : (
                                <>
                                    <Stepper activeStep={phoneStep} sx={{ mb: 3 }}>
                                        <Step>
                                                <StepLabel>{t('signup.steps.phone')}</StepLabel>
                                        </Step>
                                        <Step>
                                                <StepLabel>{t('signup.steps.verification')}</StepLabel>
                                        </Step>
                                    </Stepper>

                                    {phoneStep === 0 ? (
                                        <form onSubmit={handleSendVerificationCode} autoComplete="off">
                                            <TextField
                                                label={t('signup.phoneLabel')}
                                                fullWidth
                                                margin="normal"
                                                variant="outlined"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                required
                                                placeholder={t('signup.phonePlaceholder')}
                                                helperText={t('signup.phoneHelper')}
                                                autoComplete="off"
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <PhoneIcon color="action" />
                                                            <Typography variant="body2" sx={{ ml: 0.5 }}>+91</Typography>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />

                                            {/* Invisible reCAPTCHA container */}
                                            <div id="recaptcha-container" ref={recaptchaContainerRef}></div>

                                            <Button
                                                type="submit"
                                                fullWidth
                                                variant="contained"
                                                color="primary"
                                                size="large"
                                                disabled={loading}
                                                sx={{
                                                    mt: 3,
                                                    mb: 2,
                                                    py: 1.5,
                                                    fontFamily: '"Cormorant Garamond", serif',
                                                    fontSize: '1.1rem'
                                                }}
                                            >
                                                {loading ? <CircularProgress size={24} /> : t('signup.sendVerification')}
                                            </Button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleVerifyCode} autoComplete="off">
                                            <TextField
                                                label={t('signup.fullName')}
                                                variant="outlined"
                                                fullWidth
                                                margin="normal"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                required
                                                autoComplete="new-name"
                                                inputProps={{ autoComplete: 'new-name' }}
                                            />

                                            <TextField
                                                label={t('signup.verificationCode')}
                                                variant="outlined"
                                                fullWidth
                                                margin="normal"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value)}
                                                required
                                                autoComplete="off"
                                            />

                                            <Button
                                                type="submit"
                                                fullWidth
                                                variant="contained"
                                                color="primary"
                                                size="large"
                                                disabled={loading}
                                                sx={{
                                                    mt: 3,
                                                    mb: 2,
                                                    py: 1.5,
                                                    fontFamily: '"Cormorant Garamond", serif',
                                                    fontSize: '1.1rem'
                                                }}
                                            >
                                                {loading ? <CircularProgress size={24} /> : t('signup.verifyAndCreate')}
                                            </Button>

                                            <Button
                                                fullWidth
                                                variant="text"
                                                color="secondary"
                                                onClick={() => setPhoneStep(0)}
                                                sx={{ mb: 2 }}
                                            >
                                                {t('signup.backToPhone')}
                                            </Button>
                                        </form>
                                    )}
                                </>
                            )}

                            <Box sx={{ textAlign: 'center', mt: 2, mb: 3 }}>
                                <MuiLink
                                    href="/login"
                                    sx={{
                                        color: theme.palette.primary.main,
                                        textDecoration: 'none',
                                        '&:hover': {
                                            textDecoration: 'underline'
                                        }
                                    }}
                                >
                                    {t('signup.alreadyHave')}
                                </MuiLink>
                            </Box>

                            <Box sx={{
                                p: 2,
                                bgcolor: 'rgba(255, 236, 179, 0.2)',
                                borderRadius: 1,
                                border: '1px solid rgba(255, 236, 179, 0.5)'
                            }}>
                                <Typography
                                    variant="h6"
                                    component="h2"
                                    sx={{
                                        fontFamily: '"Cormorant Garamond", serif',
                                        fontWeight: 600,
                                        mb: 1,
                                        textAlign: 'center'
                                    }}
                                >
                                    {t('signup.astrologerCtaTitle')}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ mb: 2, textAlign: 'center' }}
                                >
                                    {t('signup.astrologerCtaText')}
                                </Typography>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleAstrologerRedirect}
                                    sx={{
                                        fontFamily: '"Cormorant Garamond", serif',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {t('signup.astrologerCtaButton')}
                                </Button>
                            </Box>
                        </Paper>
                    </Container>
                </Box>
            </Box>
        </>
    );
} 