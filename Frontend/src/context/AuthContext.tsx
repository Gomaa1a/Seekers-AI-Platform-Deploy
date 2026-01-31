import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TokenManager } from '../api/client';
import { authService, LoginCredentials, RegisterData, AdminLoginCredentials } from '../api/services/auth';
import type { User, AdminUser } from '../types';

// Auth context state
interface AuthState {
  user: User | AdminUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth context actions
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  adminLogin: (credentials: AdminLoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (TokenManager.isAuthenticated()) {
          const user = TokenManager.getUser();
          const isAdmin = TokenManager.isAdmin();
          
          setState({
            user,
            isAuthenticated: true,
            isAdmin,
            isLoading: false,
            error: null,
          });
        } else {
          // Clear any stale tokens
          TokenManager.clearAll();
          setState({
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        TokenManager.clearAll();
        setState({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isLoading: false,
          error: null,
        });
      }
    };

    initAuth();
  }, []);

  // Client login
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await authService.login(credentials) as any;
      const user = response.user;
      const accessToken = response.tokens?.accessToken || response.accessToken;
      const refreshToken = response.tokens?.refreshToken || response.refreshToken;

      TokenManager.setTokens(accessToken, refreshToken);
      TokenManager.setUser({ ...user, organization_id: response.organization?.id }, false);

      setState({
        user,
        isAuthenticated: true,
        isAdmin: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  }, []);

  // Admin login
  const adminLogin = useCallback(async (credentials: AdminLoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await authService.adminLogin(credentials) as any;
      const admin = response.admin;
      const accessToken = response.token || response.tokens?.accessToken || response.accessToken;
      const refreshToken = response.tokens?.refreshToken || response.refreshToken || '';

      TokenManager.setTokens(accessToken, refreshToken);
      TokenManager.setUser(admin, true);

      setState({
        user: admin,
        isAuthenticated: true,
        isAdmin: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Admin login failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  }, []);

  // Register new client
  const register = useCallback(async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await authService.register(data) as any;
      const user = response.user;
      const accessToken = response.tokens?.accessToken || response.accessToken;
      const refreshToken = response.tokens?.refreshToken || response.refreshToken;

      TokenManager.setTokens(accessToken, refreshToken);
      TokenManager.setUser({ ...user, organization_id: response.organization?.id }, false);

      setState({
        user,
        isAuthenticated: true,
        isAdmin: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    TokenManager.clearAll();
    setState({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      error: null,
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const isAdmin = TokenManager.isAdmin();
      if (isAdmin) {
        const profile = await authService.getAdminProfile();
        TokenManager.setUser(profile, true);
        setState(prev => ({ ...prev, user: profile }));
      } else {
        const profile = await authService.getProfile();
        TokenManager.setUser(profile, false);
        setState(prev => ({ ...prev, user: profile }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    adminLogin,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected route component
interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect will be handled by the parent component
    return null;
  }

  if (requireAdmin && !isAdmin) {
    // Redirect will be handled by the parent component
    return null;
  }

  return <>{children}</>;
};

export default AuthContext;
