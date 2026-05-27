import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';

const Layout = ({ children, admin }) => {
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/tests', icon: FileText, label: 'Tests' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ];

  const candidateLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tests', icon: FileText, label: 'My Tests' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  ];

  const links = admin || isAdmin ? adminLinks : candidateLinks;

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg">AssessPro</h1>
          <p className="text-xs text-gray-500">{isAdmin ? 'Admin Panel' : 'Candidate Portal'}</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              location.pathname === to || location.pathname.startsWith(to + '/')
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <div className="px-4 py-2">
          <p className="font-medium text-sm truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed h-full">
        <NavContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 flex flex-col">
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="font-semibold text-lg flex-1">
            {links.find((l) => location.pathname.startsWith(l.to))?.label || 'Assessment Portal'}
          </h2>
        </header>
        <main className="p-4 md:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
