import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { NotificationProvider } from './hooks/useNotifications';
import { SharingProvider } from './hooks/useSharing';
import { AlertProvider } from './hooks/useAlerts';

// Pages (will be created next)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PhotosPage from './pages/PhotosPage';
import UploadPage from './pages/UploadPage';
import StatsPage from './pages/StatsPage';
import ShareViewPage from './pages/ShareViewPage';
import ShareManagePage from './pages/ShareManagePage';
import AlertsPage from './pages/AlertsPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <SharingProvider>
          <AlertProvider>
            <Router>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Public share view route */}
                <Route path="/share/:shareId" element={<ShareViewPage />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="photos" element={<PhotosPage />} />
                  <Route path="upload" element={<UploadPage />} />
                  <Route path="stats" element={<StatsPage />} />
                  <Route path="shares" element={<ShareManagePage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
            </Router>
          </AlertProvider>
        </SharingProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
