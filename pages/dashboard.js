import React from 'react';
import { Box } from '@mui/material';
import Head from 'next/head';
import PersonalizedHero from '../src/components/personalizedHero';
import Services from '../src/components/services';
import Testimonials from '../src/components/testimonials';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
    const { t } = useTranslation('common');

    return (
        <>
            <Head>
                <title>{t('brand')} - {t('dashboard.title')}</title>
                <meta name="description" content={t('dashboard.description')} />
            </Head>

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh'
            }}>
                <PersonalizedHero />
                <Services />
                <Testimonials />
            </Box>
        </>
    );
} 