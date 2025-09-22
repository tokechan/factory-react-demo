import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../utils/api';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const isAuthenticated = !!user && apiClient.isAuthenticated();

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      if (apiClient.isAuthenticated() && !isInitialized) {
        try {
          await refreshUser();
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          // Token might be expired, clear it
          await logout();
        } finally {
          setIsInitialized(true);
        }
      } else {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [isInitialized]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const authResponse: AuthResponse = await apiClient.login(credentials);
      setUser(authResponse.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const authResponse: AuthResponse = await apiClient.register(userData);
      setUser(authResponse.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!apiClient.isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Custom hook for protected routes
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
};

// Higher-order component for protecting routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useRequireAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-4"></div>
            </div>
            <p className="text-gray-600">認証を確認中...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect to login
    }

    return <Component {...props} />;
  };
};
