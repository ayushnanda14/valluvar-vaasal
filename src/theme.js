// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { 
      main: '#E67E22', // A warm orange
      light: '#F39C12', // Lighter orange/amber
      dark: '#D35400', // Darker orange
    },
    secondary: { 
      main: '#8B4513', // Brown
      light: '#A0522D', // Lighter brown
      dark: '#5D2906', // Darker brown
    },
    background: {
      default: '#FFF8E1', // Very light amber background
      paper: '#FFFAF0',   // Floral white for paper elements
    },
    text: {
      primary: '#2C1810', // Darker brown for better contrast
      secondary: '#4A2C1A', // Darker secondary text
    },
    error: { main: '#D32F2F' },
    warning: { main: '#FFA000' }, // Amber warning
    info: { main: '#1976D2' },
    success: { main: '#388E3C' },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
      letterSpacing: '0.5px',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
      letterSpacing: '0.3px',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
    },
    h6: {
      fontSize: '1.1rem',
      fontWeight: 600,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: '#4A2C1A',
      fontFamily: '"Poppins", sans-serif',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      color: '#2C1810',
      fontFamily: '"Poppins", sans-serif',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      color: '#4A2C1A',
      fontFamily: '"Poppins", sans-serif',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      fontFamily: '"Poppins", sans-serif',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      color: '#4A2C1A',
      fontFamily: '"Poppins", sans-serif',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: '#4A2C1A',
      fontFamily: '"Poppins", sans-serif',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          letterSpacing: '0.2px',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontWeight: 500,
          fontSize: '1rem',
        },
        secondary: {
          fontWeight: 400,
          fontSize: '0.875rem',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
