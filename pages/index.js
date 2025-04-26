// pages/index.js
import React, { useEffect } from 'react';
import Head from 'next/head';
import { Box } from '@mui/material';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'next/router';
import HomePage from '../src/components/HomePage';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const router = useRouter();
  const { currentUser, hasRole } = useAuth();
  const { t } = useTranslation('common');

  useEffect(() => {
    const redirectToDashboard = async () => {
      if (currentUser) {
        try {
          // Check user roles and redirect accordingly
          const isAdmin = await hasRole('admin');
          const isAstrologer = await hasRole('astrologer');

          console.log("ROLES::", currentUser, isAdmin, isAstrologer);
          if (isAdmin) {
            router.push('/admin/dashboard');
          } else if (isAstrologer) {
            router.push('/astrologer/dashboard');
          } else {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error checking roles:', error);
          router.push('/dashboard');
        }
      }
    };

    redirectToDashboard();
  }, [currentUser, hasRole, router]);

  // If user is logged in, we'll redirect them, so don't render the home page
  if (currentUser) {
    return null;
  }

  // Otherwise, render the regular home page for non-logged-in users
  return (
    <>
      <Head>
        <title>{t('brand')} | {t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <HomePage />
      </Box>
    </>
  );
}
