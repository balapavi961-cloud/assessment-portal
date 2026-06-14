import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';

/* ─── Delete Confirmation Modal ─────────────────────────────────────────── */
const DeleteConfirmModal = ({ test, onConfirm, onCancel, isDeleting }) => {
  if (!test) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      {/* Modal card */}
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-1">
          Delete Test?
        </h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          You are about to permanently delete:
        </p>
        <p className="text-center font-semibold text-gray-800 dark:text-gray-200 mb-4 px-2 truncate">
          "{test.title}"
        </p>
        <p className="text-center text-sm text-red-600 dark:text-red-400 mb-6">
          This will also remove all questions and participant records. This action
          <strong> cannot</strong> be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 btn-danger flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Yes, Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const TestsList = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testToDelete, setTestToDelete] = useState(null); // { _id, title }
  const [isDeleting, setIsDeleting] = useState(false);

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

  /* Open the modal instead of calling confirm() */
  const handleDeleteClick = (test) => {
    setTestToDelete(test);
  };

  /* Called when user confirms inside the modal */
  const confirmDelete = async () => {
    if (!testToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/tests/${testToDelete._id}`);
      toast.success('Test deleted');
      setTestToDelete(null);
      fetchTests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setIsDeleting(false);
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
                <button
                  onClick={() => handleDeleteClick(test)}
                  className="btn-danger p-2"
                  title="Delete test"
                >
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

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        test={testToDelete}
        onConfirm={confirmDelete}
        onCancel={() => !isDeleting && setTestToDelete(null)}
        isDeleting={isDeleting}
      />
    </Layout>
  );
};

export default TestsList;
