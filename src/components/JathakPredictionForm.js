import React from 'react';
import { Box, TextField, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

export default function JathakPredictionForm({ formData, onFormDataChange, errors = {} }) {
    const theme = useTheme();
    const { t } = useTranslation('common');

    const handleChange = (field) => (e) => {
        onFormDataChange({ ...formData, [field]: e.target.value });
    };

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label={t('jathakPrediction.form.name')}
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            required
            error={!!errors.name}
            helperText={errors.name}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label={t('jathakPrediction.form.birthDate')}
            type="date"
            value={formData.birthDate}
            onChange={handleChange('birthDate')}
            fullWidth
            required
            error={!!errors.birthDate}
            helperText={errors.birthDate}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label={t('jathakPrediction.form.birthTime')}
            type="time"
            value={formData.birthTime}
            onChange={handleChange('birthTime')}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label={t('jathakPrediction.form.zodiac')}
            value={formData.zodiac}
            onChange={handleChange('zodiac')}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}


