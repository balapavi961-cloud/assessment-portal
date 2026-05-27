import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, adminOnly, candidateOnly }) => {
  const { user, loading, isAdmin, isCandidate } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (candidateOnly && !isCandidate) return <Navigate to="/admin" replace />;

  return children;
};

export default ProtectedRoute;
