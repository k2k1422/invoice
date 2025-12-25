import React from 'react';
import { Typography, Box, Paper, Stack } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Welcome, {user?.full_name || user?.username}!
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 2 }}>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6">Products</Typography>
          <Typography variant="body2">Manage your product catalog</Typography>
        </Paper>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6">Inventory</Typography>
          <Typography variant="body2">Track stock movements</Typography>
        </Paper>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6">Invoices</Typography>
          <Typography variant="body2">Create and manage invoices</Typography>
        </Paper>
      </Stack>
    </Box>
  );
};

export default DashboardPage;
