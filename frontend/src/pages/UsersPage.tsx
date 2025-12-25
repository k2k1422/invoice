import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress, IconButton, Tooltip, AppBar, Toolbar, Menu, MenuItem, Container } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  must_change_password: boolean;
  date_joined: string;
}

interface UserStats {
  total_users: number;
  active_users: number;
  staff_users: number;
  users_need_password_change: number;
}

const UsersPage: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({ total_users: 0, active_users: 0, staff_users: 0, users_need_password_change: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formData, setFormData] = useState({ username: '', email: '', first_name: '', last_name: '', is_staff: false });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => { fetchUsers(); fetchStats(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/users/');
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/users/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post('/users/', formData);
      setSuccess('User created successfully! Default password: Welcome@123');
      fetchUsers();
      fetchStats();
      setOpenDialog(false);
      setFormData({ username: '', email: '', first_name: '', last_name: '', is_staff: false });
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    try {
      await axios.post(`/users/${userId}/reset_password/`);
      setSuccess(`Password reset for ${username}. New password: Welcome@123`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      await axios.post(`/users/${userId}/toggle_status/`);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle user status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await axios.delete(`/users/${userToDelete.id}/`);
      fetchUsers();
      fetchStats();
      setDeleteDialog(false);
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user');
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

  if (!currentUser?.is_staff) return <Alert severity="error">Access Denied - Business Admin Only</Alert>;
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

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
              {currentUser?.username}
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
            <Typography variant="h4">User Management</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>Create User</Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box display="flex" gap={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="h6">{stats.total_users}</Typography><Typography variant="body2" color="text.secondary">Total Users</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="h6">{stats.active_users}</Typography><Typography variant="body2" color="text.secondary">Active Users</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="h6">{stats.staff_users}</Typography><Typography variant="body2" color="text.secondary">Staff Users</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="h6" color="warning">{stats.users_need_password_change}</Typography><Typography variant="body2" color="text.secondary">Need Password Change</Typography></Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell align="center"><strong>User Type</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Password Change</strong></TableCell>
              <TableCell><strong>Joined</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id;
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.first_name} {user.last_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell align="center">
                    {user.is_superuser ? (
                      <Chip label="Superuser" color="error" size="small" />
                    ) : user.is_staff ? (
                      <Chip label="Business Admin" color="primary" size="small" />
                    ) : (
                      <Chip label="Staff" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">{user.is_active ? <Chip label="Active" color="success" size="small" /> : <Chip label="Inactive" color="default" size="small" />}</TableCell>
                  <TableCell align="center">{user.must_change_password && <Chip label="Required" color="warning" size="small" />}</TableCell>
                  <TableCell>{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={isSelf ? "Cannot reset own password" : "Reset Password"}>
                      <span><IconButton size="small" onClick={() => handleResetPassword(user.id, user.username)} disabled={isSelf}><LockResetIcon fontSize="small" /></IconButton></span>
                    </Tooltip>
                    <Tooltip title={isSelf ? "Cannot modify own status" : user.is_active ? "Disable User" : "Enable User"}>
                      <span><IconButton size="small" onClick={() => handleToggleStatus(user.id)} disabled={isSelf}>{user.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}</IconButton></span>
                    </Tooltip>
                    <Tooltip title={isSelf ? "Cannot delete own account" : "Delete User"}>
                      <span><IconButton size="small" color="error" onClick={() => { setUserToDelete(user); setDeleteDialog(true); }} disabled={isSelf}><DeleteIcon fontSize="small" /></IconButton></span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>Default password will be: <strong>Welcome@123</strong></Alert>
          <TextField fullWidth label="Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} margin="normal" required />
          <TextField fullWidth label="First Name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} margin="normal" />
          <TextField fullWidth label="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} margin="normal" />
          <TextField fullWidth select label="Role" value={formData.is_staff ? 'staff' : 'user'} onChange={(e) => setFormData({ ...formData, is_staff: e.target.value === 'staff' })} margin="normal" SelectProps={{ native: true }}>
            <option value="user">Staff</option>
            <option value="staff">Business Admin</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete user <strong>{userToDelete?.username}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Container>
    </>
  );
};

export default UsersPage;
