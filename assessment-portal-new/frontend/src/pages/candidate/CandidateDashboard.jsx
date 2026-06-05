import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { Link } from 'react-router-dom';
import { LogOut, PlayCircle, CheckCircle } from 'lucide-react';

const CandidateDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assRes, subRes] = await Promise.all([
          axiosClient.get('/assessments'),
          axiosClient.get('/submissions/me')
        ]);
        setAssessments(assRes.data);
        setSubmissions(subRes.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const isSubmitted = (id) => {
    return submissions.some(s => s.assessmentId?._id === id || s.assessmentId === id);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Candidate Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">Welcome, {user?.name}</span>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Your Assessments</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map(a => {
            const submitted = isSubmitted(a._id);
            return (
              <div key={a._id} className="glass-panel p-6 flex flex-col justify-between h-full relative overflow-hidden group hover:border-brand-300 transition-colors">
                {submitted && <div className="absolute top-0 right-0 w-16 h-16 bg-green-500 transform rotate-45 translate-x-8 -translate-y-8"></div>}
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 pr-6">{a.title}</h3>
                  <div className="flex items-center text-sm text-slate-500 mb-6">
                    <span className="px-2 py-1 bg-slate-100 rounded-md">{a.duration} minutes</span>
                  </div>
                </div>

                {submitted ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-medium py-2 bg-green-50 rounded-lg">
                    <CheckCircle size={18} /> Completed
                  </div>
                ) : (
                  <Link to={`/candidate/assessment/${a._id}`} className="btn-primary w-full flex items-center justify-center gap-2 group-hover:bg-brand-500 transition-colors">
                    <PlayCircle size={18} /> Start Assessment
                  </Link>
                )}
              </div>
            );
          })}
          
          {assessments.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No assessments assigned to you currently.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CandidateDashboard;
