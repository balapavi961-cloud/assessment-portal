import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Users, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout admin><LoadingSpinner /></Layout>;

  const { stats, submissionTrend, testStats, recentSubmissions } = data;

  return (
    <Layout admin>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Candidates" value={stats.totalCandidates} color="bg-blue-500" />
          <StatCard icon={FileText} label="Published Tests" value={stats.publishedTests} color="bg-primary-500" />
          <StatCard icon={CheckCircle} label="Completed" value={stats.completedSubmissions} color="bg-green-500" />
          <StatCard icon={TrendingUp} label="Completion Rate" value={`${stats.completionRate}%`} color="bg-orange-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Submission Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={submissionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Top Tests by Participation</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={testStats}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="participantCount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Recent Submissions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2">Candidate</th>
                  <th className="text-left py-3 px-2">Test</th>
                  <th className="text-left py-3 px-2">Score</th>
                  <th className="text-left py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions?.map((s) => (
                  <tr key={s._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-2">{s.user?.name}</td>
                    <td className="py-3 px-2">{s.test?.title}</td>
                    <td className="py-3 px-2">{s.totalScore}/{s.maxScore}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
