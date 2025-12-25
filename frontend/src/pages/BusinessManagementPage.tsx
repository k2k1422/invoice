import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Autocomplete,
  AppBar,
  Toolbar,
  Menu,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BusinessIcon from '@mui/icons-material/Business';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Business {
  id: number;
  name: string;
  description: string;
  members?: Member[];
  member_count?: number;
  user_role?: string;
}

interface Member {
  id: number;
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'member';
  created_at: string;
}

interface UserOption {
  id: number;
  username: string;
  email: string;
  full_name: string;
}

const BusinessManagementPage: React.FC = () => {
  const { user, refreshBusinesses, logout } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Form states
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessDescription, setNewBusinessDescription] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/businesses/');
      // Handle paginated response - data is in results field
      const data = response.data.results || response.data;
      // Ensure we always set an array
      if (Array.isArray(data)) {
        setBusinesses(data);
      } else {
        console.error('Businesses API returned non-array:', response.data);
        setBusinesses([]);
      }
      setError(null);
    } catch (err: any) {
      setError('Failed to load businesses: ' + (err.response?.data?.detail || err.message));
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessDetails = async (businessId: number) => {
    try {
      const response = await axios.get(`/businesses/${businessId}/`);
      return response.data;
    } catch (err: any) {
      setError('Failed to load business details: ' + (err.response?.data?.detail || err.message));
      return null;
    }
  };

  useEffect(() => {
    if (user?.is_superuser) {
      fetchBusinesses();
    }
  }, [user]);

  const handleCreateBusiness = async () => {
    try {
      const response = await axios.post('/businesses/', {
        name: newBusinessName,
        description: newBusinessDescription,
      });
      console.log('Business created:', response.data);
      setSuccess('Business created successfully!');
      setCreateDialogOpen(false);
      setNewBusinessName('');
      setNewBusinessDescription('');
      // Refresh both local and global business lists
      await fetchBusinesses();
      await refreshBusinesses();
    } catch (err: any) {
      console.error('Create business error:', err.response?.data);
      setError('Failed to create business: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteBusiness = async (businessId: number) => {
    if (!window.confirm('Are you sure you want to delete this business?')) return;

    try {
      await axios.delete(`/businesses/${businessId}/`);
      setSuccess('Business deleted successfully!');
      await fetchBusinesses();
      await refreshBusinesses();
    } catch (err: any) {
      setError('Failed to delete business: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenAddMember = async (business: Business) => {
    const details = await fetchBusinessDetails(business.id);
    if (details) {
      setSelectedBusiness(details);
      setAddMemberDialogOpen(true);
      // Load initial users when dialog opens
      searchUsers('');
    }
  };

  const searchUsers = async (query: string) => {
    try {
      setUserSearchLoading(true);
      const response = await axios.get('/users/', {
        params: {
          search: query,
          page_size: 10
        }
      });
      const users = response.data.results || response.data;
      if (Array.isArray(users)) {
        setUserOptions(users.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          full_name: u.full_name || u.username
        })));
      }
    } catch (err: any) {
      console.error('Failed to search users:', err);
      setUserOptions([]);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedBusiness || !selectedUser) return;

    try {
      await axios.post(`/businesses/${selectedBusiness.id}/add_member/`, {
        user_id: selectedUser.id,
        role: newMemberRole,
      });
      setSuccess('Member added successfully!');
      setAddMemberDialogOpen(false);
      setSelectedUser(null);
      setNewMemberRole('member');
      await fetchBusinesses();
      
      // Refresh the selected business details
      const details = await fetchBusinessDetails(selectedBusiness.id);
      if (details) {
        setSelectedBusiness(details);
      }
    } catch (err: any) {
      setError('Failed to add member: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRemoveMember = async (businessId: number, userId: number) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await axios.delete(`/businesses/${businessId}/remove_member/${userId}/`);
      setSuccess('Member removed successfully!');
      
      // Refresh the selected business details
      if (selectedBusiness && selectedBusiness.id === businessId) {
        const details = await fetchBusinessDetails(businessId);
        if (details) {
          setSelectedBusiness(details);
        }
      }
      await fetchBusinesses();
    } catch (err: any) {
      setError('Failed to remove member: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateRole = async (businessId: number, userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';

    try {
      await axios.patch(`/businesses/${businessId}/update_role/${userId}/`, {
        role: newRole,
      });
      setSuccess('Role updated successfully!');
      
      // Refresh the selected business details
      if (selectedBusiness && selectedBusiness.id === businessId) {
        const details = await fetchBusinessDetails(businessId);
        if (details) {
          setSelectedBusiness(details);
        }
      }
      await fetchBusinesses();
    } catch (err: any) {
      setError('Failed to update role: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSelectBusiness = async (businessId: number) => {
    try {
      await axios.post(`/businesses/${businessId}/select/`);
      setSuccess('Business selected! Redirecting to home...');
      
      // Refresh the business context
      await refreshBusinesses();
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setError('Failed to select business: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleChangePassword = () => {
    navigate('/change-password');
    handleMenuClose();
  };

  if (!user?.is_superuser) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          You do not have permission to access this page. Only superusers can manage businesses.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Invoice Management System
          </Typography>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <AccountCircleIcon />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {user?.username}
            </Typography>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { navigate('/business/select'); handleMenuClose(); }}>
              Business Selection
            </MenuItem>
            <MenuItem onClick={handleChangePassword}>Change Password</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ mt: 10, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" component="h1">
              Business Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Business
            </Button>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Members</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(businesses) && businesses.map((business) => (
                <TableRow key={business.id}>
                  <TableCell>{business.name}</TableCell>
                  <TableCell>{business.description || '-'}</TableCell>
                  <TableCell align="center">{business.member_count || 0}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<BusinessIcon />}
                      onClick={() => handleSelectBusiness(business.id)}
                      sx={{ mr: 1 }}
                    >
                      Select
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleOpenAddMember(business)}
                      sx={{ mr: 1 }}
                    >
                      Manage
                    </Button>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteBusiness(business.id)}
                      title="Delete Business"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {(!Array.isArray(businesses) || businesses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No businesses found. Create your first business!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create Business Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Business</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Business Name"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Description"
                value={newBusinessDescription}
                onChange={(e) => setNewBusinessDescription(e.target.value)}
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateBusiness}
              variant="contained"
              disabled={!newBusinessName.trim()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Manage Members - {selectedBusiness?.name}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {/* Current Members */}
              {selectedBusiness?.members && selectedBusiness.members.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Current Members
                  </Typography>
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Username</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Full Name</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedBusiness.members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>{member.username}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>{member.full_name}</TableCell>
                            <TableCell>
                              <Chip
                                label={member.role}
                                color={member.role === 'admin' ? 'primary' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateRole(selectedBusiness.id, member.user_id, member.role)}
                                title={`Change to ${member.role === 'admin' ? 'member' : 'admin'}`}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveMember(selectedBusiness.id, member.user_id)}
                                title="Remove member"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Add New Member */}
              <Typography variant="h6" gutterBottom>
                Add New Member
              </Typography>
              <Box display="flex" gap={2} alignItems="flex-start">
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={userOptions}
                  getOptionLabel={(option) => `${option.username} (${option.email})`}
                  loading={userSearchLoading}
                  value={selectedUser}
                  onChange={(event, newValue) => setSelectedUser(newValue)}
                  onInputChange={(event, value) => {
                    if (event) {
                      searchUsers(value);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search User"
                      placeholder="Type username or email"
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {userSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2">{option.username}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.email} - {option.full_name}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={newMemberRole}
                    label="Role"
                    onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
                  >
                    <MenuItem value="member">Member</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={handleAddMember}
                  disabled={!selectedUser}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddMemberDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
    </>
  );
};

export default BusinessManagementPage;
