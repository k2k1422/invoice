import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Container } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser, mustChangePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/auth/change_password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.old_password?.[0] || err.response?.data?.new_password?.[0] || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>Change Password</Typography>
            {mustChangePassword && (<Alert severity="warning" sx={{ mb: 2 }}>You must change your password before continuing.</Alert>)}
            {error && (<Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>)}
            <form onSubmit={handleSubmit}>
              <TextField fullWidth label="Current Password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} margin="normal" required />
              <TextField fullWidth label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} margin="normal" required />
              <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3 }}>{loading ? 'Changing...' : 'Change Password'}</Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ChangePasswordPage;
