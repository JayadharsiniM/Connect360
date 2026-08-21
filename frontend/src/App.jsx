import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';

// Customer pages
import CustomerDashboard from './pages/customer/Dashboard';
import BrowseWorkers from './pages/customer/BrowseWorkers';
import WorkerDetail from './pages/customer/WorkerDetail';
import BookingForm from './pages/customer/BookingForm';
import MyBookings from './pages/customer/MyBookings';
import CustomerProfile from './pages/customer/Profile';

// Worker pages
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerProfile from './pages/worker/Profile';
import WorkerAvailability from './pages/worker/Availability';
import WorkerBookings from './pages/worker/Bookings';
import WorkerVerification from './pages/worker/Verification';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageServices from './pages/admin/ManageServices';
import VerificationReview from './pages/admin/VerificationReview';

export default function App() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <Loading message="Initializing Connect360..." />;
  }

  // Default redirect based on role
  const getHomeRoute = () => {
    if (!isAuthenticated) return '/login';
    const routes = {
      customer: '/customer/dashboard',
      worker: '/worker/dashboard',
      admin: '/admin/dashboard',
    };
    return routes[user?.role] || '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Customer routes */}
          <Route path="/customer/dashboard" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/customer/workers" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <BrowseWorkers />
            </ProtectedRoute>
          } />
          <Route path="/customer/workers/:id" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <WorkerDetail />
            </ProtectedRoute>
          } />
          <Route path="/customer/book/:workerId" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <BookingForm />
            </ProtectedRoute>
          } />
          <Route path="/customer/bookings" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <MyBookings />
            </ProtectedRoute>
          } />
          <Route path="/customer/profile" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerProfile />
            </ProtectedRoute>
          } />

          {/* Worker routes */}
          <Route path="/worker/dashboard" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/worker/profile" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerProfile />
            </ProtectedRoute>
          } />
          <Route path="/worker/availability" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerAvailability />
            </ProtectedRoute>
          } />
          <Route path="/worker/bookings" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerBookings />
            </ProtectedRoute>
          } />
          <Route path="/worker/verification" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerVerification />
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/services" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ManageServices />
            </ProtectedRoute>
          } />
          <Route path="/admin/verifications" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <VerificationReview />
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>
      </main>
    </div>
  );
}
