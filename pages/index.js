// pages/index.js
import React from 'react';
import Head from 'next/head';
import { Box } from '@mui/material';
import Navbar from '../src/components/navbar';
import Hero from '../src/components/hero';
import PersonalizedHero from '../src/components/personalizedHero';
import Services from '../src/components/services';
import Testimonials from '../src/components/testimonials';
import Footer from '../src/components/footer';
import { useAuth } from '../src/context/AuthContext';

export default function Home() {
  const { currentUser } = useAuth();
  
  return (
    <>
      <Head>
        <title>Valluvar Vaasal | Tamil Astrology & Spiritual Guidance</title>
        <meta name="description" content="Discover your cosmic path through ancient Tamil astrology and spiritual guidance. Get personalized readings that connect you with cosmic energies." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        <Navbar />
        
        {currentUser ? <PersonalizedHero /> : <Hero />}
        
        <Services />
        {/* <Testimonials /> */}
        <Footer />
      </Box>
    </>
  );
}
