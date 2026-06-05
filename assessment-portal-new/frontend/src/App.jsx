import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import AssessmentManagement from './pages/admin/AssessmentManagement';
import QuestionManagement from './pages/admin/QuestionManagement';
import CandidateManagement from './pages/admin/CandidateManagement';
import AssessmentInterface from './pages/candidate/AssessmentInterface';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
};

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={user ? (user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/candidate" />) : <Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/assessments" element={<PrivateRoute role="admin"><AssessmentManagement /></PrivateRoute>} />
          <Route path="/admin/assessments/:id/questions" element={<PrivateRoute role="admin"><QuestionManagement /></PrivateRoute>} />
          <Route path="/admin/candidates" element={<PrivateRoute role="admin"><CandidateManagement /></PrivateRoute>} />
          
          {/* Candidate Routes */}
          <Route path="/candidate" element={<PrivateRoute role="candidate"><CandidateDashboard /></PrivateRoute>} />
          <Route path="/candidate/assessment/:id" element={<PrivateRoute role="candidate"><AssessmentInterface /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
