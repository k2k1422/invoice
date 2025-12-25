import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: number;
  item_name: string;
  description: string;
  unit_of_measure: string;
  unit_price: number;
  is_active: boolean;
  quantity_in_stock: number;
}

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ item_name: '', description: '', unit_of_measure: '', unit_price: '', is_active: true });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/products/');
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setProducts(data);
      setError('');
    } catch (err: any) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ item_name: product.item_name, description: product.description, unit_of_measure: product.unit_of_measure, unit_price: product.unit_price.toString(), is_active: product.is_active });
    } else {
      setEditingProduct(null);
      setFormData({ item_name: '', description: '', unit_of_measure: '', unit_price: '', is_active: true });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingProduct) {
        await axios.put(`/products/${editingProduct.id}/`, formData);
      } else {
        await axios.post('/products/', formData);
      }
      fetchProducts();
      setOpenDialog(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await axios.delete(`/products/${productToDelete.id}/`);
        fetchProducts();
        setDeleteDialogOpen(false);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete product');
      }
    }
  };

  const getStockColor = (stock: number) => stock < 10 ? 'error' : stock < 50 ? 'warning' : 'success';

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Products</Typography>
        {user?.is_staff && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Add Product</Button>}
      </Box>
      {!user?.is_staff && <Alert severity="info" sx={{ mb: 2 }}>View Only - Contact admin to add or edit products</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Product Name</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Unit</strong></TableCell>
              <TableCell align="right"><strong>Price (₹)</strong></TableCell>
              <TableCell align="center"><strong>Stock</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
              {user?.is_staff && <TableCell align="center"><strong>Actions</strong></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">No products found</TableCell></TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.item_name}</TableCell>
                  <TableCell>{product.description || '-'}</TableCell>
                  <TableCell>{product.unit_of_measure}</TableCell>
                  <TableCell align="right">₹{Number(product.unit_price).toFixed(2)}</TableCell>
                  <TableCell align="center"><Chip label={Number(product.quantity_in_stock).toFixed(2)} color={getStockColor(product.quantity_in_stock)} size="small" /></TableCell>
                  <TableCell align="center"><Chip label={product.is_active ? 'Active' : 'Inactive'} color={product.is_active ? 'success' : 'default'} size="small" /></TableCell>
                  {user?.is_staff && (
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleOpenDialog(product)} color="primary"><EditIcon /></IconButton>
                      <IconButton size="small" onClick={() => { setProductToDelete(product); setDeleteDialogOpen(true); }} color="error"><DeleteIcon /></IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Product Name" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} margin="normal" multiline rows={3} />
          <TextField fullWidth label="Unit of Measure" value={formData.unit_of_measure} onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })} margin="normal" placeholder="e.g., pcs, kg, liter" required />
          <TextField fullWidth label="Unit Price (₹)" type="number" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} margin="normal" required />
          <TextField fullWidth select label="Status" value={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })} margin="normal">
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">{editingProduct ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete "{productToDelete?.item_name}"?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage;
