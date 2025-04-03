import React from 'react';
import { Box } from '@mui/material';
import Head from 'next/head';
import Hero from './hero';
import Services from './services';
import Testimonials from './testimonials';

export default function HomePage() {
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
        <Hero />
        <Services />
        <Testimonials />
      </Box>
    </>
  );
} 