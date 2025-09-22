import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import Button from './Button';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { showSuccess } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      showSuccess('ログアウトしました');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
    { path: '/photos', label: '写真', icon: '📸' },
    { path: '/upload', label: 'アップロード', icon: '📤' },
    { path: '/stats', label: '統計', icon: '📊' },
    { path: '/shares', label: '共有管理', icon: '🔗' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900">
                📸 Photo Archive
              </h1>
              
              {/* Navigation */}
              <nav className="hidden md:flex gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto gap-1 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
