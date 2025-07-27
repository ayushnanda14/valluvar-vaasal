import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
  Grid
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/context/AuthContext';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../src/firebase/firebaseConfig';

// Protected route component
import ProtectedRoute from '../../src/components/ProtectedRoute';

export default function RolesManagement() {
  const theme = useTheme();
  const router = useRouter();
  const { currentUser, isAdmin } = useAuth();

  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        const rolesRef = collection(db, 'roles');
        const q = query(rolesRef, orderBy('name'));
        const querySnapshot = await getDocs(q);

        const rolesList = [];
        querySnapshot.forEach((doc) => {
          rolesList.push({
            id: doc.id,
            ...doc.data()
          });
        });

        setRoles(rolesList);
      } catch (error) {
        console.error('Error fetching roles:', error);
        setError('Failed to load roles. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [currentUser]);

  const handleAddRole = async (e) => {
    e.preventDefault();

    if (!newRoleName.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      const roleId = newRoleName.toLowerCase().replace(/\s+/g, '_');
      const roleRef = doc(db, 'roles', roleId);

      await setDoc(roleRef, {
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add to local state
      setRoles([...roles, {
        id: roleId,
        name: newRoleName.trim(),
        description: newRoleDescription.trim()
      }]);

      // Reset form
      setNewRoleName('');
      setNewRoleDescription('');
      setError('');
    } catch (error) {
      console.error('Error adding role:', error);
      setError('Failed to add role. Please try again.');
    }
  };

  const handleOpenDeleteDialog = (role) => {
    setRoleToDelete(role);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setRoleToDelete(null);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      const roleRef = doc(db, 'roles', roleToDelete.id);
      await deleteDoc(roleRef);

      // Remove from local state
      setRoles(roles.filter(role => role.id !== roleToDelete.id));

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error deleting role:', error);
      setError('Failed to delete role. Please try again.');
      handleCloseDeleteDialog();
    }
  };

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <Head>
        <title>Role Management | Valluvar Vaasal</title>
        <meta name="description" content="Manage user roles for Valluvar Vaasal" />
      </Head>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <Box
          sx={{
            pt: { xs: 4, md: 6 },
            pb: { xs: 2, md: 3 },
            background: 'linear-gradient(135deg, rgba(255,248,225,1) 0%, rgba(255,236,179,0.8) 100%)',
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                fontSize: { xs: '2rem', md: '2.8rem' },
                mb: 2,
                color: theme.palette.secondary.dark
              }}
            >
              Role Management
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 3, fontFamily: '"Playfair Display", serif' }}>
                  Available Roles
                </Typography>

                {error && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                  </Typography>
                )}

                {loading ? (
                  <Typography>Loading roles...</Typography>
                ) : (
                  <List>
                    {roles.map((role) => (
                      <React.Fragment key={role.id}>
                        <ListItem
                          secondaryAction={
                            <IconButton
                              edge="end"
                              aria-label="delete"
                              onClick={() => handleOpenDeleteDialog(role)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={role.name}
                            secondary={role.description}
                            primaryTypographyProps={{
                              fontWeight: 600,
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                            secondaryTypographyProps={{
                              fontFamily: '"Cormorant Garamond", serif'
                            }}
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}

                    {roles.length === 0 && (
                      <Typography sx={{ py: 2, textAlign: 'center' }}>
                        No roles defined yet. Add your first role.
                      </Typography>
                    )}
                  </List>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 3, fontFamily: '"Playfair Display", serif' }}>
                  Add New Role
                </Typography>

                <form onSubmit={handleAddRole}>
                  <TextField
                    label="Role Name"
                    variant="outlined"
                    fullWidth
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    sx={{ mb: 3 }}
                    required
                  />

                  <TextField
                    label="Role Description"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    sx={{ mb: 3 }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    sx={{
                      fontFamily: '"Cinzel", serif',
                      textTransform: 'none'
                    }}
                  >
                    Add Role
                  </Button>
                </form>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Delete Role Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteRole} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
} 