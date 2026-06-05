import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Settings, ArrowLeft } from 'lucide-react';

const AssessmentManagement = () => {
  const [assessments, setAssessments] = useState([]);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');

  const fetchAssessments = async () => {
    try {
      const res = await axiosClient.get('/assessments');
      setAssessments(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/assessments', { title, duration: Number(duration) });
      setTitle('');
      setDuration('');
      fetchAssessments();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axiosClient.delete(`/assessments/${id}`);
      fetchAssessments();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin" className="p-2 text-slate-500 hover:text-slate-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Manage Assessments</h1>
        </div>

        <div className="glass-panel p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Create New Assessment</h2>
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="e.g. Frontend Developer Test"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-slate-600 mb-1">Duration (mins)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input-field"
                placeholder="60"
                required
              />
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Create
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Existing Assessments</h2>
          {assessments.length === 0 ? (
            <p className="text-slate-500">No assessments found.</p>
          ) : (
            assessments.map((a) => (
              <div key={a._id} className="glass-panel p-5 flex items-center justify-between hover:border-brand-300 transition-colors">
                <div>
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  <p className="text-sm text-slate-500">{a.duration} mins duration</p>
                </div>
                <div className="flex gap-3">
                  <Link to={`/admin/assessments/${a._id}/questions`} className="btn-secondary flex items-center gap-2 text-brand-600 hover:text-brand-700">
                    <Settings size={18} /> Manage Questions
                  </Link>
                  <button onClick={() => handleDelete(a._id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentManagement;
