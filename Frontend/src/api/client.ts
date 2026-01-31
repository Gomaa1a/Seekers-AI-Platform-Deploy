import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base API URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Token storage keys
const ACCESS_TOKEN_KEY = 'seekers_access_token';
const REFRESH_TOKEN_KEY = 'seekers_refresh_token';
const USER_KEY = 'seekers_user';
const IS_ADMIN_KEY = 'seekers_is_admin';

// Token management utilities
export const TokenManager = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  isAdmin: (): boolean => localStorage.getItem(IS_ADMIN_KEY) === 'true',

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  setUser: (user: any, isAdmin: boolean = false) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(IS_ADMIN_KEY, String(isAdmin));
  },

  clearAll: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(IS_ADMIN_KEY);
  },

  isAuthenticated: (): boolean => {
    const token = TokenManager.getAccessToken();
    if (!token) return false;
    
    // Check if token is expired (basic JWT decode)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - unwrap { success, data } envelope and handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Auto-unwrap backend envelope: { success: true, data: ... } -> data is in response.data.data
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const isAdmin = TokenManager.isAdmin();
          const endpoint = isAdmin ? '/admin/auth/refresh' : '/auth/refresh';
          
          const response = await axios.post(`${API_BASE_URL}/api${endpoint}`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          TokenManager.setTokens(newAccessToken, newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          TokenManager.clearAll();
          window.location.href = '/#/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - redirect to login
        TokenManager.clearAll();
        window.location.href = '/#/login';
      }
    }

    // Handle other errors
    const errorMessage = (error.response?.data as any)?.message || (error.response?.data as any)?.error || error.message || 'An error occurred';
    console.error('API Error:', errorMessage);
    
    return Promise.reject(error);
  }
);

// Create a separate instance for admin routes (with different auth handling if needed)
const adminClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/admin`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Admin request interceptor
adminClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Admin response interceptor - unwrap envelope and handle errors
adminClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      TokenManager.clearAll();
      window.location.href = '/#/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient, adminClient };
export default apiClient;
