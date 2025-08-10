import React from 'react';
import { Box, TextField, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '48%' } }}>
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
                </Box>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '48%' } }}>
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
                </Box>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '48%' } }}>
                    <TextField
                        label={t('jathakPrediction.form.birthTime')}
                        type="time"
                        value={formData.birthTime}
                        onChange={handleChange('birthTime')}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '48%' } }}>
                    <FormControl fullWidth>
                        <InputLabel id="zodiac-select-label">{t('jathakPrediction.form.zodiac')}</InputLabel>
                        <Select
                            labelId="zodiac-select-label"
                            value={formData.zodiac || ''}
                            label={t('jathakPrediction.form.zodiac')}
                            onChange={(e) => onFormDataChange({ ...formData, zodiac: e.target.value })}
                        >
                            {/* <MenuItem value="">{''}</MenuItem> */}
                            {(t('jathakPrediction.form.zodiacOptions', { returnObjects: true }) || []).map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>
        </Box>
    );
}


