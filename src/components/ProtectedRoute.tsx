import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証を確認中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login will be handled by AuthProvider
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
