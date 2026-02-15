import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import type { Role } from '@/types/auth';

export const ProtectedRoute = ({ roles }: { roles?: Role[] }) => {
  const { user, loading, claims } = useAuthContext();

  if (loading) return <div className="p-10">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && claims?.role && !roles.includes(claims.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};
