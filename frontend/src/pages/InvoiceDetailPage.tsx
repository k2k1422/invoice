import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert, Divider, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface InvoiceItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_of_measure: string;
  line_total: number;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  client_name: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  invoice_date: string;
  user_username: string;
  payment_type: string;
}

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchInvoice(); }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/invoices/${id}/`);
      setInvoice(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!invoice) return <Alert severity="warning">Invoice not found</Alert>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} className="no-print">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')}>Back to Invoices</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Print Invoice</Button>
      </Box>

      <Paper sx={{ p: 4, maxWidth: 800, margin: '0 auto' }} className="print-section">
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" fontWeight="bold">INVOICE</Typography>
          <Typography variant="h6" color="primary" mt={1}>{invoice.invoice_number}</Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" mb={4}>
          <Box>
            <Typography variant="body2" color="text.secondary">Invoice Date:</Typography>
            <Typography variant="body1">{new Date(invoice.invoice_date).toLocaleDateString()}</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">Payment Type:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {invoice.payment_type === 'cash' ? 'Cash' : 'Online Payment'}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">Issued By:</Typography>
            <Typography variant="body1">{invoice.user_username}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box mb={4}>
          <Typography variant="body2" color="text.secondary" mb={1}>Bill To:</Typography>
          <Typography variant="h6">{invoice.client_name}</Typography>
        </Box>

        <Table sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell><strong>Product</strong></TableCell>
              <TableCell align="right"><strong>Quantity</strong></TableCell>
              <TableCell align="right"><strong>Unit Price</strong></TableCell>
              <TableCell align="right"><strong>Amount</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell align="right">{Number(item.quantity)} {item.unit_of_measure}</TableCell>
                <TableCell align="right">₹{Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell align="right">₹{Number(item.line_total).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
          <Box display="flex" justifyContent="space-between" width={300}>
            <Typography>Subtotal:</Typography>
            <Typography>₹{Number(invoice.subtotal).toFixed(2)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" width={300}>
            <Typography>Tax (0%):</Typography>
            <Typography>₹{Number(invoice.tax_amount).toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ width: 300 }} />
          <Box display="flex" justifyContent="space-between" width={300}>
            <Typography variant="h6" fontWeight="bold">Total:</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">₹{Number(invoice.total).toFixed(2)}</Typography>
          </Box>
        </Box>

        <Box mt={6} pt={3} borderTop="1px solid #e0e0e0">
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Thank you for your business!
          </Typography>
        </Box>
      </Paper>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { box-shadow: none !important; }
          body { margin: 0; padding: 20px; }
          
          /* Hide all non-invoice elements when printing */
          header, nav, aside, footer { display: none !important; }
          .MuiAppBar-root { display: none !important; }
          .MuiDrawer-root { display: none !important; }
          
          /* Full width for invoice */
          .print-section {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 40px !important;
          }
          
          /* Optimize for printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </Box>
  );
};

export default InvoiceDetailPage;
