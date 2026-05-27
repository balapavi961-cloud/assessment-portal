import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import TestsList from './pages/admin/TestsList';
import TestEditor from './pages/admin/TestEditor';
import UsersList from './pages/admin/UsersList';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import TestInstructions from './pages/candidate/TestInstructions';
import ExamInterface from './pages/candidate/ExamInterface';
import TestResult from './pages/candidate/TestResult';
import Leaderboard from './pages/candidate/Leaderboard';

const HomeRedirect = () => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/tests" element={<ProtectedRoute adminOnly><TestsList /></ProtectedRoute>} />
            <Route path="/admin/tests/:id" element={<ProtectedRoute adminOnly><TestEditor /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute adminOnly><UsersList /></ProtectedRoute>} />

            {/* Candidate routes */}
            <Route path="/dashboard" element={<ProtectedRoute candidateOnly><CandidateDashboard /></ProtectedRoute>} />
            <Route path="/tests" element={<ProtectedRoute candidateOnly><CandidateDashboard /></ProtectedRoute>} />
            <Route path="/tests/:testId/instructions" element={<ProtectedRoute candidateOnly><TestInstructions /></ProtectedRoute>} />
            <Route path="/tests/:testId/exam" element={<ProtectedRoute candidateOnly><ExamInterface /></ProtectedRoute>} />
            <Route path="/tests/:testId/result" element={<ProtectedRoute><TestResult /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
