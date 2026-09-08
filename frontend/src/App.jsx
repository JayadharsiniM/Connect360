import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';
import AIAssistant from './components/AIAssistant';

// Landing
import Landing from './pages/Landing';

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
import BookingChoice from './pages/customer/BookingChoice';
import PriorityBookingForm from './pages/customer/PriorityBookingForm';
import PriorityBookings from './pages/customer/PriorityBookings';

// Worker pages
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerProfile from './pages/worker/Profile';
import WorkerAvailability from './pages/worker/Availability';
import WorkerBookings from './pages/worker/Bookings';
import WorkerVerification from './pages/worker/Verification';
import WorkerPriorityRequests from './pages/worker/PriorityRequests';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageServices from './pages/admin/ManageServices';
import VerificationReview from './pages/admin/VerificationReview';
import RevenueOverview from './pages/admin/RevenueOverview';
import UserManagement from './pages/admin/UserManagement';
import VerificationQueue from './pages/admin/VerificationQueue';

export default function App() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <Loading message="Initializing Connect360..." />;
  }

  const getHomeRoute = () => {
    if (!isAuthenticated) return '/';
    const routes = {
      customer: '/customer/dashboard',
      worker: '/worker/dashboard',
      admin: '/admin/dashboard',
    };
    return routes[user?.role] || '/login';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          {/* Landing */}
          <Route path="/" element={isAuthenticated ? <Navigate to={getHomeRoute()} replace /> : <Landing />} />

          {/* Public routes */}
          <Route path="/login" element={isAuthenticated ? <Navigate to={getHomeRoute()} replace /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to={getHomeRoute()} replace /> : <Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Customer routes */}
          <Route path="/customer/dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer/workers" element={<ProtectedRoute allowedRoles={['customer']}><BrowseWorkers /></ProtectedRoute>} />
          <Route path="/customer/workers/:id" element={<ProtectedRoute allowedRoles={['customer']}><WorkerDetail /></ProtectedRoute>} />
          <Route path="/customer/book/:workerId" element={<ProtectedRoute allowedRoles={['customer']}><BookingForm /></ProtectedRoute>} />
          <Route path="/customer/book-type" element={<ProtectedRoute allowedRoles={['customer']}><BookingChoice /></ProtectedRoute>} />
          <Route path="/customer/priority/new" element={<ProtectedRoute allowedRoles={['customer']}><PriorityBookingForm /></ProtectedRoute>} />
          <Route path="/customer/priority" element={<ProtectedRoute allowedRoles={['customer']}><PriorityBookings /></ProtectedRoute>} />
          <Route path="/customer/bookings" element={<ProtectedRoute allowedRoles={['customer']}><MyBookings /></ProtectedRoute>} />
          <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />

          {/* Worker routes */}
          <Route path="/worker/dashboard" element={<ProtectedRoute allowedRoles={['worker']}><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/worker/profile" element={<ProtectedRoute allowedRoles={['worker']}><WorkerProfile /></ProtectedRoute>} />
          <Route path="/worker/availability" element={<ProtectedRoute allowedRoles={['worker']}><WorkerAvailability /></ProtectedRoute>} />
          <Route path="/worker/bookings" element={<ProtectedRoute allowedRoles={['worker']}><WorkerBookings /></ProtectedRoute>} />
          <Route path="/worker/priority-requests" element={<ProtectedRoute allowedRoles={['worker']}><WorkerPriorityRequests /></ProtectedRoute>} />
          <Route path="/worker/verification" element={<ProtectedRoute allowedRoles={['worker']}><WorkerVerification /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/revenue" element={<ProtectedRoute allowedRoles={['admin']}><RevenueOverview /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/services" element={<ProtectedRoute allowedRoles={['admin']}><ManageServices /></ProtectedRoute>} />
          <Route path="/admin/verification-queue" element={<ProtectedRoute allowedRoles={['admin']}><VerificationQueue /></ProtectedRoute>} />
          <Route path="/admin/verifications" element={<ProtectedRoute allowedRoles={['admin']}><VerificationReview /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>
      </main>
      <BottomNav />
      <AIAssistant />
    </div>
  );
}
