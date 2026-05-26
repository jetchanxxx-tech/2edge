import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AdminRoute() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
