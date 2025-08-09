import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LanguageIcon from '@mui/icons-material/Language';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const Navbar = () => {
  const { t, i18n } = useTranslation('common');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileNav = useMediaQuery('(max-width:900px)');
  const router = useRouter();
  const { currentUser, logout, hasRole, userRoles } = useAuth();

  // For profile menu (desktop)
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // For profile drawer (mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // For logged out user drawer
  const [loggedOutDrawerOpen, setLoggedOutDrawerOpen] = useState(false);

  // For role-based navigation
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAstrologer, setIsAstrologer] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Check user roles
  useEffect(() => {
    const checkRoles = async () => {
      if (currentUser) {
        const adminCheck = await hasRole('admin');
        const astrologerCheck = await hasRole('astrologer');

        setIsAdmin(adminCheck);
        setIsAstrologer(astrologerCheck);
      } else {
        setIsAdmin(false);
        setIsAstrologer(false);
      }
    };

    checkRoles();
  }, [currentUser, hasRole, userRoles]);

  const handleProfileClick = (event) => {
    if (isMobile) {
      // Open drawer on mobile
      setDrawerOpen(true);
    } else {
      // Open dropdown on desktop
      setAnchorEl(event.currentTarget);
    }
  };

  const handleLoggedOutProfileClick = () => {
    setLoggedOutDrawerOpen(true);
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
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const toggleLoggedOutDrawer = (open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setLoggedOutDrawerOpen(open);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser || !currentUser.displayName) return '?';

    const names = currentUser.displayName.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Language switcher for mobile drawer
  const languages = {
    en: 'English',
    ta: 'தமிழ்',
  };
  const currentLang = i18n.language.split('-')[0];
  const currentLabel = languages[currentLang] || currentLang.toUpperCase();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
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
        <Container sx={{ width: '100% !important', maxWidth: '100% !important', margin: '0', padding: '0px' }}>
          {isMobileNav ? (
            // Single container mobile layout
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              py: 1,
              px: 2
            }}>
              {/* Left side - Logo */}
              <Link href="/" passHref legacyBehavior>
                <a aria-label="Valluvar Vaasal Home" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Image src="/images/vv-logo.svg" alt="Valluvar Vaasal" width={36} height={36} priority />
                </a>
              </Link>

              {/* Center - Title */}
              <Link href="/" passHref legacyBehavior>
                <Typography
                  component="a"
                  variant="h5"
                  sx={{
                    fontFamily: '"Cinzel", serif',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textDecoration: 'none',
                    color: 'inherit',
                    fontSize: '1.3rem',
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {t('brand')}
                </Typography>
              </Link>

              {/* Right side - Profile Icon only (language switcher moved to drawer) */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                {currentUser ? (
                  <IconButton
                    onClick={handleProfileClick}
                    size='small'
                    sx={{
                      border: `2px solid ${theme.palette.primary.main}`,
                      p: '4px'
                    }}
                  >
                    {currentUser.photoURL ? (
                      <Avatar src={currentUser.photoURL} sx={{ width: 32, height: 32 }} />
                    ) : (
                      <Avatar sx={{
                        width: 32,
                        height: 32,
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        fontFamily: '"Cinzel", serif',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                      }}>
                        {getUserInitials()}
                      </Avatar>
                    )}
                  </IconButton>
                ) : (
                  <IconButton
                    onClick={handleLoggedOutProfileClick}
                    size='small'
                    sx={{
                      border: `2px solid ${theme.palette.grey[400]}`,
                      p: '4px',
                      color: theme.palette.grey[600]
                    }}
                  >
                    <AccountCircleIcon sx={{ width: 32, height: 32 }} />
                  </IconButton>
                )}
              </Box>
            </Box>
          ) : isMobile ? (
            // Original mobile layout for screens between md and 900px
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', py: 1 }}>
                <Link href="/" passHref legacyBehavior>
                  <Typography component="a" variant="h3" sx={{ fontFamily: '"Cinzel", serif', fontWeight: 600, letterSpacing: '1px', textDecoration: 'none', color: 'inherit' }}>
                    {t('brand')}
                  </Typography>
                </Link>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', py: 1 }}>
                {currentUser ? (
                  <IconButton
                    onClick={handleProfileClick}
                    size='small'
                    sx={{ border: `2px solid ${theme.palette.primary.main}`, p: '4px' }}
                  >
                    {currentUser.photoURL ? (
                      <Avatar src={currentUser.photoURL} sx={{ width: 32, height: 32 }} />
                    ) : (
                      <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, fontFamily: '"Cinzel", serif', fontWeight: 500, fontSize: '0.9rem' }}>
                        {getUserInitials()}
                      </Avatar>
                    )}
                  </IconButton>
                ) : (
                  <IconButton
                    onClick={handleLoggedOutProfileClick}
                    size='small'
                    sx={{
                      border: `2px solid ${theme.palette.grey[400]}`,
                      p: '4px',
                      color: theme.palette.grey[600]
                    }}
                  >
                    <AccountCircleIcon sx={{ width: 32, height: 32 }} />
                  </IconButton>
                )}
              </Box>
            </>
          ) : (
            <Toolbar
              disableGutters
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                px: { xs: 2, md: 3 }
              }}
            >
              {/* Left-aligned Logo */}
              <Link href="/" passHref legacyBehavior>
                <a aria-label="Valluvar Vaasal Home" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Image src="/images/vv-logo.svg" alt="Valluvar Vaasal" width={50} height={50} />
                </a>
              </Link>
              {/* Brand – absolutely centered */}
              <Link href="/" passHref legacyBehavior>
                <Typography
                  component="a"
                  variant="h6"
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontFamily: '"Cinzel", serif',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    color: 'inherit',
                    textDecoration: 'none',
                    fontSize: { xs: '1.5rem', md: '1.75rem' }
                  }}
                >
                  {t('brand')}
                </Typography>
              </Link>

              {/* Right-hand controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
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
                            router.push(isAdmin ? '/admin/dashboard' : isAstrologer ? '/dashboard/astrologer' : '/dashboard');
                          }}
                          sx={{
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: '1rem',
                            py: 1.5
                          }}
                        >
                          {t('navbar.dashboard')}
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
                          {t('navbar.bookings')}
                        </MenuItem>
                        <Divider />
                        
                        {/* Language Switcher */}
                        <Box sx={{ px: 2, py: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontFamily: '"Cinzel", serif',
                              fontWeight: 500,
                              mb: 1,
                              color: 'text.secondary',
                              fontSize: '0.8rem'
                            }}
                          >
                            {t('navbar.language')}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {Object.keys(languages).map((lng) => (
                              <Button
                                key={lng}
                                variant={currentLang === lng ? 'contained' : 'outlined'}
                                size="small"
                                onClick={() => {
                                  changeLanguage(lng);
                                  handleClose();
                                }}
                                sx={{
                                  fontFamily: '"Cinzel", serif',
                                  fontWeight: 500,
                                  textTransform: 'none',
                                  minWidth: 'auto',
                                  px: 1.5,
                                  py: 0.5,
                                  fontSize: '0.75rem'
                                }}
                              >
                                {languages[lng]}
                              </Button>
                            ))}
                          </Box>
                        </Box>
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
                          {t('auth.signOut')}
                        </MenuItem>
                      </Menu>
                    )}
                  </>
                ) : (
                  <IconButton
                    onClick={handleLoggedOutProfileClick}
                    size="small"
                    sx={{
                      border: `2px solid ${theme.palette.grey[400]}`,
                      padding: '4px',
                      color: theme.palette.grey[600],
                      '&:hover': {
                        borderColor: theme.palette.grey[500],
                        color: theme.palette.grey[700],
                      }
                    }}
                  >
                    <AccountCircleIcon sx={{ width: 32, height: 32 }} />
                  </IconButton>
                )}
              </Box>
            </Toolbar>
          )}
        </Container>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
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
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
            }}
          >
            {t('footer.quickLinks')}
          </Typography>
          <IconButton onClick={toggleDrawer(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        {/* Language Switcher in Mobile Drawer */}
        <Box sx={{ p: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 500,
              mb: 1,
              color: 'text.secondary'
            }}
          >
            {t('navbar.language')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {Object.keys(languages).map((lng) => (
              <Button
                key={lng}
                variant={currentLang === lng ? 'contained' : 'outlined'}
                size="small"
                onClick={() => changeLanguage(lng)}
                startIcon={<LanguageIcon />}
                sx={{
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 500,
                  textTransform: 'none',
                  minWidth: 'auto',
                  px: 2
                }}
              >
                {languages[lng]}
              </Button>
            ))}
          </Box>
        </Box>
        <Divider />

        {currentUser && (
          <>
            <Divider />
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
            </Box>
            <List>
              <ListItem button onClick={() => {
                router.push('/profile');
                setDrawerOpen(false);
              }}>
                <ListItemIcon><PersonIcon /></ListItemIcon>
                <ListItemText
                  primary={t('navbar.profile')}
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
                <ListItemIcon><AssignmentIcon /></ListItemIcon>
                <ListItemText
                  primary={t('navbar.bookings')}
                  primaryTypographyProps={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: '1.1rem'
                  }}
                />
              </ListItem>
              <ListItem button onClick={handleLogout}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText
                  primary={t('auth.signOut')}
                  primaryTypographyProps={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: '1.1rem',
                    color: theme.palette.error.main
                  }}
                />
              </ListItem>
            </List>
          </>
        )}
      </Drawer>

      {/* Logged Out User Drawer */}
      <Drawer
        anchor="right"
        open={loggedOutDrawerOpen}
        onClose={toggleLoggedOutDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: '80%',
            maxWidth: '300px',
            boxSizing: 'border-box',
            background: theme.palette.background.paper,
          },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
            }}
          >
            {t('navbar.settings')}
          </Typography>
          <IconButton onClick={toggleLoggedOutDrawer(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        {/* Language Switcher */}
        <Box sx={{ p: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 500,
              mb: 1,
              color: 'text.secondary'
            }}
          >
            {t('navbar.language')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {Object.keys(languages).map((lng) => (
              <Button
                key={lng}
                variant={currentLang === lng ? 'contained' : 'outlined'}
                size="small"
                onClick={() => changeLanguage(lng)}
                startIcon={<LanguageIcon />}
                sx={{
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 500,
                  textTransform: 'none',
                  minWidth: 'auto',
                  px: 2
                }}
              >
                {languages[lng]}
              </Button>
            ))}
          </Box>
        </Box>
        <Divider />

        {/* Sign In Section */}
        <Box sx={{ p: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 500,
              mb: 2,
              color: 'text.secondary'
            }}
          >
            {t('navbar.account')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Link href="/login" passHref legacyBehavior>
              <Button
                component="a"
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => setLoggedOutDrawerOpen(false)}
                sx={{
                  textTransform: 'none',
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 500,
                  py: 1.5
                }}
              >
                {t('auth.signIn')}
              </Button>
            </Link>
            <Link href="/signup" passHref legacyBehavior>
              <Button
                component="a"
                variant="contained"
                color="text.secondary"
                fullWidth
                onClick={() => setLoggedOutDrawerOpen(false)}
                sx={{
                  textTransform: 'none',
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 500,
                  py: 1.5
                }}
              >
                {t('auth.signUp')}
              </Button>
            </Link>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
