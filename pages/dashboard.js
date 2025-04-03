import React from 'react';
import { Box } from '@mui/material';
import Head from 'next/head';
import PersonalizedHero from '../src/components/personalizedHero';
import Services from '../src/components/services';
import Testimonials from '../src/components/testimonials';

export default function Dashboard() {
    return (
        <>
            <Head>
                <title>Valluvar Vaasal - Astrology Services</title>
                <meta name="description" content="Connect with expert astrologers for jathak predictions, marriage matching, and more." />
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