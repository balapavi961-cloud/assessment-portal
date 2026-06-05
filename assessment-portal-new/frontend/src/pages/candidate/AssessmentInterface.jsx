import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import MonacoEditorComponent from '../../components/MonacoEditorComponent';
import { Clock, Send, ChevronRight, ChevronLeft } from 'lucide-react';

const AssessmentInterface = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState({ mcqs: [], coding: [] });
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState({});
  const [activeTab, setActiveTab] = useState('mcq'); // 'mcq' or 'coding'
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assRes, qRes] = await Promise.all([
          axiosClient.get(`/assessments/${id}`),
          axiosClient.get(`/questions/assessment/${id}`)
        ]);
        setAssessment(assRes.data);
        setQuestions(qRes.data);
        setTimeLeft(assRes.data.duration * 60); // minutes to seconds
      } catch (error) {
        console.error(error);
        alert('Failed to load assessment');
        navigate('/candidate');
      }
    };
    fetchData();
  }, [id, navigate]);

  useEffect(() => {
    if (timeLeft <= 0 && assessment) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, assessment]);

  const handleMCQAnswer = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleCodeSave = (qId, codeData) => {
    setAnswers(prev => ({ ...prev, [qId]: codeData }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await axiosClient.post('/submissions', {
        assessmentId: id,
        answers
      });
      alert('Assessment submitted successfully!');
      navigate('/candidate');
    } catch (error) {
      console.error(error);
      alert('Failed to submit. Please contact admin.');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!assessment) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const currentList = activeTab === 'mcq' ? questions.mcqs : questions.coding;
  const currentQ = currentList[activeQIndex];

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">{assessment.title}</h1>
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 font-mono text-lg font-semibold px-4 py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
              <Clock size={20} />
              {formatTime(timeLeft)}
            </div>
            <button 
              onClick={() => { if(window.confirm('Submit final assessment?')) handleSubmit(); }}
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send size={18} /> {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200">
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button 
                onClick={() => { setActiveTab('mcq'); setActiveQIndex(0); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'mcq' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                MCQs
              </button>
              <button 
                onClick={() => { setActiveTab('coding'); setActiveQIndex(0); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'coding' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Coding
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {currentList.map((q, idx) => {
              const isAnswered = answers[q._id] !== undefined && answers[q._id] !== '';
              return (
                <button
                  key={q._id}
                  onClick={() => setActiveQIndex(idx)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between
                    ${activeQIndex === idx ? 'bg-brand-50 border border-brand-200 text-brand-700' : 'hover:bg-slate-50 border border-transparent text-slate-600'}
                  `}
                >
                  <span>Question {idx + 1}</span>
                  {isAnswered && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                </button>
              );
            })}
            {currentList.length === 0 && <div className="text-sm text-slate-500 text-center py-4">No questions here.</div>}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-slate-50/50 flex flex-col">
          {currentQ ? (
            activeTab === 'mcq' ? (
              <div className="max-w-3xl mx-auto w-full p-8 overflow-y-auto flex-1">
                <div className="glass-panel p-8">
                  <h2 className="text-lg font-semibold text-slate-800 mb-6">
                    <span className="text-brand-600 mr-2">Q{activeQIndex + 1}.</span> 
                    {currentQ.question}
                  </h2>
                  <div className="space-y-3">
                    {currentQ.options.map((opt, i) => (
                      <label 
                        key={i} 
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                          ${answers[currentQ._id] === opt 
                            ? 'border-brand-500 bg-brand-50 shadow-sm' 
                            : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                          ${answers[currentQ._id] === opt ? 'border-brand-500' : 'border-slate-300'}`}>
                            {answers[currentQ._id] === opt && <div className="w-2.5 h-2.5 rounded-full bg-brand-500"></div>}
                        </div>
                        <span className="text-slate-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <button 
                    disabled={activeQIndex === 0}
                    onClick={() => setActiveQIndex(p => p - 1)}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                  >
                    <ChevronLeft size={18}/> Previous
                  </button>
                  <button 
                    disabled={activeQIndex === currentList.length - 1}
                    onClick={() => setActiveQIndex(p => p + 1)}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    Next <ChevronRight size={18}/>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden p-4 gap-4 h-full">
                {/* Problem Description */}
                <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
                  <div className="glass-panel p-6 overflow-y-auto flex-1">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{currentQ.title}</h2>
                    <div className="prose prose-sm text-slate-600 mb-6 whitespace-pre-wrap">
                      {currentQ.statement}
                    </div>
                    
                    {currentQ.sampleInput && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-1">Sample Input</h3>
                        <pre className="bg-slate-100 p-3 rounded-lg text-sm font-mono text-slate-800 overflow-x-auto">{currentQ.sampleInput}</pre>
                      </div>
                    )}
                    {currentQ.sampleOutput && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-1">Sample Output</h3>
                        <pre className="bg-slate-100 p-3 rounded-lg text-sm font-mono text-slate-800 overflow-x-auto">{currentQ.sampleOutput}</pre>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Editor Component */}
                <div className="w-2/3 h-full">
                  <MonacoEditorComponent 
                    question={currentQ} 
                    onSave={(data) => handleCodeSave(currentQ._id, data)}
                  />
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Select a question from the sidebar.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AssessmentInterface;
