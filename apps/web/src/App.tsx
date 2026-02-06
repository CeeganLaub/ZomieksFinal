import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth.store';
import { useEffect } from 'react';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// Public pages
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import ServicePage from './pages/ServicePage';
import SellerPage from './pages/SellerPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Protected pages
import DashboardPage from './pages/dashboard/DashboardPage';
import OrdersPage from './pages/dashboard/OrdersPage';
import OrderPage from './pages/dashboard/OrderPage';
import MessagesPage from './pages/dashboard/MessagesPage';
import ConversationPage from './pages/dashboard/ConversationPage';
import SubscriptionsPage from './pages/dashboard/SubscriptionsPage';
import SettingsPage from './pages/dashboard/SettingsPage';

// Seller pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import SellerServicesPage from './pages/seller/SellerServicesPage';
import CreateServicePage from './pages/seller/CreateServicePage';
import EditServicePage from './pages/seller/EditServicePage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import CRMPage from './pages/seller/CRMPage';
import EarningsPage from './pages/seller/EarningsPage';
import BecomeSeller from './pages/seller/BecomeSeller';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import FeesPage from './pages/admin/FeesPage';
import ConfigurationPage from './pages/admin/ConfigurationPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import SellerRoute from './components/SellerRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import DevPanel from './components/DevPanel';

function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <DevPanel />
      <Routes>
        {/* Public routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:username/:slug" element={<ServicePage />} />
          <Route path="/sellers/:username" element={<SellerPage />} />
        </Route>

        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected buyer routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:id" element={<ConversationPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
        </Route>

        {/* Seller routes */}
        <Route element={<SellerRoute><DashboardLayout isSeller /></SellerRoute>}>
          <Route path="/seller" element={<SellerDashboardPage />} />
          <Route path="/seller/services" element={<SellerServicesPage />} />
          <Route path="/seller/services/new" element={<CreateServicePage />} />
          <Route path="/seller/services/:id/edit" element={<EditServicePage />} />
          <Route path="/seller/orders" element={<SellerOrdersPage />} />
          <Route path="/seller/crm" element={<CRMPage />} />
          <Route path="/seller/earnings" element={<EarningsPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/fees" element={<FeesPage />} />
          <Route path="/admin/configuration" element={<ConfigurationPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
