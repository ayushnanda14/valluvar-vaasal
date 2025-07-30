import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function JathakWritingForm({ formData, onFormDataChange, errors = {} }) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleInputChange = (field, value) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            color: theme.palette.primary.main,
            fontFamily: '"Cormorant Garamond", serif',
            textAlign: 'center'
          }}
        >
          {t('jathakWriting.form.title', 'Enter Birth Details')}
        </Typography>

        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {t('jathakWriting.form.errors.pleaseComplete', 'Please complete all required fields.')}
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Left side - Demo image and note (desktop only) */}
          {!isMobile && (
            <Box sx={{ flex: '1 1 50%' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>
                {t('jathakWriting.form.demoTitle', 'Example of Birth Details')}
              </Typography>
              <Box
                component="img"
                src={'/images/jathak-demo.png'}
                alt={t('jathakWriting.form.demoAlt', 'Example Birth Details')}
                sx={{
                  width: '100%',
                  maxWidth: 300,
                  height: 'auto',
                  maxHeight: 200,
                  borderRadius: '4px',
                  objectFit: 'contain',
                  mx: 'auto',
                  display: 'block',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                  mb: 2
                }}
              />
              <Box sx={{ p: 2, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontStyle: 'italic'
                  }}
                >
                  {t('jathakWriting.form.disclaimer', 'Note: Accurate birth time is crucial for precise jathak calculation. If the exact time is not known, please provide the best estimate available.')}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Right side - Form */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' }, width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Name */}
              <TextField
                fullWidth
                label={t('jathakWriting.form.name', 'Full Name')}
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
                sx={{
                  '& .MuiInputLabel-root': {
                    fontFamily: '"Cormorant Garamond", serif'
                  },
                  '& .MuiInputBase-input': {
                    fontFamily: '"Cormorant Garamond", serif'
                  }
                }}
              />

              {/* Birth Place */}
              <TextField
                fullWidth
                label={t('jathakWriting.form.birthPlace', 'Birth Place')}
                value={formData.birthPlace || ''}
                onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                error={!!errors.birthPlace}
                helperText={errors.birthPlace}
                required
                sx={{
                  '& .MuiInputLabel-root': {
                    fontFamily: '"Cormorant Garamond", serif'
                  },
                  '& .MuiInputBase-input': {
                    fontFamily: '"Cormorant Garamond", serif'
                  }
                }}
              />

              {/* Birth Date */}
              <TextField
                fullWidth
                type="date"
                label={t('jathakWriting.form.birthDate', 'Birth Date')}
                value={formData.birthDate || ''}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                error={!!errors.birthDate}
                helperText={errors.birthDate}
                required
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  '& .MuiInputLabel-root': {
                    fontFamily: '"Cormorant Garamond", serif'
                  },
                  '& .MuiInputBase-input': {
                    fontFamily: '"Cormorant Garamond", serif'
                  }
                }}
              />

              {/* Birth Time */}
              <TextField
                fullWidth
                type="time"
                label={t('jathakWriting.form.birthTime', 'Birth Time')}
                value={formData.birthTime || ''}
                onChange={(e) => handleInputChange('birthTime', e.target.value)}
                error={!!errors.birthTime}
                helperText={errors.birthTime}
                required
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  '& .MuiInputLabel-root': {
                    fontFamily: '"Cormorant Garamond", serif'
                  },
                  '& .MuiInputBase-input': {
                    fontFamily: '"Cormorant Garamond", serif'
                  }
                }}
              />

              {/* Additional Notes */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('jathakWriting.form.additionalNotes', 'Additional Notes (Optional)')}
                value={formData.additionalNotes || ''}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                placeholder={t('jathakWriting.form.notesPlaceholder', 'Any additional information about the birth or special circumstances...')}
                sx={{
                  '& .MuiInputLabel-root': {
                    fontFamily: '"Cormorant Garamond", serif'
                  },
                  '& .MuiInputBase-input': {
                    fontFamily: '"Cormorant Garamond", serif'
                  }
                }}
              />
            </Box>

            {/* Note for mobile view only */}
            {isMobile && (
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontFamily: '"Cormorant Garamond", serif',
                    fontStyle: 'italic'
                  }}
                >
                  {t('jathakWriting.form.disclaimer', 'Note: Accurate birth time is crucial for precise jathak calculation. If the exact time is not known, please provide the best estimate available.')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
} 