// pages/_app.js
import * as React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '../src/createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import theme from '../src/theme';
import { AuthProvider } from '../src/context/AuthContext';
import { useEffect, useState } from 'react';
import { useAppCheck } from '../src/hooks/useAppCheck';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import '../src/i18n';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '../src/i18n'; // Import the configured i18n instance
import { useRouter } from 'next/router';

// Safe polyfill for crypto.randomUUID()
if (typeof window !== 'undefined') {
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  if (!window.crypto?.randomUUID) {
    try {
      // Try to create a new crypto object if it doesn't exist
      if (!window.crypto) {
        window.crypto = {};
      }
      // Use Object.defineProperty to safely add the method
      Object.defineProperty(window.crypto, 'randomUUID', {
        value: generateUUID,
        writable: false,
        configurable: false,
        enumerable: false
      });
    } catch (e) {
      // If we can't modify crypto, create a global function instead
      window.randomUUID = generateUUID;
    }
  }
}

const clientSideEmotionCache = createEmotionCache();

function MyApp(props) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  // Initialize App Check
  const { isAppCheckInitialized, error } = useAppCheck();
  const router = useRouter();
  const [routeLoading, setRouteLoading] = useState(false);

  // Log any App Check initialization errors
  useEffect(() => {
    if (error) {
      console.error('App Check initialization error:', error);
    }
  }, [error]);

  // Initialize language from localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('i18nextLng');
      if (savedLanguage && ['en', 'ta'].includes(savedLanguage)) {
        // Small delay to ensure hydration is complete
        setTimeout(() => {
          i18nInstance.changeLanguage(savedLanguage);
        }, 100);
      }
    }
  }, []);

  // Show a skeleton during Next.js route transitions
  useEffect(() => {
    const handleStart = () => setRouteLoading(true);
    const handleEnd = () => setRouteLoading(false);
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleEnd);
    router.events.on('routeChangeError', handleEnd);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleEnd);
      router.events.off('routeChangeError', handleEnd);
    };
  }, [router.events]);

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>Next.js + Firebase + MUI Boilerplate</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <script
          src="https://checkout.razorpay.com/v1/checkout.js"
          async
        />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <I18nextProvider i18n={i18nInstance}>
            <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
              <Navbar />
              <Box component="main" sx={{ flexGrow: 1 }}>
                {(routeLoading || !Component) ? (
                  <Box sx={{ px: 2, py: 4 }}>
                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mb: 2 }} />
                    <Skeleton variant="text" height={40} width="60%" sx={{ mb: 1 }} />
                    <Skeleton variant="text" height={30} width="40%" sx={{ mb: 1 }} />
                    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
                  </Box>
                ) : (
                  <Component {...pageProps} />
                )}
              </Box>
              <Footer />
            </Box>
          </I18nextProvider>
        </AuthProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  emotionCache: PropTypes.object,
  pageProps: PropTypes.object.isRequired,
};

export default MyApp;
