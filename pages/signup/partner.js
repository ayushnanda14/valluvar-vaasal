import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import { validatePartnerSignupLink, markSignupLinkAsUsed } from '../../src/services/adminService';
import { Box, Container, Paper, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { db } from '../../src/firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function PartnerSignup() {
  const router = useRouter();
  const { token } = router.query;
  const { signupWithEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkData, setLinkData] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const data = await validatePartnerSignupLink(token);
        setLinkData(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName || !email || !password || password !== confirmPassword) {
      setError('Please complete the form and ensure passwords match');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const user = await signupWithEmail(email, password, displayName, ['partner']);
      // partner profile
      await setDoc(doc(db, 'partnerProfiles', user.uid), {
        partnerId: user.uid,
        displayName,
        commissionMode: linkData.commissionMode,
        percent: linkData.percent,
        fixedAmount: linkData.fixedAmount,
        referralCode: user.uid.slice(0, 8).toUpperCase(),
        referralLink: `/?ref=${user.uid.slice(0, 8).toUpperCase()}`,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await markSignupLinkAsUsed(token);
      router.push('/partner/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
  if (error) return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => router.push('/login')}>Go to Login</Button>
      </Paper>
    </Container>
  );

  return (
    <>
      <Head>
        <title>Partner Signup | Valluvar Vaasal</title>
      </Head>
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Create Partner Account</Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField label="Full Name" fullWidth size="small" sx={{ mb: 1.5 }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <TextField label="Email" fullWidth size="small" sx={{ mb: 1.5 }} value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth size="small" sx={{ mb: 1.5 }} value={password} onChange={(e) => setPassword(e.target.value)} />
            <TextField label="Confirm Password" type="password" fullWidth size="small" sx={{ mb: 2 }} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button type="submit" variant="contained" fullWidth>Create Account</Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
}


