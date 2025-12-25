import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from '../contexts/AuthContext';

const BusinessSelection: React.FC = () => {
  const { businesses, selectBusiness, isLoading, refreshBusinesses, user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    refreshBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-select business for regular users (non-superuser, non-staff) with only one business
  useEffect(() => {
    if (!isLoading && businesses && !user?.is_superuser && !user?.is_staff) {
      const businessList = Array.isArray(businesses) ? businesses : [];
      if (businessList.length === 1) {
        handleSelectBusiness(businessList[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, isLoading, user]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleChangePassword = () => {
    navigate('/change-password');
    handleMenuClose();
  };

  const handleSelectBusiness = async (businessId: number) => {
    try {
      await selectBusiness(businessId);
      navigate('/');
    } catch (error) {
      console.error('Failed to select business:', error);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Ensure businesses is always an array
  const businessList = Array.isArray(businesses) ? businesses : [];

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Invoice Management System
          </Typography>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <AccountCircleIcon />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {user?.username}
            </Typography>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleChangePassword}>Change Password</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Box sx={{ mt: 10, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Select a Business
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Choose a business to continue
        </Typography>

        {/* Admin Controls */}
        {(user?.is_superuser || user?.is_staff) && (
          <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {user?.is_superuser && (
              <Button 
                variant="outlined" 
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/businesses')}
              >
                Manage Businesses
              </Button>
            )}
            {user?.is_staff && (
              <Button 
                variant="outlined" 
                startIcon={<PeopleIcon />}
                onClick={() => navigate('/users')}
              >
                Manage Users
              </Button>
            )}
          </Box>
        )}

        {businessList.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body1" align="center" gutterBottom>
                You do not have access to any businesses.
              </Typography>
              {user?.is_superuser && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => navigate('/businesses')}
                  >
                    Create Your First Business
                  </Button>
                </Box>
              )}
              {!user?.is_superuser && (
                <Typography variant="body2" align="center" color="text.secondary" mt={2}>
                  Please contact an administrator.
                </Typography>
              )}
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={3}>
            {businessList.map((business) => (
              <Card 
                key={business.id}
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                  },
                }}
                onClick={() => handleSelectBusiness(business.id)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h5" component="h2">
                      {business.name}
                    </Typography>
                  </Box>
                  {business.description && (
                    <Typography variant="body2" color="text.secondary">
                      {business.description}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    variant="contained" 
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBusiness(business.id);
                    }}
                  >
                    Select Business
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Container>
    </>
  );
};

export default BusinessSelection;
