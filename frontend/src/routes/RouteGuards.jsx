import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { readToken } from '../services/tokenStorage.js';
import Spinner from '../components/Spinner.jsx';

function LoadingScreen() {
  return <div className="d-flex min-vh-100 justify-content-center align-items-center"><Spinner label="Checking your session..." /></div>;
}

export function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isAuthenticated && readToken() ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated || !readToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
