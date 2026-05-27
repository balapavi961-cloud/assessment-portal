import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Plus, Trash2, Download, Eye, EyeOff } from 'lucide-react';
import { utcToLocalInput, localInputToUTC, defaultLocalSchedule } from '../../utils/dateTime';

const TestEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [test, setTest] = useState({
    title: '',
    description: '',
    instructions: '',
    duration: 60,
    ...defaultLocalSchedule(),
    passingMarks: 0,
    negativeMarking: false,
    negativeMarkValue: 0.25,
    randomizeQuestions: false,
    preventCopyPaste: true,
    fullscreenRequired: true,
    maxTabViolations: 3,
    showLeaderboard: true,
  });
  const [mcqs, setMcqs] = useState([]);
  const [codings, setCodings] = useState([]);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    if (!isNew) {
      api.get(`/tests/${id}`).then((res) => {
        const { test: t, mcqQuestions, codingQuestions } = res.data.data;
        setTest({
          ...t,
          startTime: utcToLocalInput(t.startTime),
          endTime: utcToLocalInput(t.endTime),
        });
        setMcqs(mcqQuestions);
        setCodings(codingQuestions);
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const buildTestPayload = () => ({
    ...test,
    startTime: localInputToUTC(test.startTime),
    endTime: localInputToUTC(test.endTime),
  });

  const saveTest = async () => {
    try {
      const payload = buildTestPayload();
      if (isNew) {
        const { data } = await api.post('/tests', payload);
        toast.success('Test created');
        navigate(`/admin/tests/${data.data._id}`);
      } else {
        await api.put(`/tests/${id}`, payload);
        toast.success('Test updated');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const addMcq = async (mcq) => {
    const { data } = await api.post(`/tests/${id}/mcq`, mcq);
    setMcqs([...mcqs, data.data]);
    toast.success('MCQ added');
  };

  const addCoding = async (coding) => {
    const { data } = await api.post(`/tests/${id}/coding`, coding);
    setCodings([...codings, data.data]);
    toast.success('Coding question added');
  };

  const deleteMcq = async (qid) => {
    await api.delete(`/tests/mcq/${qid}`);
    setMcqs(mcqs.filter((q) => q._id !== qid));
    toast.success('Deleted');
  };

  const deleteCoding = async (qid) => {
    await api.delete(`/tests/coding/${qid}`);
    setCodings(codings.filter((q) => q._id !== qid));
    toast.success('Deleted');
  };

  const togglePublish = async () => {
    try {
      const { data } = await api.patch(`/tests/${id}/publish`);
      setTest((t) => ({ ...t, status: data.data.status }));
      toast.success(data.message || 'Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publish failed — add at least one question first');
    }
  };

  if (loading && !isNew) return <Layout admin><LoadingSpinner /></Layout>;

  return (
    <Layout admin>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{isNew ? 'Create Test' : 'Edit Test'}</h1>
          {!isNew && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={togglePublish}
                className={
                  test.status === 'published' ? 'btn-secondary flex items-center gap-2' : 'btn-primary flex items-center gap-2'
                }
              >
                {test.status === 'published' ? (
                  <>
                    <EyeOff className="w-4 h-4" /> Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> Publish for candidates
                  </>
                )}
              </button>
              <a href={`/api/tests/${id}/export/csv`} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> CSV
              </a>
              <a href={`/api/tests/${id}/export/pdf`} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> PDF
              </a>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {['settings', 'mcq', 'coding', 'submissions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 capitalize font-medium border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'settings' && (
          <div className="card space-y-4">
            {['title', 'description', 'instructions'].map((field) => (
              <div key={field}>
                <label className="label capitalize">{field}</label>
                {field === 'instructions' || field === 'description' ? (
                  <textarea
                    className="input-field min-h-[100px]"
                    value={test[field]}
                    onChange={(e) => setTest({ ...test, [field]: e.target.value })}
                  />
                ) : (
                  <input
                    className="input-field"
                    value={test[field]}
                    onChange={(e) => setTest({ ...test, [field]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <p className="text-sm text-gray-500">
              Start and end times use your computer&apos;s local timezone (
              {Intl.DateTimeFormat().resolvedOptions().timeZone}).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Duration (minutes)</label>
                <input
                  type="number"
                  className="input-field"
                  value={test.duration}
                  onChange={(e) => setTest({ ...test, duration: +e.target.value })}
                />
              </div>
              <div>
                <label className="label">Start Time</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={test.startTime}
                  onChange={(e) => setTest({ ...test, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="label">End Time</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={test.endTime}
                  onChange={(e) => setTest({ ...test, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['negativeMarking', 'Negative Marking'],
                ['randomizeQuestions', 'Randomize Questions'],
                ['preventCopyPaste', 'Prevent Copy/Paste'],
                ['fullscreenRequired', 'Fullscreen Required'],
                ['showLeaderboard', 'Show Leaderboard'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={test[key]}
                    onChange={(e) => setTest({ ...test, [key]: e.target.checked })}
                    className="rounded text-primary-600"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            <button onClick={saveTest} className="btn-primary">
              {isNew ? 'Create Test' : 'Save Settings'}
            </button>
          </div>
        )}

        {activeTab === 'mcq' && !isNew && (
          <McqForm onAdd={addMcq} />
        )}
        {activeTab === 'mcq' && !isNew && (
          <div className="space-y-3">
            {mcqs.map((q, i) => (
              <div key={q._id} className="card flex justify-between">
                <div>
                  <span className="text-xs text-primary-600 font-medium">Q{i + 1}</span>
                  <p className="mt-1">{q.questionText}</p>
                  <p className="text-sm text-gray-500 mt-1">{q.marks} marks • {q.isMultipleChoice ? 'Multiple' : 'Single'} choice</p>
                </div>
                <button onClick={() => deleteMcq(q._id)} className="text-red-500 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'coding' && !isNew && (
          <CodingForm onAdd={addCoding} />
        )}
        {activeTab === 'coding' && !isNew && (
          <div className="space-y-3">
            {codings.map((q, i) => (
              <div key={q._id} className="card flex justify-between">
                <div>
                  <span className="text-xs text-green-600 font-medium">Coding {i + 1}</span>
                  <p className="font-medium mt-1">{q.title}</p>
                  <p className="text-sm text-gray-500">{q.marks} marks • {q.testCases?.length} test cases</p>
                </div>
                <button onClick={() => deleteCoding(q._id)} className="text-red-500 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'submissions' && !isNew && <SubmissionsPanel testId={id} />}
      </div>
    </Layout>
  );
};

const McqForm = ({ onAdd }) => {
  const [mcq, setMcq] = useState({
    questionText: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correctAnswers: [],
    isMultipleChoice: false,
    marks: 1,
  });

  const handleAdd = () => {
    if (!mcq.questionText || mcq.correctAnswers.length === 0) {
      toast.error('Fill question and correct answer');
      return;
    }
    onAdd(mcq);
    setMcq({ ...mcq, questionText: '', correctAnswers: [] });
  };

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add MCQ</h3>
      <textarea
        className="input-field"
        placeholder="Question text"
        value={mcq.questionText}
        onChange={(e) => setMcq({ ...mcq, questionText: e.target.value })}
      />
      {mcq.options.map((opt, i) => (
        <div key={opt.id} className="flex gap-2 items-center">
          <input
            type={mcq.isMultipleChoice ? 'checkbox' : 'radio'}
            name="correct"
            checked={mcq.correctAnswers.includes(opt.id)}
            onChange={() => {
              const correct = mcq.isMultipleChoice
                ? mcq.correctAnswers.includes(opt.id)
                  ? mcq.correctAnswers.filter((c) => c !== opt.id)
                  : [...mcq.correctAnswers, opt.id]
                : [opt.id];
              setMcq({ ...mcq, correctAnswers: correct });
            }}
          />
          <input
            className="input-field flex-1"
            placeholder={`Option ${opt.id.toUpperCase()}`}
            value={opt.text}
            onChange={(e) => {
              const options = [...mcq.options];
              options[i].text = e.target.value;
              setMcq({ ...mcq, options });
            }}
          />
        </div>
      ))}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={mcq.isMultipleChoice}
            onChange={(e) => setMcq({ ...mcq, isMultipleChoice: e.target.checked, correctAnswers: [] })}
          />
          Multiple choice
        </label>
        <input
          type="number"
          className="input-field w-24"
          value={mcq.marks}
          onChange={(e) => setMcq({ ...mcq, marks: +e.target.value })}
          placeholder="Marks"
        />
      </div>
      <button onClick={handleAdd} className="btn-primary">Add MCQ</button>
    </div>
  );
};

const CodingForm = ({ onAdd }) => {
  const [coding, setCoding] = useState({
    title: '',
    description: '',
    sampleInput: '',
    sampleOutput: '',
    marks: 10,
    testCases: [{ input: '', expectedOutput: '', isHidden: true, marks: 1 }],
    starterCode: {
      javascript: 'function solution() {\n  // your code\n}',
      python: 'def solution():\n    pass',
      java: 'public class Main {\n  public static void main(String[] args) {\n  }\n}',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n  return 0;\n}',
    },
  });

  const handleAdd = () => {
    if (!coding.title || !coding.description) {
      toast.error('Fill title and description');
      return;
    }
    onAdd(coding);
  };

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Coding Question</h3>
      <input className="input-field" placeholder="Title" value={coding.title} onChange={(e) => setCoding({ ...coding, title: e.target.value })} />
      <textarea className="input-field min-h-[80px]" placeholder="Description" value={coding.description} onChange={(e) => setCoding({ ...coding, description: e.target.value })} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Sample Input</label>
          <textarea
            className="input-field font-mono text-sm resize-y min-h-[80px]"
            placeholder={"e.g.\n5\n1 2 3 4 5"}
            value={coding.sampleInput}
            onChange={(e) => setCoding({ ...coding, sampleInput: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Sample Output</label>
          <textarea
            className="input-field font-mono text-sm resize-y min-h-[80px]"
            placeholder={"e.g.\n15"}
            value={coding.sampleOutput}
            onChange={(e) => setCoding({ ...coding, sampleOutput: e.target.value })}
          />
        </div>
      </div>
      <input type="number" className="input-field w-24" value={coding.marks} onChange={(e) => setCoding({ ...coding, marks: +e.target.value })} />
      <div>
        <label className="label">Test Cases</label>
        {coding.testCases.map((tc, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Test Case {i + 1}</span>
              {coding.testCases.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-red-500 hover:text-red-700"
                  onClick={() => {
                    const tcs = coding.testCases.filter((_, idx) => idx !== i);
                    setCoding({ ...coding, testCases: tcs });
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Input</label>
                <textarea
                  className="input-field font-mono text-sm resize-y min-h-[80px]"
                  placeholder={"e.g.\n5\n1 2 3 4 5"}
                  value={tc.input}
                  onChange={(e) => {
                    const tcs = [...coding.testCases];
                    tcs[i] = { ...tcs[i], input: e.target.value };
                    setCoding({ ...coding, testCases: tcs });
                  }}
                />
              </div>
              <div>
                <label className="label text-xs">Expected Output</label>
                <textarea
                  className="input-field font-mono text-sm resize-y min-h-[80px]"
                  placeholder={"e.g.\n15"}
                  value={tc.expectedOutput}
                  onChange={(e) => {
                    const tcs = [...coding.testCases];
                    tcs[i] = { ...tcs[i], expectedOutput: e.target.value };
                    setCoding({ ...coding, testCases: tcs });
                  }}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={tc.isHidden}
                onChange={(e) => {
                  const tcs = [...coding.testCases];
                  tcs[i] = { ...tcs[i], isHidden: e.target.checked };
                  setCoding({ ...coding, testCases: tcs });
                }}
                className="rounded text-primary-600"
              />
              <span className="text-gray-600 dark:text-gray-400">Hidden test case (not shown to candidate)</span>
            </label>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-primary-600"
          onClick={() => setCoding({ ...coding, testCases: [...coding.testCases, { input: '', expectedOutput: '', isHidden: true }] })}
        >
          + Add test case
        </button>
      </div>
      <button onClick={handleAdd} className="btn-primary">Add Coding Question</button>
    </div>
  );
};

const SubmissionsPanel = ({ testId }) => {
  const [subs, setSubs] = useState([]);
  useEffect(() => {
    api.get(`/tests/${testId}/submissions`).then((res) => setSubs(res.data.data));
  }, [testId]);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Email</th>
            <th className="text-left py-2">Score</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s._id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2">{s.user?.name}</td>
              <td className="py-2">{s.user?.email}</td>
              <td className="py-2">{s.totalScore}/{s.maxScore} ({s.percentage}%)</td>
              <td className="py-2">{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestEditor;
