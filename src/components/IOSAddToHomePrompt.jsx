import React, { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export default function IOSAddToHomePrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isIOS && !isInStandalone) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Paper elevation={6} sx={{ position: 'fixed', left: 16, right: 16, bottom: 16, p: 2, zIndex: 1400 }}>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Box flexGrow={1}>
            <Typography variant="subtitle1" fontWeight={600}>Add to Home Screen</Typography>
            <Typography variant="body2" color="text.secondary">
              Tap the share button and choose "Add to Home Screen" to install this app.
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={() => setVisible(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>
    </Slide>
  );
}



