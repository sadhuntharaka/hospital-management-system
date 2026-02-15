import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';

export const ProtectedRoute = () => {
  const { user, loading, isAdmin } = useAuthContext();
  const location = useLocation();

  if (loading) return <div className="p-10">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ message: 'Not authorized', from: location.pathname }} />;
  }

  return <Outlet />;
};
