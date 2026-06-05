import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { LogOut, Users, FileText, Settings } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">Welcome, {user?.name}</span>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/admin/assessments" className="glass-panel p-6 flex flex-col items-center justify-center text-center hover:bg-brand-50 transition-colors group cursor-pointer border-brand-100">
            <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Manage Assessments</h2>
            <p className="text-sm text-slate-500">Create and configure test assessments</p>
          </Link>

          <Link to="/admin/candidates" className="glass-panel p-6 flex flex-col items-center justify-center text-center hover:bg-purple-50 transition-colors group cursor-pointer border-purple-100">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Manage Candidates</h2>
            <p className="text-sm text-slate-500">Add or remove candidates</p>
          </Link>
          
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed border-slate-200">
             <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Settings size={24} />
            </div>
            <h2 className="text-lg font-semibold text-slate-500 mb-1">Settings</h2>
            <p className="text-sm text-slate-400">System configuration (Coming soon)</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
