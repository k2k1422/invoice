import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateDepositPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    deposit_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/deposits/', {
        amount: formData.amount,
        deposit_date: formData.deposit_date,
        description: formData.description
      });
      
      navigate('/deposits');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create deposit');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>Add New Deposit</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            margin="normal"
            required
            inputProps={{ min: 0.01, step: 0.01 }}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>
            }}
          />

          <TextField
            fullWidth
            label="Deposit Date"
            type="date"
            value={formData.deposit_date}
            onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            fullWidth
            label="Description (Optional)"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
          />

          <Box display="flex" gap={2} mt={3}>
            <Button variant="outlined" onClick={() => navigate('/deposits')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Add Deposit'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CreateDepositPage;
