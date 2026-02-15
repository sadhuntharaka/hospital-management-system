import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import type { Role } from '@/types/auth';

export const ProtectedRoute = ({ roles }: { roles?: Role[] }) => {
  const { user, loading, claims, profile } = useAuthContext();
  const location = useLocation();

  if (loading) return <div className="p-10">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (profile?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!profile?.mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to="/dashboard" replace />;
  }

  if (roles && claims?.role && !roles.includes(claims.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
