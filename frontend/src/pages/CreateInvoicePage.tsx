import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, MenuItem, Button, Alert, CircularProgress, Divider, IconButton, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Product {
  id: number;
  item_name: string;
  unit_price: number;
  unit_of_measure: string;
}

interface InvoiceItem {
  id: string;
  product: string;
  quantity: string;
  unit_price: number;
  unit_of_measure: string;
  product_name: string;
}

const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    client_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    payment_type: 'cash'
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', product: '', quantity: '', unit_price: 0, unit_of_measure: '', product_name: '' }
  ]);
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    tax_amount: 0,
    total: 0
  });

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    // Calculate totals based on all items
    let subtotal = 0;
    items.forEach(item => {
      if (item.product && item.quantity) {
        const quantity = parseFloat(item.quantity);
        const unit_price = item.unit_price;
        subtotal += quantity * unit_price;
      }
    });
    const tax_amount = subtotal * 0.0;
    const total = subtotal + tax_amount;
    setCalculations({ subtotal, tax_amount, total });
  }, [items]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products/?is_active=true');
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setProducts(data);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const handleAddItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      product: '', 
      quantity: '', 
      unit_price: 0, 
      unit_of_measure: '', 
      product_name: '' 
    }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: string, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'product') {
          const product = products.find(p => p.id === parseInt(value));
          return {
            ...item,
            product: value,
            unit_price: product ? Number(product.unit_price) : 0,
            unit_of_measure: product ? product.unit_of_measure : '',
            product_name: product ? product.item_name : ''
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all items have product and quantity
    const invalidItems = items.filter(item => !item.product || !item.quantity);
    if (invalidItems.length > 0) {
      setError('Please fill in all product and quantity fields');
      return;
    }

    try {
      setLoading(true);
      // Create single invoice with multiple items
      const response = await axios.post('/invoices/', {
        client_name: formData.client_name,
        invoice_date: formData.invoice_date,
        payment_type: formData.payment_type,
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      });
      
      // Navigate to the created invoice
      navigate(`/invoices/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create invoice');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>Create New Invoice</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Client Name"
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Invoice Date"
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            fullWidth
            select
            label="Payment Type"
            value={formData.payment_type}
            onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
            margin="normal"
            required
          >
            <MenuItem value="cash">Cash</MenuItem>
            <MenuItem value="online">Online Payment</MenuItem>
          </TextField>

          <Divider sx={{ my: 3 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Invoice Items</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddItem} size="small">
              Add Item
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="40%"><strong>Product</strong></TableCell>
                  <TableCell width="20%"><strong>Quantity</strong></TableCell>
                  <TableCell width="20%" align="right"><strong>Unit Price</strong></TableCell>
                  <TableCell width="15%" align="right"><strong>Amount</strong></TableCell>
                  <TableCell width="5%" align="center"><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const itemAmount = item.quantity && item.unit_price 
                    ? parseFloat(item.quantity) * item.unit_price 
                    : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <TextField
                          fullWidth
                          select
                          size="small"
                          value={item.product}
                          onChange={(e) => handleItemChange(item.id, 'product', e.target.value)}
                          required
                        >
                          <MenuItem value="">Select Product</MenuItem>
                          {products.map((product) => (
                            <MenuItem key={product.id} value={product.id}>
                              {product.item_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          inputProps={{ min: 0.01, step: 0.01 }}
                          helperText={item.unit_of_measure}
                          required
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography>₹{Number(item.unit_price).toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography>₹{itemAmount.toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" mb={2}>Invoice Calculation</Typography>

          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography color="text.secondary">Subtotal:</Typography>
            <Typography>₹{Number(calculations.subtotal).toFixed(2)}</Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography color="text.secondary">Tax (0%):</Typography>
            <Typography>₹{Number(calculations.tax_amount).toFixed(2)}</Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between" mb={3}>
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" color="primary">₹{Number(calculations.total).toFixed(2)}</Typography>
          </Box>

          <Box display="flex" gap={2}>
            <Button variant="outlined" onClick={() => navigate('/invoices')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Create Invoice'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CreateInvoicePage;
