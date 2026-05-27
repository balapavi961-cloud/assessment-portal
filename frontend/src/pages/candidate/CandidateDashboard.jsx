import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Clock, Award, Play, Calendar } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/dateTime';

const statusBadge = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ended: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTests = () => {
    setLoading(true);
    setError('');
    api
      .get('/tests/available')
      .then((res) => setTests(res.data.data || []))
      .catch((err) => {
        const msg = err.response?.data?.message || 'Could not load tests';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTests();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="card bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
          <h1 className="text-2xl font-bold">Welcome, {user?.name}!</h1>
          <p className="text-primary-100 mt-1">Ready to take your next assessment?</p>
        </div>

        <h2 className="text-xl font-semibold">Available Assessments</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((test) => (
              <div key={test._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg">{test.title}</h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      statusBadge[test.scheduleStatus] || statusBadge.ended
                    }`}
                  >
                    {test.scheduleStatus || 'active'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{test.description}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {test.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" /> {test.totalMarks} marks
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <Calendar className="w-3 h-3" />
                  {formatLocalDateTime(test.startTime)} — {formatLocalDateTime(test.endTime)}
                </p>
                {test.userSubmission?.status === 'submitted' ||
                test.userSubmission?.status === 'auto_submitted' ? (
                  <Link
                    to={`/tests/${test._id}/result`}
                    className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
                  >
                    View Result ({test.userSubmission.percentage}%)
                  </Link>
                ) : test.canJoin ? (
                  <Link
                    to={`/tests/${test._id}/instructions`}
                    className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Start Test
                  </Link>
                ) : (
                  <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-4 text-center">
                    {test.scheduleStatus === 'upcoming'
                      ? 'Opens at scheduled start time'
                      : 'This test has ended'}
                  </p>
                )}
              </div>
            ))}
            {!loading && tests.length === 0 && (
              <div className="col-span-full card text-center py-12 text-gray-500 space-y-2">
                <p>No published assessments available.</p>
                <p className="text-sm">
                  Ask your admin to <strong>publish</strong> the test (eye icon on Tests page) and set
                  valid start/end dates.
                </p>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CandidateDashboard;
