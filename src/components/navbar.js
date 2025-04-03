import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  useMediaQuery,
  Badge
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StarIcon from '@mui/icons-material/Star';
import MessageIcon from '@mui/icons-material/Message';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { currentUser, logout, hasRole, userRoles } = useAuth();
  
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  
  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };
  
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
    setDrawerOpen(false);
  };
  
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
    handleCloseUserMenu();
  };
  
  // Regular user navigation items
  const pages = [
    { title: 'Home', path: '/' },
    { title: 'Services', path: '/services' },
    { title: 'About', path: '/about' },
    { title: 'Contact', path: '/contact' },
  ];
  
  // Admin navigation items
  const adminPages = [
    { title: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon /> },
    { title: 'Manage Users', path: '/admin/dashboard', tab: 0, icon: <PeopleIcon /> },
    { title: 'Manage Astrologers', path: '/admin/astrologers', icon: <StarIcon /> },
    { title: 'Manage Roles', path: '/admin/roles', icon: <AdminPanelSettingsIcon /> },
    { title: 'Testimonials', path: '/admin/dashboard', tab: 1, icon: <MessageIcon /> },
    { title: 'Revenue', path: '/admin/dashboard', tab: 2, icon: <AssignmentIcon /> },
  ];
  
  // Astrologer navigation items
  const astrologerPages = [
    { title: 'Dashboard', path: '/dashboard/astrologer', icon: <DashboardIcon /> },
    { title: 'Readings', path: '/dashboard/astrologer', tab: 0, icon: <AssignmentIcon /> },
    { title: 'Revenue', path: '/dashboard/astrologer', tab: 1, icon: <AssignmentIcon /> },
    { title: 'Services & Pricing', path: '/dashboard/astrologer', tab: 0, icon: <SettingsIcon /> },
    { title: 'Verification', path: '/dashboard/astrologer', tab: 1, icon: <AdminPanelSettingsIcon /> },
  ];
  
  // Determine which navigation items to show based on user role
  const navItems = isAdmin ? adminPages : isAstrologer ? astrologerPages : pages;
  
  const handleNavItemClick = (item) => {
    handleCloseNavMenu();
    
    if (item.tab !== undefined) {
      // If the item has a tab property, navigate to the page and set the tab
      router.push({
        pathname: item.path,
        query: { tab: item.tab }
      });
    } else {
      // Otherwise, just navigate to the page
      router.push(item.path);
    }
  };
  
  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo for desktop */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            VALLUVAR VAASAL
          </Typography>
          
          {/* Mobile menu button */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={() => setDrawerOpen(true)}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            
            {/* Mobile drawer */}
            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
            >
              <Box
                sx={{ width: 250 }}
                role="presentation"
              >
                <List>
                  {navItems.map((item) => (
                    <ListItem key={item.title} disablePadding>
                      <ListItemButton onClick={() => handleNavItemClick(item)}>
                        {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                        <ListItemText primary={item.title} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                
                {currentUser && (
                  <>
                    <Divider />
                    <List>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => {
                          setDrawerOpen(false);
                          router.push('/profile');
                        }}>
                          <ListItemIcon><PersonIcon /></ListItemIcon>
                          <ListItemText primary="Profile" />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => {
                          setDrawerOpen(false);
                          router.push('/messages');
                        }}>
                          <ListItemIcon><MessageIcon /></ListItemIcon>
                          <ListItemText primary="Messages" />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => {
                          setDrawerOpen(false);
                          handleLogout();
                        }}>
                          <ListItemIcon><LogoutIcon /></ListItemIcon>
                          <ListItemText primary="Logout" />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </>
                )}
              </Box>
            </Drawer>
          </Box>
          
          {/* Logo for mobile */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            VALLUVAR VAASAL
          </Typography>
          
          {/* Desktop navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {navItems.map((item) => (
              <Button
                key={item.title}
                onClick={() => handleNavItemClick(item)}
                sx={{ 
                  my: 2, 
                  color: 'inherit', 
                  display: 'block',
                  fontFamily: '"Cormorant Garamond", serif',
                }}
              >
                {item.title}
              </Button>
            ))}
          </Box>
          
          {/* User menu section */}
          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
            {currentUser && (
              <Tooltip title="Notifications">
                <IconButton sx={{ mr: 2 }}>
                  <Badge badgeContent={notificationCount} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
            
            {currentUser ? (
              <>
                <Tooltip title="Open settings">
                  <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                    <Avatar 
                      alt={currentUser.displayName || 'User'} 
                      src={currentUser.photoURL || '/static/images/avatar/default.jpg'} 
                    />
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: '45px' }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  <MenuItem 
                    component={Link} 
                    href={isAdmin ? '/admin/dashboard' : isAstrologer ? '/dashboard/astrologer' : '/dashboard'}
                    onClick={handleCloseUserMenu}
                  >
                    <DashboardIcon sx={{ mr: 1 }} />
                    <Typography textAlign="center">Dashboard</Typography>
                  </MenuItem>
                  
                  <MenuItem 
                    component={Link} 
                    href="/profile" 
                    onClick={handleCloseUserMenu}
                  >
                    <PersonIcon sx={{ mr: 1 }} />
                    <Typography textAlign="center">Profile</Typography>
                  </MenuItem>
                  
                  <MenuItem 
                    component={Link} 
                    href="/messages" 
                    onClick={handleCloseUserMenu}
                  >
                    <MessageIcon sx={{ mr: 1 }} />
                    <Typography textAlign="center">Messages</Typography>
                  </MenuItem>
                  
                  <Divider />
                  
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    <Typography textAlign="center">Logout</Typography>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex' }}>
                <Button 
                  component={Link} 
                  href="/login" 
                  variant="outlined" 
                  color="primary"
                  sx={{ 
                    mr: 1,
                    fontFamily: '"Cormorant Garamond", serif',
                  }}
                >
                  Login
                </Button>
                <Button 
                  component={Link} 
                  href="/signup" 
                  variant="contained" 
                  color="primary"
                  sx={{ 
                    fontFamily: '"Cormorant Garamond", serif',
                  }}
                >
                  Sign Up
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;
