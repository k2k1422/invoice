import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  current_business_role: 'admin' | 'member' | null;
  profile: {
    must_change_password: boolean;
  };
}

interface Business {
  id: number;
  name: string;
  description: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  mustChangePassword: boolean;
  currentBusiness: Business | null;
  businesses: Business[];
  selectBusiness: (businessId: number) => Promise<void>;
  refreshBusinesses: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Logout callback for axios interceptor
let logoutCallback: (() => void) | null = null;
let isRefreshing = false;

// Configure axios defaults
axios.defaults.baseURL = '/api';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true; // Enable sending cookies with requests

// Add axios interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add axios interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Already refreshing, just reject to avoid loop
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        // No refresh token, trigger logout
        isRefreshing = false;
        if (logoutCallback) {
          logoutCallback();
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/token/refresh/', {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        isRefreshing = false;
        
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, trigger logout via callback
        isRefreshing = false;
        if (logoutCallback) {
          logoutCallback();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setCurrentBusiness(null);
    setBusinesses([]);
    setIsLoading(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Register logout callback for interceptor
  useEffect(() => {
    logoutCallback = logout;
    return () => {
      logoutCallback = null;
    };
  }, [logout]);

  const fetchUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get('/auth/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Interceptor will handle logout
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await axios.get('/businesses/');
      // Handle paginated response - data is in results field
      const data = response.data.results || response.data;
      // Ensure we always set an array
      if (Array.isArray(data)) {
        setBusinesses(data);
      } else {
        console.error('Businesses API returned non-array:', response.data);
        setBusinesses([]);
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      setBusinesses([]);
    }
  };

  const fetchCurrentBusiness = async () => {
    try {
      const response = await axios.get('/businesses/current/');
      // Handle 204 No Content (no business selected)
      if (response.status === 204 || !response.data) {
        setCurrentBusiness(null);
      } else {
        setCurrentBusiness(response.data);
      }
    } catch (error: any) {
      // Silently handle errors - no business selected is a normal state
      setCurrentBusiness(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await fetchUser();
      if (localStorage.getItem('access_token')) {
        await fetchBusinesses();
        await fetchCurrentBusiness();
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post('/token/', {
        username,
        password,
      });

      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Fetch user data
      const userResponse = await axios.get('/auth/me/');
      setUser(userResponse.data);
      
      // Fetch businesses
      await fetchBusinesses();
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const selectBusiness = async (businessId: number) => {
    try {
      const response = await axios.post(`/businesses/${businessId}/select/`);
      setCurrentBusiness(response.data);
    } catch (error) {
      console.error('Failed to select business:', error);
      throw error;
    }
  };

  const refreshBusinesses = useCallback(async () => {
    await fetchBusinesses();
    await fetchCurrentBusiness();
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
    mustChangePassword: user?.profile?.must_change_password || false,
    currentBusiness,
    businesses,
    selectBusiness,
    refreshBusinesses,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
