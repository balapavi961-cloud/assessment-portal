import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Award, Trophy, ArrowLeft } from 'lucide-react';

const TestResult = () => {
  const { testId } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    if (!result) {
      api
        .get(`/submissions/${testId}/result`)
        .then((res) => setResult(res.data.data))
        .finally(() => setLoading(false));
    }
  }, [testId, result]);

  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/dashboard" className="flex items-center gap-2 text-primary-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="card text-center">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto">
            <Award className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold mt-4">Assessment Complete!</h1>
          <p className="text-gray-500 mt-1">{result?.test?.title}</p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-500">Total Score</p>
              <p className="text-3xl font-bold text-primary-600">
                {result?.totalScore}/{result?.maxScore}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-500">Percentage</p>
              <p className="text-3xl font-bold">{result?.percentage}%</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-500">MCQ Score</p>
              <p className="text-xl font-semibold">{result?.mcqScore}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-500">Coding Score</p>
              <p className="text-xl font-semibold">{result?.codingScore}</p>
            </div>
          </div>

          {result?.rank && (
            <div className="mt-6 flex items-center justify-center gap-2 text-lg">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Rank: <strong>#{result.rank}</strong></span>
            </div>
          )}

          {result?.codingAnswers?.length > 0 && (
            <div className="mt-8 text-left">
              <h3 className="font-semibold mb-3">Coding Submissions</h3>
              {result.codingAnswers.map((ca, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-2 text-sm">
                  <p>Question {i + 1} — Score: {ca.score}/{ca.maxScore}</p>
                  <p className="text-gray-500">Language: {ca.language} • Status: {ca.evalStatus}</p>
                  {ca.plagiarismScore > 50 && (
                    <p className="text-red-500 text-xs mt-1">Plagiarism alert: {ca.plagiarismScore}% similarity</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TestResult;
