// pages/_app.js
import * as React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '../src/createEmotionCache';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../src/theme';
import { AuthProvider } from '../src/context/AuthContext';
import { useEffect } from 'react';
import { useAppCheck } from '../src/hooks/useAppCheck';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

const clientSideEmotionCache = createEmotionCache();

export default function MyApp(props) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  // Initialize App Check
  const { isAppCheckInitialized, error } = useAppCheck();

  // Log any App Check initialization errors
  useEffect(() => {
    if (error) {
      console.error('App Check initialization error:', error);
    }
  }, [error]);

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>Next.js + Firebase + MUI Boilerplate</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Navbar />
          <Component {...pageProps} />
          <Footer />
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
