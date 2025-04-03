import React from 'react';
import { Box } from '@mui/material';
import Head from 'next/head';
import Navbar from './navbar';
import Hero from './hero';
import Services from './services';
import Testimonials from './testimonials';
import Footer from './footer';

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
        <Navbar />
        <Hero />
        <Services />
        <Testimonials />
        <Footer />
      </Box>
    </>
  );
} 