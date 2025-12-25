import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem, TextField, Alert, CircularProgress, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  items: Array<{ product_name: string; quantity: number }>;
  total: number;
  invoice_date: string;
  user: number;
  payment_type: string;
}

interface InvoiceStats {
  total_count: number;
  total_amount: number;
  users: Array<{ id: number; username: string }>;
}

const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({ total_count: 0, total_amount: 0, users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ user_id: 'all', date_range: '30', from_date: '', to_date: '' });

  useEffect(() => { fetchInvoices(); if (user?.is_staff) fetchStats(); }, [filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (user?.is_staff) {
        if (filters.user_id !== 'all') params.user_id = filters.user_id;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.date_range !== 'all' && !filters.from_date && !filters.to_date) params.date_range = filters.date_range;
      }
      const response = await axios.get('/invoices/', { params });
      // Handle both array and paginated response
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setInvoices(data);
      setError('');
    } catch (err: any) {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/invoices/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Invoices</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/invoices/create')}>Create Invoice</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {user?.is_staff && (
        <>
          <Box display="flex" gap={2} mb={3}>
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="h6">{stats.total_count}</Typography>
              <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="h6">₹{stats.total_amount.toFixed(2)}</Typography>
              <Typography variant="body2" color="text.secondary">Total Amount</Typography>
            </Paper>
          </Box>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" mb={2}>Filter Invoices</Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField select label="User" value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })} sx={{ minWidth: 200 }}>
                <MenuItem value="all">All Users</MenuItem>
                {stats.users.map((u) => (<MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>))}
              </TextField>
              <TextField select label="Date Range" value={filters.date_range} onChange={(e) => setFilters({ ...filters, date_range: e.target.value, from_date: '', to_date: '' })} sx={{ minWidth: 200 }}>
                <MenuItem value="7">Last 7 Days</MenuItem>
                <MenuItem value="30">Last 30 Days</MenuItem>
                <MenuItem value="60">Last 60 Days</MenuItem>
                <MenuItem value="90">Last 90 Days</MenuItem>
                <MenuItem value="180">Last 180 Days</MenuItem>
                <MenuItem value="365">Last Year</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </TextField>
              <TextField
                label="From Date"
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters({ ...filters, from_date: e.target.value, date_range: 'all' })}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="To Date"
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters({ ...filters, to_date: e.target.value, date_range: 'all' })}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              {(filters.from_date || filters.to_date) && (
                <Button variant="outlined" onClick={() => setFilters({ ...filters, from_date: '', to_date: '', date_range: '30' })} sx={{ alignSelf: 'center' }}>
                  Clear Dates
                </Button>
              )}
            </Box>
          </Paper>
        </>
      )}

      {!user?.is_staff && <Alert severity="info" sx={{ mb: 2 }}>Showing your invoices only. Contact Business Admin for full access.</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Invoice Number</strong></TableCell>
              <TableCell><strong>Client Name</strong></TableCell>
              <TableCell><strong>Items</strong></TableCell>
              <TableCell><strong>Payment</strong></TableCell>
              <TableCell align="right"><strong>Total (₹)</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => {
              const itemsCount = invoice.items?.length || 0;
              const firstItem = invoice.items?.[0];
              return (
                <TableRow key={invoice.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${invoice.id}`)}>
                  <TableCell><Chip label={invoice.invoice_number} color="primary" /></TableCell>
                  <TableCell>{invoice.client_name}</TableCell>
                  <TableCell>
                    {itemsCount === 1 ? firstItem?.product_name : `${itemsCount} items`}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={invoice.payment_type === 'cash' ? 'Cash' : 'Online'} 
                      color={invoice.payment_type === 'cash' ? 'default' : 'success'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="right">₹{Number(invoice.total).toFixed(2)}</TableCell>
                  <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InvoicesPage;
