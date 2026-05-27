import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Play,
  Send,
  Grid3X3,
} from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
];

const ExamInterface = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [codingState, setCodingState] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [runOutput, setRunOutput] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [codingSubmitResults, setCodingSubmitResults] = useState({});
  const saveTimerRef = useRef(null);
  const sessionKey = `exam_${testId}`;

  // Load exam data
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.post(`/submissions/${testId}/start`);
        setExamData(data.data);

        const expires = new Date(data.data.expiresAt).getTime();
        setTimeLeft(Math.max(0, Math.floor((expires - Date.now()) / 1000)));

        // Restore from sessionStorage
        const saved = sessionStorage.getItem(sessionKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed.answers || {});
          setCodingState(parsed.codingState || {});
          setCurrentIndex(parsed.currentIndex || 0);
        } else {
          const initCoding = {};
          data.data.codingQuestions.forEach((q) => {
            initCoding[q._id] = {
              code: q.starterCode?.javascript || '',
              language: 'javascript',
            };
          });
          setCodingState(initCoding);
        }

        // Enter fullscreen
        if (data.data.test.fullscreenRequired) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Cannot start test');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId, navigate, sessionKey]);

  // Persist to sessionStorage
  useEffect(() => {
    if (!examData) return;
    sessionStorage.setItem(
      sessionKey,
      JSON.stringify({ answers, codingState, currentIndex })
    );
  }, [answers, codingState, currentIndex, examData, sessionKey]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || !examData) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, examData]);

  // Proctoring: tab switch detection
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.hidden && examData) {
        try {
          const { data } = await api.post(`/submissions/${testId}/violation`, {
            type: 'tab_switch',
            details: 'Tab switched or window minimized',
          });
          setViolations(data.data.tabViolations);
          toast.error(`Warning ${data.data.tabViolations}/${data.data.maxViolations}: Tab switch detected!`, {
            duration: 5000,
          });
          if (data.data.autoSubmit) {
            toast.error('Maximum violations reached. Test auto-submitted.');
            handleSubmit(true);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    const handleBlur = () => handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    // Prevent refresh warning
    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);

    // Prevent copy paste if enabled
    const preventCopy = (e) => {
      if (examData?.test?.preventCopyPaste) {
        e.preventDefault();
        toast.error('Copy/paste is disabled during the exam');
      }
    };
    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventCopy);
    };
  }, [examData, testId]);

  const questions = examData
    ? examData.questionOrder.map((qId) => {
        const mcq = examData.mcqQuestions.find((q) => q._id === qId);
        if (mcq) return { ...mcq, type: 'mcq' };
        const coding = examData.codingQuestions.find((q) => q._id === qId);
        return { ...coding, type: 'coding' };
      })
    : [];

  const currentQ = questions[currentIndex];

  const saveMcqAnswer = useCallback(
    async (questionId, selected) => {
      setAnswers((prev) => ({ ...prev, [questionId]: selected }));
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.put(`/submissions/${testId}/mcq`, { questionId, selectedAnswers: selected });
        } catch (e) {
          console.error('Auto-save failed', e);
        }
      }, 500);
    },
    [testId]
  );

  const saveCoding = useCallback(
    async (questionId, code, language) => {
      setCodingState((prev) => ({ ...prev, [questionId]: { code, language } }));
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.put(`/submissions/${testId}/coding/save`, { questionId, code, language });
        } catch (e) {
          console.error('Code save failed', e);
        }
      }, 1000);
    },
    [testId]
  );

  const runCode = async () => {
    const state = codingState[currentQ._id];
    try {
      const { data } = await api.post(`/submissions/${testId}/coding/run`, {
        questionId: currentQ._id,
        code: state.code,
        language: state.language,
        customInput: '',
      });
      setRunOutput(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Run failed');
    }
  };

  const submitCoding = async () => {
    const state = codingState[currentQ._id];
    setSubmitting(true);
    try {
      const { data } = await api.post(`/submissions/${testId}/coding/submit`, {
        questionId: currentQ._id,
        code: state.code,
        language: state.language,
      });
      const result = data.data;
      setCodingSubmitResults((prev) => ({ ...prev, [currentQ._id]: result }));
      setRunOutput(null);
      const passedCount = result.passed;
      const totalCount = result.total;
      const scoreMsg = `${passedCount}/${totalCount} test cases passed • Score: ${result.score}/${result.maxScore}`;
      if (passedCount === totalCount) {
        toast.success(`All passed! ${scoreMsg}`);
      } else {
        toast.error(scoreMsg);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (auto = false) => {
    if (!auto && !confirm('Are you sure you want to submit?')) return;
    try {
      const { data } = await api.post(`/submissions/${testId}/submit`);
      sessionStorage.removeItem(sessionKey);
      document.exitFullscreen?.().catch(() => {});
      toast.success(auto ? 'Time up! Test auto-submitted.' : 'Test submitted!');
      navigate(`/tests/${testId}/result`, { state: { result: data.data } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed');
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isAnswered = (q) => {
    if (q.type === 'mcq') return (answers[q._id] || []).length > 0;
    return codingState[q._id]?.code?.length > 10;
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div>
          <h1 className="font-semibold">{examData?.test?.title}</h1>
          <p className="text-xs text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {violations > 0 && (
            <span className="flex items-center gap-1 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Warnings: {violations}/{examData?.test?.maxTabViolations}
            </span>
          )}
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timeLeft < 300 ? 'text-red-600' : ''}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          <button onClick={() => setShowPalette(!showPalette)} className="btn-secondary p-2">
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => handleSubmit(false)} className="btn-primary flex items-center gap-2">
            <Send className="w-4 h-4" /> Submit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question palette */}
        {showPalette && (
          <aside className="w-48 bg-white dark:bg-gray-900 border-r p-3 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500 mb-2">Question Palette</p>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => (
                <button
                  key={q._id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-9 h-9 rounded text-sm font-medium ${
                    i === currentIndex
                      ? 'bg-primary-600 text-white'
                      : isAnswered(q)
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs space-y-1">
              <p className="flex items-center gap-2"><span className="w-3 h-3 bg-green-100 rounded" /> Answered</p>
              <p className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-100 rounded" /> Unanswered</p>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentQ?.type === 'mcq' ? (
            <div className="max-w-3xl mx-auto card">
              <span className="text-xs text-primary-600 font-medium">MCQ • {currentQ.marks} marks</span>
              <h2 className="text-lg font-medium mt-2 whitespace-pre-wrap">{currentQ.questionText}</h2>
              <div className="mt-6 space-y-3">
                {currentQ.options.map((opt) => {
                  const selected = answers[currentQ._id] || [];
                  const isSelected = selected.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                      }`}
                    >
                      <input
                        type={currentQ.isMultipleChoice ? 'checkbox' : 'radio'}
                        name={`q-${currentQ._id}`}
                        checked={isSelected}
                        onChange={() => {
                          let newSelected;
                          if (currentQ.isMultipleChoice) {
                            newSelected = isSelected
                              ? selected.filter((s) => s !== opt.id)
                              : [...selected, opt.id];
                          } else {
                            newSelected = [opt.id];
                          }
                          saveMcqAnswer(currentQ._id, newSelected);
                        }}
                        className="mt-1"
                      />
                      <span>{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Left: Problem statement + results */}
              <div className="card overflow-y-auto max-h-[calc(100vh-200px)] space-y-4">
                <div>
                  <span className="text-xs text-green-600 font-medium">Coding • {currentQ.marks} marks</span>
                  <h2 className="text-lg font-bold mt-1">{currentQ.title}</h2>
                  <div className="mt-4 prose dark:prose-invert text-sm whitespace-pre-wrap">{currentQ.description}</div>
                </div>

                {/* Sample I/O */}
                {(currentQ.sampleInput || currentQ.sampleOutput) && (
                  <div className="grid grid-cols-2 gap-3">
                    {currentQ.sampleInput && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Sample Input</p>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono whitespace-pre-wrap break-all">{currentQ.sampleInput}</pre>
                      </div>
                    )}
                    {currentQ.sampleOutput && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Sample Output</p>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono whitespace-pre-wrap break-all">{currentQ.sampleOutput}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Run output */}
                {runOutput && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-xs font-semibold mb-1 text-gray-500">▶ Run Output</p>
                    <pre className="text-sm font-mono whitespace-pre-wrap">{runOutput.output || runOutput.error}</pre>
                    {runOutput.executionTime && (
                      <p className="text-xs text-gray-400 mt-1">{runOutput.executionTime}ms</p>
                    )}
                  </div>
                )}

                {/* Submit results panel */}
                {codingSubmitResults[currentQ._id] && (
                  <TestCaseResultPanel result={codingSubmitResults[currentQ._id]} />
                )}
              </div>

              {/* Right: Editor */}
              <div className="card flex flex-col">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <select
                    className="input-field w-auto"
                    value={codingState[currentQ._id]?.language || 'javascript'}
                    onChange={(e) =>
                      saveCoding(currentQ._id, codingState[currentQ._id]?.code, e.target.value)
                    }
                  >
                    {LANGUAGES.filter((l) => currentQ.allowedLanguages?.includes(l.id)).map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                  <button onClick={runCode} className="btn-secondary flex items-center gap-1 text-sm">
                    <Play className="w-4 h-4" /> Run
                  </button>
                  <button onClick={submitCoding} disabled={submitting} className="btn-primary flex items-center gap-1 text-sm">
                    <Send className="w-4 h-4" /> {submitting ? 'Evaluating…' : 'Submit Code'}
                  </button>
                </div>
                <div className="flex-1 min-h-[400px] border rounded-lg overflow-hidden">
                  <Editor
                    height="100%"
                    language={codingState[currentQ._id]?.language || 'javascript'}
                    theme="vs-dark"
                    value={codingState[currentQ._id]?.code || ''}
                    onChange={(value) =>
                      saveCoding(currentQ._id, value, codingState[currentQ._id]?.language)
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      readOnly: false,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer navigation */}
      <footer className="bg-white dark:bg-gray-900 border-t px-4 py-3 flex justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <button
          onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
          disabled={currentIndex === questions.length - 1}
          className="btn-primary flex items-center gap-2"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
};

/* ─── Test Case Result Panel ─────────────────────────────────────────────── */
const TestCaseResultPanel = ({ result }) => {
  const { score, maxScore, passed, total, results = [], hiddenResults = [] } = result;
  const allPassed = passed === total;

  return (
    <div className="space-y-3">
      {/* Score summary */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-lg font-medium text-sm ${
          allPassed
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
        }`}
      >
        <span>
          {allPassed ? '🎉' : '⚠️'} {passed}/{total} test cases passed
        </span>
        <span className="font-bold">
          {score}/{maxScore} marks
        </span>
      </div>

      {/* Visible test cases */}
      {results.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Visible Test Cases</p>
          <div className="space-y-2">
            {results.map((tc, i) => (
              <div
                key={tc.testCaseId || i}
                className={`rounded-lg border text-sm overflow-hidden ${
                  tc.passed
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-red-200 dark:border-red-800'
                }`}
              >
                {/* Header */}
                <div
                  className={`flex items-center justify-between px-3 py-1.5 text-xs font-semibold ${
                    tc.passed
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}
                >
                  <span>Test Case {i + 1}</span>
                  <span>{tc.passed ? '✅ Passed' : '❌ Failed'}</span>
                </div>
                {/* I/O body */}
                <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {tc.input !== undefined && tc.input !== '' && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-gray-400 mb-1">Input</p>
                      <pre className="font-mono text-xs whitespace-pre-wrap break-all">{tc.input}</pre>
                    </div>
                  )}
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-400 mb-1">Your Output</p>
                    <pre
                      className={`font-mono text-xs whitespace-pre-wrap break-all ${
                        tc.passed ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tc.output || <span className="italic text-gray-400">(no output)</span>}
                    </pre>
                  </div>
                  {!tc.passed && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-gray-400 mb-1">Expected Output</p>
                      <pre className="font-mono text-xs whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">
                        {tc.expectedOutput}
                      </pre>
                    </div>
                  )}
                  {tc.error && (
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-900/10">
                      <p className="text-xs text-red-500 font-mono whitespace-pre-wrap">{tc.error}</p>
                    </div>
                  )}
                </div>
                {/* Timing */}
                <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900">
                  {tc.executionTime}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden test cases */}
      {hiddenResults.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hidden Test Cases</p>
          <div className="space-y-1.5">
            {hiddenResults.map((tc, i) => (
              <div
                key={tc.testCaseId || i}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${
                  tc.passed
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                }`}
              >
                <span className="font-medium">Hidden Test Case {tc.index || i + 1}</span>
                <div className="flex items-center gap-3 text-xs">
                  {tc.executionTime > 0 && (
                    <span className="text-gray-400">{tc.executionTime}ms</span>
                  )}
                  {!tc.passed && tc.error && (
                    <span className="italic opacity-80">{tc.error}</span>
                  )}
                  <span className="font-bold">{tc.passed ? '✅ Passed' : '❌ Failed'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInterface;
