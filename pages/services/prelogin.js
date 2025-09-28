import React, { useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

const SERVICE_LABELS = {
  marriageMatching: 'Marriage Matching',
  jathakPrediction: 'Jathak Prediction',
  jathakWriting: 'Jathak Writing'
};

export default function ServicePrelogin() {
  const router = useRouter();
  const { service, redirect } = router.query;

  const serviceLabel = useMemo(() => {
    if (!service) return 'Our Services';
    return SERVICE_LABELS[service] || 'Our Services';
  }, [service]);

  const loginHref = useMemo(() => {
    const target = typeof redirect === 'string' && redirect.length > 0
      ? redirect
      : `/${service === 'marriageMatching' ? 'services/marriage-matching' : service === 'jathakPrediction' ? 'services/jathak-prediction' : service === 'jathakWriting' ? 'services/jathak-writing' : ''}`;
    const encoded = encodeURIComponent(target);
    return `/login?redirect=${encoded}`;
  }, [redirect, service]);

  return (
    <>
      <Head>
        <title>{serviceLabel} — Please Login | Valluvar Vaasal</title>
        <meta name="description" content="Login to continue and get instant predictions from our experts." />
      </Head>
      <Box sx={{ py: { xs: 4, md: 6 }, backgroundColor: 'background.default' }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: '16px', background: 'rgba(255,255,255,0.95)' }}>
            <Typography variant="h4" component="h1" align="center" sx={{ mb: 2 }}>
              {serviceLabel}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Please login to continue
            </Typography>

            <List>
              <ListItem>
                <ListItemText primary="How to login:" secondary="Phone number + OTP method available, Email login available" />
              </ListItem>
              <ListItem>
                <ListItemText primary="We do instant predictions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="You can talk directly with our astrology experts" />
              </ListItem>
              <ListItem>
                <ListItemText primary="We are here to serve you" />
              </ListItem>
              <ListItem>
                <ListItemText primary="If not satisfied, the cash will be refunded" />
              </ListItem>
            </List>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Link href={loginHref} legacyBehavior>
                <Button variant="contained" color="primary" size="large">
                  Login
                </Button>
              </Link>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
}


