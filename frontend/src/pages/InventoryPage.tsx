import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  unit_price: number;
  stock: number;
  stock_status: string;
}

interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  movement_type: string;
  quantity: number;
  movement_date: string;
  notes: string;
  created_by_username: string;
}

interface Product {
  id: number;
  item_name: string;
}

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({ total_products: 0, low_stock_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({ product: '', movement_type: 'IN', quantity: '', movement_date: new Date().toISOString().split('T')[0], notes: '' });

  useEffect(() => { fetchInventory(); fetchProducts(); }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/inventory/overview/');
      setInventory(response.data.products || []);
      setMovements(response.data.recent_movements || []);
      setStats(response.data.stats || { total_products: 0, low_stock_count: 0 });
      setError('');
    } catch (err: any) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products/?is_active=true');
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products');
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post('/stock-movements/', formData);
      fetchInventory();
      setOpenDialog(false);
      setFormData({ product: '', movement_type: 'IN', quantity: '', movement_date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add stock movement');
    }
  };

  const getStockChipColor = (status: string) => {
    if (status === 'low') return 'error';
    if (status === 'medium') return 'warning';
    return 'success';
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Inventory Management</Typography>
        {user?.is_staff && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>Add Stock Movement</Button>}
      </Box>

      {!user?.is_staff && <Alert severity="info" sx={{ mb: 2 }}>View Only - Contact admin to add stock movements</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box display="flex" gap={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">{stats.total_products}</Typography>
          <Typography variant="body2" color="text.secondary">Total Products</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" color="error">{stats.low_stock_count}</Typography>
          <Typography variant="body2" color="text.secondary">Low Stock Items</Typography>
        </Paper>
      </Box>

      <Typography variant="h6" mb={2}>Stock Levels</Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Product Name</strong></TableCell>
              <TableCell><strong>Unit</strong></TableCell>
              <TableCell align="right"><strong>Price (₹)</strong></TableCell>
              <TableCell align="center"><strong>Current Stock</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell align="right">₹{Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell align="center">{Number(item.stock).toFixed(2)}</TableCell>
                <TableCell align="center"><Chip label={item.stock_status.toUpperCase()} color={getStockChipColor(item.stock_status)} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" mb={2}>Recent Stock Movements (Last 50)</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Product</strong></TableCell>
              <TableCell align="center"><strong>Type</strong></TableCell>
              <TableCell align="right"><strong>Quantity</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Notes</strong></TableCell>
              <TableCell><strong>Created By</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>{movement.product_name}</TableCell>
                <TableCell align="center"><Chip label={movement.movement_type} color={movement.movement_type === 'IN' ? 'success' : 'warning'} size="small" /></TableCell>
                <TableCell align="right">{Number(movement.quantity)}</TableCell>
                <TableCell>{new Date(movement.movement_date).toLocaleDateString()}</TableCell>
                <TableCell>{movement.notes || '-'}</TableCell>
                <TableCell>{movement.created_by_username}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Stock Movement</DialogTitle>
        <DialogContent>
          <TextField fullWidth select label="Product" value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} margin="normal" required>
            {products.map((product) => (<MenuItem key={product.id} value={product.id}>{product.item_name}</MenuItem>))}
          </TextField>
          <TextField fullWidth select label="Movement Type" value={formData.movement_type} onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })} margin="normal">
            <MenuItem value="IN">Incoming (IN)</MenuItem>
            <MenuItem value="OUT">Outgoing (OUT)</MenuItem>
          </TextField>
          <TextField fullWidth label="Quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Movement Date" type="date" value={formData.movement_date} onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })} margin="normal" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} margin="normal" multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Add Movement</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryPage;
