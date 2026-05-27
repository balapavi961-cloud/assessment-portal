import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Trophy } from 'lucide-react';

const Leaderboard = () => {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tests/available').then((res) => {
      setTests(res.data.data.filter((t) => t.showLeaderboard !== false));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedTest) return;
    api.get(`/tests/${selectedTest}/leaderboard`).then((res) => setLeaderboard(res.data.data));
  }, [selectedTest]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Trophy className="w-7 h-7 text-yellow-500" /> Leaderboard
      </h1>

      <select
        className="input-field max-w-md mb-6"
        value={selectedTest}
        onChange={(e) => setSelectedTest(e.target.value)}
      >
        <option value="">Select a test</option>
        {tests.map((t) => (
          <option key={t._id} value={t._id}>{t.title}</option>
        ))}
      </select>

      {loading ? (
        <LoadingSpinner />
      ) : selectedTest ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Rank</th>
                <th className="text-left py-3 px-2">Name</th>
                <th className="text-left py-3 px-2">Score</th>
                <th className="text-left py-3 px-2">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry._id} className={`border-b ${i < 3 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                  <td className="py-3 px-2 font-bold">#{entry.rank || i + 1}</td>
                  <td className="py-3 px-2">{entry.user?.name}</td>
                  <td className="py-3 px-2">{entry.totalScore}</td>
                  <td className="py-3 px-2">{entry.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Select a test to view leaderboard</p>
      )}
    </Layout>
  );
};

export default Leaderboard;
