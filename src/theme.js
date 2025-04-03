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
      primary: '#3E2723', // Dark brown for text
      secondary: '#5D4037', // Medium brown for secondary text
    },
    error: { main: '#D32F2F' },
    warning: { main: '#FFA000' }, // Amber warning
    info: { main: '#1976D2' },
    success: { main: '#388E3C' },
  },
  typography: {
    fontFamily: '"Cormorant Garamond", "Playfair Display", "Times New Roman", serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: '#3E2723', // Dark brown
      fontFamily: '"Playfair Display", serif',
      letterSpacing: '0.5px',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: '#3E2723',
      fontFamily: '"Playfair Display", serif',
      letterSpacing: '0.3px',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 400,
      color: '#3E2723',
      fontFamily: '"Playfair Display", serif',
    },
    h6: {
      fontFamily: '"Cinzel", "Playfair Display", serif',
      letterSpacing: '1px',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      color: '#5D4037', // Medium brown
      fontFamily: '"Cormorant Garamond", serif',
    },
    button: {
      fontSize: '1rem',
      fontWeight: 500,
      textTransform: 'none',
      fontFamily: '"Cormorant Garamond", serif',
      letterSpacing: '0.5px',
    },
    caption: {
      fontSize: '0.875rem',
      fontWeight: 400,
      color: '#795548', // Light brown
      fontFamily: '"Cormorant Garamond", serif',
      fontStyle: 'italic',
    },
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 236, 179, 0.85)', // Translucent amber
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
          },
        },
      },
    },
  },
});

export default theme;
