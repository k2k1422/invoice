import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem, TextField, CircularProgress, Alert, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Deposit {
  id: number;
  amount: number;
  deposit_date: string;
  description: string;
  user_username: string;
  user_full_name: string;
}

interface DepositStats {
  total_count: number;
  total_amount: number;
  users: Array<{ user__id: number; user__username: string }>;
}

const DepositsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [stats, setStats] = useState<DepositStats>({ total_count: 0, total_amount: 0, users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ user_id: 'all', date_range: '30', from_date: '', to_date: '' });

  useEffect(() => { 
    fetchDeposits(); 
    if (user?.is_staff) fetchStats(); 
  }, [filters]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (user?.is_staff) {
        if (filters.user_id !== 'all') params.user_id = filters.user_id;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.date_range !== 'all' && !filters.from_date && !filters.to_date) params.date_range = filters.date_range;
      }
      const response = await axios.get('/deposits/', { params });
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setDeposits(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params: any = {};
      if (filters.user_id !== 'all') params.user_id = filters.user_id;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.date_range !== 'all' && !filters.from_date && !filters.to_date) params.date_range = filters.date_range;
      
      const response = await axios.get('/deposits/stats/', { params });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch deposit stats:', err);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Deposits</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/deposits/create')}>
          Add Deposit
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {user?.is_staff && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" mb={2}>Filters</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              select
              label="User"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="all">All Users</MenuItem>
              {stats.users.map((u) => (
                <MenuItem key={u.user__id} value={u.user__id}>
                  {u.user__username}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Date Range"
              value={filters.date_range}
              onChange={(e) => setFilters({ ...filters, date_range: e.target.value, from_date: '', to_date: '' })}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="all">All time</MenuItem>
            </TextField>

            <TextField
              label="From Date"
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value, date_range: '' })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />

            <TextField
              label="To Date"
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value, date_range: '' })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Box>

          <Box mt={2} p={2} bgcolor="primary.main" color="white" borderRadius={1}>
            <Typography variant="h5">Total Deposits: ₹{Number(stats.total_amount).toFixed(2)}</Typography>
            <Typography variant="body2">Total Count: {stats.total_count}</Typography>
          </Box>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Date</strong></TableCell>
              {user?.is_staff && <TableCell><strong>User</strong></TableCell>}
              <TableCell align="right"><strong>Amount</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deposits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user?.is_staff ? 4 : 3} align="center">
                  <Typography color="text.secondary">No deposits found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              deposits.map((deposit) => (
                <TableRow key={deposit.id} hover>
                  <TableCell>{new Date(deposit.deposit_date).toLocaleDateString()}</TableCell>
                  {user?.is_staff && (
                    <TableCell>
                      <Chip label={deposit.user_full_name || deposit.user_username} size="small" />
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <Typography fontWeight="bold" color="primary">
                      ₹{Number(deposit.amount).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>{deposit.description || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DepositsPage;
