import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, MenuItem, TextField, CircularProgress, Alert, Grid, Card, CardContent } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface User {
  user__id: number;
  user__username: string;
}

interface AuditData {
  labels: string[];
  deposits: number[];
  invoices: number[];
  summary: {
    total_deposits: number;
    total_invoices: number;
    difference: number;
    deposit_count: number;
    invoice_count: number;
  };
}

const AuditPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({
    date_range: '30',
    from_date: '',
    to_date: '',
    payment_type: 'cash',
    user: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchAuditData();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/deposits/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const params: any = {
        payment_type: filters.payment_type
      };
      
      if (filters.user) params.user = filters.user;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (!filters.from_date && !filters.to_date) params.date_range = filters.date_range;
      
      const response = await axios.get('/audit/comparison/', { params });
      setData(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.is_staff) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="error">You don't have permission to access this page.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const chartData = data ? {
    labels: data.labels,
    datasets: [
      {
        label: 'Deposits',
        data: data.deposits,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      },
      {
        label: `Invoices (${filters.payment_type === 'total' ? 'All' : filters.payment_type})`,
        data: data.invoices,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        fill: true
      }
    ]
  } : { labels: [], datasets: [] };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Deposits vs Invoices Comparison'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ₹';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '₹' + value;
          }
        }
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>Audit - Financial Comparison</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={2}>Filters</Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            select
            label="User"
            value={filters.user}
            onChange={(e) => setFilters({ ...filters, user: e.target.value })}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">All Users</MenuItem>
            {users.filter(u => u.user__id).map((u) => (
              <MenuItem key={u.user__id} value={String(u.user__id)}>
                {u.user__username}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Payment Type"
            value={filters.payment_type}
            onChange={(e) => setFilters({ ...filters, payment_type: e.target.value })}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="cash">Cash Payment</MenuItem>
            <MenuItem value="online">Online Payment</MenuItem>
            <MenuItem value="total">Total Payment</MenuItem>
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
            <MenuItem value="180">Last 6 months</MenuItem>
            <MenuItem value="365">Last year</MenuItem>
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
      </Paper>

      {data && (
        <>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }} gap={2} mb={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Deposits</Typography>
                <Typography variant="h5" color="success.main">
                  ₹{data.summary.total_deposits.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.summary.deposit_count} transactions
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Invoices</Typography>
                <Typography variant="h5" color="error.main">
                  ₹{data.summary.total_invoices.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.summary.invoice_count} invoices
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Difference</Typography>
                <Typography variant="h5" color={data.summary.difference >= 0 ? 'success.main' : 'error.main'}>
                  ₹{data.summary.difference.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.summary.difference >= 0 ? 'Surplus' : 'Deficit'}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Recovery Rate</Typography>
                <Typography variant="h5" color="primary">
                  {data.summary.total_invoices > 0 
                    ? ((data.summary.total_deposits / data.summary.total_invoices) * 100).toFixed(1)
                    : '0'}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deposits / Invoices
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Paper sx={{ p: 2 }}>
            <Box height={400}>
              <Line data={chartData} options={chartOptions} />
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AuditPage;
