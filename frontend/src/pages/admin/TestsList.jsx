import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

const TestsList = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = () => {
    api
      .get('/tests')
      .then((res) => setTests(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetchTests(), []);

  const togglePublish = async (id) => {
    try {
      const { data } = await api.patch(`/tests/${id}/publish`);
      toast.success(data.message);
      fetchTests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const deleteTest = async (id) => {
    if (!confirm('Delete this test and all questions?')) return;
    try {
      await api.delete(`/tests/${id}`);
      toast.success('Test deleted');
      fetchTests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const statusColor = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    unpublished: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <Layout admin>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tests</h1>
        <Link to="/admin/tests/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Test
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <div key={test._id} className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-lg">{test.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[test.status]}`}>
                    {test.status}
                  </span>
                  {test.status !== 'published' && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      (hidden from candidates — click eye to publish)
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{test.description?.slice(0, 100)}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>{test.duration} min</span>
                  <span>{test.totalMarks} marks</span>
                  <span>{test.participantCount} participants</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => togglePublish(test._id)} className="btn-secondary p-2" title="Publish/Unpublish">
                  {test.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <Link to={`/admin/tests/${test._id}`} className="btn-secondary p-2">
                  <Edit className="w-4 h-4" />
                </Link>
                <button onClick={() => deleteTest(test._id)} className="btn-danger p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {tests.length === 0 && (
            <div className="card text-center py-12 text-gray-500">No tests yet. Create your first test!</div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default TestsList;
