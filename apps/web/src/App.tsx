import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth.store';
import { useEffect, useState, Suspense, lazy } from 'react';

// Layouts (keep eager - needed immediately)
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Public pages (lazy loaded)
const HomePage = lazy(() => import('./pages/HomePage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ServicePage = lazy(() => import('./pages/ServicePage'));
const SellerPage = lazy(() => import('./pages/SellerPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const CoursePlayerPage = lazy(() => import('./pages/CoursePlayerPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));

// Auth pages (lazy loaded)
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Protected pages (lazy loaded)
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const OrdersPage = lazy(() => import('./pages/dashboard/OrdersPage'));
const OrderPage = lazy(() => import('./pages/dashboard/OrderPage'));
const MessagesPage = lazy(() => import('./pages/dashboard/MessagesPage'));
const ConversationPage = lazy(() => import('./pages/dashboard/ConversationPage'));
const SubscriptionsPage = lazy(() => import('./pages/dashboard/SubscriptionsPage'));
const MyCoursesPage = lazy(() => import('./pages/dashboard/MyCoursesPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));

// Seller pages (lazy loaded)
const SellerDashboardPage = lazy(() => import('./pages/seller/SellerDashboardPage'));
const SellerServicesPage = lazy(() => import('./pages/seller/SellerServicesPage'));
const CreateServicePage = lazy(() => import('./pages/seller/CreateServicePage'));
const EditServicePage = lazy(() => import('./pages/seller/EditServicePage'));
const SellerOrdersPage = lazy(() => import('./pages/seller/SellerOrdersPage'));
const SellerInboxPage = lazy(() => import('./pages/seller/SellerInboxPage'));
const EarningsPage = lazy(() => import('./pages/seller/EarningsPage'));
const BecomeSeller = lazy(() => import('./pages/seller/BecomeSeller'));
const SellerCoursesPage = lazy(() => import('./pages/seller/SellerCoursesPage'));
const CreateCoursePage = lazy(() => import('./pages/seller/CreateCoursePage'));
const SellerAnalyticsPage = lazy(() => import('./pages/seller/SellerAnalyticsPage'));
const BioLinkBuilderPage = lazy(() => import('./pages/BioLinkBuilderPage'));
const BioLinkPage = lazy(() => import('./pages/BioLinkPage'));

// Admin pages (lazy loaded)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminKYCPage = lazy(() => import('./pages/admin/AdminKYCPage'));
const AdminServicesPage = lazy(() => import('./pages/admin/AdminServicesPage'));
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminInboxPage = lazy(() => import('./pages/admin/AdminInboxPage'));
const AdminSellerManagementPage = lazy(() => import('./pages/admin/AdminSellerManagementPage'));
const FeesPage = lazy(() => import('./pages/admin/FeesPage'));
const ConfigurationPage = lazy(() => import('./pages/admin/ConfigurationPage'));

// Components
import ProtectedRoute from './components/ProtectedRoute';
import SellerRoute from './components/SellerRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
const DevPanel = lazy(() => import('./components/DevPanel'));

function App() {
  const { initialize, isLoading } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for zustand persist to restore state from localStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated) initialize();
  }, [hydrated, initialize]);

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      {import.meta.env.DEV && <Suspense fallback={null}><DevPanel /></Suspense>}
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:username/:slug" element={<ServicePage />} />
          <Route path="/sellers/:username" element={<SellerPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CoursePage />} />
        </Route>

        {/* Course player (full screen, no layout) */}
        <Route path="/courses/:slug/learn" element={<ProtectedRoute><CoursePlayerPage /></ProtectedRoute>} />

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
          <Route path="/my-courses" element={<MyCoursesPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
        </Route>

        {/* Seller routes */}
        <Route element={<SellerRoute><DashboardLayout /></SellerRoute>}>
          <Route path="/seller" element={<SellerDashboardPage />} />
          <Route path="/seller/services" element={<SellerServicesPage />} />
          <Route path="/seller/services/new" element={<CreateServicePage />} />
          <Route path="/seller/services/:id/edit" element={<EditServicePage />} />
          <Route path="/seller/orders" element={<SellerOrdersPage />} />
          <Route path="/seller/inbox" element={<SellerInboxPage />} />
          <Route path="/seller/inbox/:id" element={<ConversationPage />} />
          <Route path="/seller/crm" element={<SellerInboxPage />} />
          <Route path="/seller/earnings" element={<EarningsPage />} />
          <Route path="/seller/courses" element={<SellerCoursesPage />} />
          <Route path="/seller/courses/new" element={<CreateCoursePage />} />
          <Route path="/seller/analytics" element={<SellerAnalyticsPage />} />
          <Route path="/seller/biolink" element={<BioLinkBuilderPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/seller-management" element={<AdminSellerManagementPage />} />
          <Route path="/admin/kyc" element={<AdminKYCPage />} />
          <Route path="/admin/services" element={<AdminServicesPage />} />
          <Route path="/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/inbox" element={<AdminInboxPage />} />
          <Route path="/admin/fees" element={<FeesPage />} />
          <Route path="/admin/configuration" element={<ConfigurationPage />} />
        </Route>

        {/* BioLink standalone page — must be LAST (catch-all for vanity URLs) */}
        <Route path="/:username" element={<BioLinkPage />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
