import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import BusinessSelection from './pages/BusinessSelection';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import InvoicesPage from './pages/InvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import DepositsPage from './pages/DepositsPage';
import CreateDepositPage from './pages/CreateDepositPage';
import UsersPage from './pages/UsersPage';
import BusinessManagementPage from './pages/BusinessManagementPage';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#333333',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
  },
});

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Password Change Route (required for new users) */}
      <Route
        path="/change-password"
        element={
          <PrivateRoute>
            <ChangePasswordPage />
          </PrivateRoute>
        }
      />

      {/* Business Selection Route */}
      <Route
        path="/business/select"
        element={
          <PrivateRoute>
            <BusinessSelection />
          </PrivateRoute>
        }
      />

      {/* Business Management Route - No business required for superusers */}
      <Route
        path="/businesses"
        element={
          <PrivateRoute requirePasswordChange={true}>
            <BusinessManagementPage />
          </PrivateRoute>
        }
      />

      {/* User Management Route - No business required for staff */}
      <Route
        path="/users"
        element={
          <PrivateRoute requirePasswordChange={true}>
            <UsersPage />
          </PrivateRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute requirePasswordChange={true} requireBusiness={true}>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/create" element={<CreateInvoicePage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="deposits" element={<DepositsPage />} />
        <Route path="deposits/create" element={<CreateDepositPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
