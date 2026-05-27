import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

const TestInstructions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    api
      .get('/tests/available')
      .then((res) => {
        const found = res.data.data.find((t) => t._id === testId);
        if (found) setTest(found);
        else navigate('/dashboard');
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [testId, navigate]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto card animate-slide-up">
        <h1 className="text-2xl font-bold">{test?.title}</h1>
        <p className="text-gray-500 mt-2">Please read all instructions carefully before starting.</p>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Duration: <strong>{test?.duration} minutes</strong></span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Shield className="w-5 h-5 text-orange-600" />
            <span>Max tab violations: <strong>{test?.maxTabViolations}</strong> (auto-submit after limit)</span>
          </div>
          {test?.fullscreenRequired && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
              <span>Fullscreen mode will be required during the test</span>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg prose dark:prose-invert max-w-none">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <div className="whitespace-pre-wrap text-sm">{test?.instructions || 'Follow all test rules. Do not switch tabs.'}</div>
        </div>

        <label className="flex items-center gap-2 mt-6 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded" />
          <span className="text-sm">I have read and agree to follow all test rules</span>
        </label>

        <button
          disabled={!agreed}
          onClick={() => navigate(`/tests/${testId}/exam`)}
          className="btn-primary w-full mt-6"
        >
          Start Assessment
        </button>
      </div>
    </div>
  );
};

export default TestInstructions;
