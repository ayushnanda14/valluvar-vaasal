import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  useTheme,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import SupportIcon from '@mui/icons-material/Support';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useAuth } from '../../context/AuthContext';
import { getAdminStats, getAdminAssignedChats } from '../../services/adminService';
import { getChatExpiryStatus } from '../../services/chatService';

const AdminDashboard = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [assignedChats, setAssignedChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        
        // Load admin statistics
        const adminStats = await getAdminStats(currentUser.uid);
        setStats(adminStats);
        
        // Load assigned chats
        const chats = await getAdminAssignedChats(currentUser.uid);
        setAssignedChats(chats);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography 
        variant="h4" 
        sx={{ 
          fontFamily: '"Playfair Display", serif', 
          mb: 3 
        }}
      >
        Admin Dashboard
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ChatIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats?.totalAssignedChats || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assigned Chats
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats?.activeChats || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Chats
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SupportIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="secondary.main">
                    {stats?.adminClientChats || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Support Chats
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats?.workload || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current Workload
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assigned Chats */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Assigned Chats
        </Typography>
        
        {assignedChats.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No chats assigned to you yet.
          </Typography>
        ) : (
          <List>
            {assignedChats.map((chat, index) => (
              <React.Fragment key={chat.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${chat.clientName} ↔ ${chat.astrologerName}`}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Service: {chat.serviceType} • Last updated: {chat.updatedAt?.toDate().toLocaleString()}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip 
                            label={chat.status || 'Active'} 
                            color={chat.status === 'active' ? 'primary' : 'default'}
                            size="small"
                          />
                          {chat.feedback && (
                            <Chip 
                              label="Has Feedback" 
                              color="secondary" 
                              size="small"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      // Navigate to chat monitor with this chat
                      window.location.href = `/admin/chats?chatId=${chat.id}`;
                    }}
                  >
                    View
                  </Button>
                </ListItem>
                {index < assignedChats.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default AdminDashboard; 