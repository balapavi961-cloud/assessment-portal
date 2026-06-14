import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Clock, Award, Play, Calendar } from 'lucide-react';
import { formatLocalDateTime } from '../../utils/dateTime';

const statusBadge = {
  active:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ended:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const MyTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/tests/available')
      .then((res) => {
        // Only show tests the candidate has NOT yet completed
        const available = (res.data.data || []).filter(
          (t) =>
            t.userSubmission?.status !== 'submitted' &&
            t.userSubmission?.status !== 'auto_submitted'
        );
        setTests(available);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Could not load tests';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Available Assessments</h1>

        {loading ? (
          <LoadingSpinner />
        ) : tests.length === 0 ? (
          <div className="card text-center py-14 text-gray-500 space-y-2">
            <Award className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="font-medium">No available tests at the moment.</p>
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <p className="text-sm">
                Ask your admin to <strong>publish</strong> a test with valid start/end dates.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((test) => (
              <div key={test._id} className="card hover:shadow-md transition-shadow flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg leading-snug">{test.title}</h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      statusBadge[test.scheduleStatus] || statusBadge.ended
                    }`}
                  >
                    {test.scheduleStatus || 'active'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">{test.description}</p>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {test.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" /> {test.totalMarks} marks
                  </span>
                </div>

                {/* Schedule */}
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <Calendar className="w-3 h-3" />
                  {formatLocalDateTime(test.startTime)} — {formatLocalDateTime(test.endTime)}
                </p>

                {/* CTA */}
                <div className="mt-4">
                  {test.canJoin ? (
                    <Link
                      to={`/tests/${test._id}/instructions`}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Start Test
                    </Link>
                  ) : (
                    <p className="text-sm text-yellow-600 dark:text-yellow-500 text-center">
                      {test.scheduleStatus === 'upcoming'
                        ? 'Opens at scheduled start time'
                        : 'This test has ended'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyTests;
