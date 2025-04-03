import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box,
  Container,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  
  // For profile menu (desktop)
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // For profile drawer (mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const handleProfileClick = (event) => {
    if (isMobile) {
      // Open drawer on mobile
      setDrawerOpen(true);
    } else {
      // Open dropdown on desktop
      setAnchorEl(event.currentTarget);
    }
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      handleClose();
      setDrawerOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser || !currentUser.displayName) return '?';
    
    const names = currentUser.displayName.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      </Head>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          backgroundColor: 'rgba(255, 236, 179, 0.85)', // Translucent amber
          backdropFilter: 'blur(8px)',
          color: theme.palette.secondary.dark,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', // Subtle shadow instead of border
          borderBottom: 'none'
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            {/* Empty Box to maintain spacing on the left */}
            <Box sx={{ width: 48 }} />
            
            {/* Logo/Brand - Centered */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              flexGrow: 1
            }}>
              <Link href="/" passHref legacyBehavior>
                <Typography
                  variant="h6"
                  component="a"
                  sx={{
                    fontFamily: '"Cinzel", serif',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    color: 'inherit',
                    textDecoration: 'none',
                    fontSize: { xs: '1.2rem', md: '1.5rem' }
                  }}
                >
                  Valluvar Vaasal
                </Typography>
              </Link>
            </Box>
            
            {/* Auth Button or Profile - Right aligned */}
            <Box>
              {currentUser ? (
                <>
                  <IconButton
                    onClick={handleProfileClick}
                    size="small"
                    aria-controls={open ? 'profile-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    sx={{ 
                      ml: 2,
                      border: `2px solid ${theme.palette.primary.main}`,
                      padding: '4px'
                    }}
                  >
                    {currentUser.photoURL ? (
                      <Avatar 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName || 'User'} 
                        sx={{ width: 32, height: 32 }}
                      />
                    ) : (
                      <Avatar 
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          fontFamily: '"Cinzel", serif',
                          fontWeight: 500,
                          fontSize: '0.9rem'
                        }}
                      >
                        {getUserInitials()}
                      </Avatar>
                    )}
                  </IconButton>
                  
                  {/* Desktop Profile Menu */}
                  {!isMobile && (
                    <Menu
                      id="profile-menu"
                      anchorEl={anchorEl}
                      open={open}
                      onClose={handleClose}
                      MenuListProps={{
                        'aria-labelledby': 'profile-button',
                      }}
                      PaperProps={{
                        elevation: 3,
                        sx: {
                          mt: 1.5,
                          borderRadius: '8px',
                          minWidth: '180px',
                          overflow: 'visible',
                          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                          '&:before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 14,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                          },
                        },
                      }}
                      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                      <Box sx={{ px: 2, py: 1 }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontFamily: '"Cinzel", serif',
                            fontWeight: 500
                          }}
                        >
                          {currentUser.displayName || 'User'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.8rem',
                            mb: 1
                          }}
                        >
                          {currentUser.email}
                        </Typography>
                      </Box>
                      <Divider />
                      <MenuItem 
                        onClick={() => {
                          handleClose();
                          router.push('/profile');
                        }}
                        sx={{ 
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: '1rem',
                          py: 1.5
                        }}
                      >
                        My Profile
                      </MenuItem>
                      <MenuItem 
                        onClick={() => {
                          handleClose();
                          router.push('/bookings');
                        }}
                        sx={{ 
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: '1rem',
                          py: 1.5
                        }}
                      >
                        My Bookings
                      </MenuItem>
                      <Divider />
                      <MenuItem 
                        onClick={handleLogout}
                        sx={{ 
                          fontFamily: '"Cormorant Garamond", serif',
                          fontSize: '1rem',
                          color: theme.palette.error.main,
                          py: 1.5
                        }}
                      >
                        Sign Out
                      </MenuItem>
                    </Menu>
                  )}
                </>
              ) : (
                <Link href="/login" passHref legacyBehavior>
                  <Button
                    component="a"
                    variant="contained"
                    color="primary"
                    sx={{ 
                      py: 1,
                      px: 3,
                      fontFamily: '"Cinzel", serif',
                      fontWeight: 500,
                      boxShadow: 'none',
                      letterSpacing: '0.8px',
                      textTransform: 'none',
                      '&:hover': {
                        boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
                      }
                    }}
                  >
                    Sign In
                  </Button>
                </Link>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Mobile Profile Drawer - Only for authenticated users */}
      {currentUser && (
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={toggleDrawer(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: '80%',
              maxWidth: '300px',
              boxSizing: 'border-box',
              background: theme.palette.background.paper,
            },
          }}
        >
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {currentUser.photoURL ? (
              <Avatar 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'User'} 
                sx={{ width: 80, height: 80, mb: 2 }}
              />
            ) : (
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mb: 2,
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 500,
                  fontSize: '2rem'
                }}
              >
                {getUserInitials()}
              </Avatar>
            )}
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: '"Cinzel", serif',
                fontWeight: 500,
                textAlign: 'center'
              }}
            >
              {currentUser.displayName || 'User'}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                mb: 2,
                textAlign: 'center'
              }}
            >
              {currentUser.email}
            </Typography>
            <Box sx={{ alignSelf: 'flex-end' }}>
              <IconButton onClick={toggleDrawer(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Divider />
          <List>
            <ListItem button onClick={() => {
              router.push('/profile');
              setDrawerOpen(false);
            }}>
              <ListItemText 
                primary="My Profile" 
                primaryTypographyProps={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: '1.1rem'
                }}
              />
            </ListItem>
            <ListItem button onClick={() => {
              router.push('/bookings');
              setDrawerOpen(false);
            }}>
              <ListItemText 
                primary="My Bookings" 
                primaryTypographyProps={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: '1.1rem'
                }}
              />
            </ListItem>
            <ListItem button onClick={handleLogout}>
              <ListItemText 
                primary="Sign Out" 
                primaryTypographyProps={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: '1.1rem',
                  color: theme.palette.error.main
                }}
              />
            </ListItem>
          </List>
        </Drawer>
      )}
    </>
  );
};

export default Navbar;
