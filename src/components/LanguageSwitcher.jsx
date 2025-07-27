import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Menu,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation('common');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // detect mobile
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Set the correct language after hydration
  useEffect(() => {
    const savedLng = localStorage.getItem('i18nextLng');
    if (savedLng && ['en', 'ta'].includes(savedLng)) {
      i18n.changeLanguage(savedLng);
    }
  }, [i18n]);

  // Static labels for language names (unchanged by translation)
  const languages = {
    en: 'English',
    ta: 'தமிழ்',
  };
  const currentLang = i18n.language.split('-')[0];
  const currentLabel = languages[currentLang] || currentLang.toUpperCase();
  const displayLabel = isMobile ? currentLang.toUpperCase() : currentLabel;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    handleClose();
  };

  return (
    <Box>
      <Button
        onClick={handleClick}
        startIcon={<LanguageIcon />}
        sx={{
          color: 'text.primary',
          textTransform: 'none',
          minWidth: 80,
          px: 1.5,
        }}
      >
        {displayLabel}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{ sx: { minWidth: 120, borderRadius: 2, mt: 1 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {Object.keys(languages).map((lng) => (
          <MenuItem
            key={lng}
            selected={currentLang === lng}
            onClick={() => changeLanguage(lng)}
            sx={{ justifyContent: 'space-between', textTransform: 'none' }}
          >
            {languages[lng]}
            {currentLang === lng && <TranslateIcon fontSize="small" color="primary" />}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher; 