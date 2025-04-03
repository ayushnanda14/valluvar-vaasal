import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Alert,
  Link as MuiLink,
  CircularProgress,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';

export default function AdminSignup() {
  const theme = useTheme();
  const router = useRouter();
  const { signup } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // This should be stored in an environment variable or secure database
  // For demo purposes, we're hardcoding it here
  const ADMIN_SECRET_CODE = 'admin123'; // Change this to a secure value
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!email || !password || !confirmPassword || !displayName || !adminCode) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (adminCode !== ADMIN_SECRET_CODE) {
      setError('Invalid admin code');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Create user with admin role
      await signup(email, password, displayName, ['admin', 'client']);
      
      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to create an account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Head>
        <title>Admin Signup | Valluvar Vaasal</title>
        <meta name="description" content="Create an admin account for Valluvar Vaasal" />
      </Head>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh' 
      }}>
        <Box 
          sx={{
            flexGrow: 1,
            py: { xs: 4, md: 8 },
            background: 'linear-gradient(135deg, rgba(255,248,225,0.6) 0%, rgba(255,236,179,0.3) 100%)'
          }}
        >
          <Container maxWidth="sm">
            <Paper 
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }}
            >
              <Typography 
                variant="h4" 
                component="h1"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 600,
                  mb: 3,
                  color: theme.palette.secondary.dark,
                  textAlign: 'center'
                }}
              >
                Admin Signup
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              <form onSubmit={handleSubmit} autoComplete="off">
                {/* Hidden fields to prevent autofill */}
                <input type="text" style={{ display: 'none' }} />
                <input type="password" style={{ display: 'none' }} />
                
                <TextField
                  label="Full Name"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="new-name"
                  inputProps={{ autoComplete: 'new-name' }}
                />
                
                <TextField
                  label="Email Address"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="new-email"
                  inputProps={{ autoComplete: 'new-email' }}
                />
                
                <TextField
                  label="Password"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  inputProps={{ autoComplete: 'new-password' }}
                />
                
                <TextField
                  label="Confirm Password"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  inputProps={{ autoComplete: 'new-password' }}
                />
                
                <TextField
                  label="Admin Code"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  required
                  helperText="Enter the admin secret code"
                  autoComplete="off"
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                  sx={{ 
                    mt: 3, 
                    mb: 2,
                    py: 1.5,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: '1.1rem'
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Create Admin Account'}
                </Button>
              </form>
              
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link href="/login" passHref>
                  <MuiLink 
                    variant="body2"
                    sx={{ 
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Already have an account? Sign in
                  </MuiLink>
                </Link>
              </Box>
            </Paper>
          </Container>
        </Box>
      </Box>
    </>
  );
} 