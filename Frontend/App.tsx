
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Static Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OnboardingFlow from './pages/OnboardingFlow';
import UserProfileSettings from './pages/UserProfileSettings';

// Client Pages
import ClientDashboard from './pages/ClientDashboard';
import WorkflowRequestForm from './pages/WorkflowRequestForm';
import KnowledgeBaseLibrary from './pages/KnowledgeBaseLibrary';
import ClientAddons from './pages/ClientAddons';
import ClientConnectedAccounts from './pages/ClientConnectedAccounts';
import ClientConversations from './pages/ClientConversations';
import ClientAnalytics from './pages/ClientAnalytics';
import ClientSettings from './pages/ClientSettings';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminWorkflowFulfillment from './pages/AdminWorkflowFulfillment';
import AdminAllClients from './pages/AdminAllClients';
import AdminWorkflowRequests from './pages/AdminWorkflowRequests';
import AdminSystemWorkflows from './pages/AdminSystemWorkflows';
import AdminPlatformAnalytics from './pages/AdminPlatformAnalytics';
import AdminSettings from './pages/AdminSettings';

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
    <div className="flex flex-col items-center gap-4">
      <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading...</p>
    </div>
  </div>
);

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main app content with auth context
const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  const handleLogout = () => {
    logout();
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark overflow-x-hidden">
      {isAuthenticated && (
        <>
          {/* Dev mode indicator - remove in production */}
          {import.meta.env.VITE_ENV === 'development' && (
            <div className="fixed bottom-4 right-4 z-[9999] bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-mono opacity-50">
              {isAdmin ? 'Admin' : 'Client'} Mode
            </div>
          )}
          <Sidebar 
            isAdmin={isAdmin} 
            onLogout={handleLogout} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
        </>
      )}
      
      <div className={`flex-1 flex flex-col min-w-0 ${isAuthenticated ? 'md:ml-64 lg:ml-72' : ''} transition-all duration-300`}>
        {isAuthenticated && (
          <Header 
            isAdmin={isAdmin} 
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
        )}
        
        <main className={`flex-1 ${isAuthenticated ? 'logged-in p-4 md:p-8' : ''}`}>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                !isAuthenticated 
                  ? <LandingPage /> 
                  : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />
              } 
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />
            
            {/* Common Logged-in Routes */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <UserProfileSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Client Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workflows/new" 
              element={
                <ProtectedRoute>
                  <WorkflowRequestForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/knowledge-bases" 
              element={
                <ProtectedRoute>
                  <KnowledgeBaseLibrary />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/addons" 
              element={
                <ProtectedRoute>
                  <ClientAddons />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/accounts" 
              element={
                <ProtectedRoute>
                  <ClientConnectedAccounts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/conversations" 
              element={
                <ProtectedRoute>
                  <ClientConversations />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <ClientAnalytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <ClientSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/clients" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminAllClients />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/requests" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminWorkflowRequests />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/request/:id" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminWorkflowFulfillment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/system-workflows" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSystemWorkflows />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/platform-analytics" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPlatformAnalytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Root App component with providers
const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
