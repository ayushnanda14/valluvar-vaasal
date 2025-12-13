import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Slide from '@mui/material/Slide';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Lightweight PWA install prompt for Android Chrome using beforeinstallprompt
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  if (!visible) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setVisible(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // eslint-disable-next-line no-console
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => setVisible(false);

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Paper elevation={6} sx={{ position: 'fixed', left: 16, right: 16, bottom: 16, p: 2, zIndex: 1400 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>Install Valluvar Vaasal</Typography>
            <Typography variant="body2" color="text.secondary">Add to Home Screen for a faster app-like experience.</Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button onClick={handleDismiss} color="inherit">Not now</Button>
            <Button onClick={handleInstallClick} variant="contained">Install</Button>
          </Box>
        </Box>
      </Paper>
    </Slide>
  );
}



