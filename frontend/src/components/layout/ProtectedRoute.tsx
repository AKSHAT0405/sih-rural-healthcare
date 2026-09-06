import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { token, userRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>; // Or a nice spinner
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Role not authorized, redirect to their home based on role
    if (userRole === 'PATIENT') return <Navigate to="/patient" replace />;
    if (userRole === 'DOCTOR') return <Navigate to="/doctor" replace />;
    if (userRole === 'ADMIN') return <Navigate to="/admin" replace />;
    if (userRole === 'HEALTH_WORKER') return <Navigate to="/health-worker" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};
