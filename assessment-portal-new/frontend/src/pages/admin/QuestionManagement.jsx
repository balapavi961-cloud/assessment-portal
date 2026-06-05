import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';

const QuestionManagement = () => {
  const { id: assessmentId } = useParams();
  const [questions, setQuestions] = useState({ mcqs: [], coding: [] });
  const [activeTab, setActiveTab] = useState('mcq');

  // MCQ form
  const [mcqQues, setMcqQues] = useState('');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [mcqAns, setMcqAns] = useState('');

  // Coding form
  const [codeTitle, setCodeTitle] = useState('');
  const [codeDesc, setCodeDesc] = useState('');
  const [sampleIn, setSampleIn] = useState('');
  const [sampleOut, setSampleOut] = useState('');

  const fetchQuestions = async () => {
    try {
      const res = await axiosClient.get(`/questions/assessment/${assessmentId}`);
      setQuestions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [assessmentId]);

  const handleAddMCQ = async (e) => {
    e.preventDefault();
    if (!mcqOptions.includes(mcqAns)) {
      alert("Answer must match one of the options.");
      return;
    }
    try {
      await axiosClient.post('/questions/mcq', {
        assessmentId,
        question: mcqQues,
        options: mcqOptions,
        answer: mcqAns
      });
      setMcqQues('');
      setMcqOptions(['', '', '', '']);
      setMcqAns('');
      fetchQuestions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteMCQ = async (id) => {
    try {
      await axiosClient.delete(`/questions/mcq/${id}`);
      fetchQuestions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddCoding = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/questions/coding', {
        assessmentId,
        title: codeTitle,
        statement: codeDesc,
        sampleInput: sampleIn,
        sampleOutput: sampleOut
      });
      setCodeTitle('');
      setCodeDesc('');
      setSampleIn('');
      setSampleOut('');
      fetchQuestions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteCoding = async (id) => {
    try {
      await axiosClient.delete(`/questions/coding/${id}`);
      fetchQuestions();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/assessments" className="p-2 text-slate-500 hover:text-slate-800 bg-white rounded-full shadow-sm hover:shadow-md transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Manage Questions</h1>
        </div>

        <div className="flex gap-4 mb-6">
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'mcq' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('mcq')}
          >
            MCQ Questions
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'coding' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('coding')}
          >
            Coding Questions
          </button>
        </div>

        {activeTab === 'mcq' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel p-6 self-start">
              <h2 className="text-lg font-semibold mb-4">Add New MCQ</h2>
              <form onSubmit={handleAddMCQ} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Question</label>
                  <textarea value={mcqQues} onChange={(e)=>setMcqQues(e.target.value)} className="input-field h-24" required />
                </div>
                {mcqOptions.map((opt, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Option {i+1}</label>
                    <input type="text" value={opt} onChange={(e) => {
                      const newOpts = [...mcqOptions];
                      newOpts[i] = e.target.value;
                      setMcqOptions(newOpts);
                    }} className="input-field" required />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Correct Answer (Must match an option exactly)</label>
                  <input type="text" value={mcqAns} onChange={(e)=>setMcqAns(e.target.value)} className="input-field border-green-300" required />
                </div>
                <button type="submit" className="btn-primary w-full">Add MCQ</button>
              </form>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-2">Existing MCQs</h2>
              {questions.mcqs.map((q, i) => (
                <div key={q._id} className="glass-panel p-5 relative">
                  <button onClick={() => handleDeleteMCQ(q._id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                  <h3 className="font-semibold text-slate-800 pr-8">{i+1}. {q.question}</h3>
                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    {q.options.map((opt, j) => (
                      <li key={j} className={opt === q.answer ? 'text-green-600 font-semibold' : ''}>• {opt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'coding' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel p-6 self-start">
              <h2 className="text-lg font-semibold mb-4">Add Coding Question</h2>
              <form onSubmit={handleAddCoding} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Title</label>
                  <input type="text" value={codeTitle} onChange={(e)=>setCodeTitle(e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Problem Statement</label>
                  <textarea value={codeDesc} onChange={(e)=>setCodeDesc(e.target.value)} className="input-field h-32" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Sample Input</label>
                  <textarea value={sampleIn} onChange={(e)=>setSampleIn(e.target.value)} className="input-field h-20 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Sample Output</label>
                  <textarea value={sampleOut} onChange={(e)=>setSampleOut(e.target.value)} className="input-field h-20 font-mono text-sm" />
                </div>
                <button type="submit" className="btn-primary w-full">Add Coding Question</button>
              </form>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-2">Existing Coding Questions</h2>
              {questions.coding.map((q, i) => (
                <div key={q._id} className="glass-panel p-5 relative">
                  <button onClick={() => handleDeleteCoding(q._id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                  <h3 className="font-semibold text-slate-800 pr-8">{q.title}</h3>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3">{q.statement}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionManagement;
