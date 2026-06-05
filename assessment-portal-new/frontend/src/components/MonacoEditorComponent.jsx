import { useState } from 'react';
import Editor from '@monaco-editor/react';
import axiosClient from '../api/axiosClient';
import { Play, Loader2 } from 'lucide-react';

const MonacoEditorComponent = ({ question, onSave }) => {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Boilerplate code based on language
  const boilerplates = {
    python: 'def solve():\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    solve()',
    java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}',
    c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}'
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    setCode(boilerplates[e.target.value]);
  };

  const handleEditorChange = (value) => {
    setCode(value);
    onSave({ language, code: value });
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Compiling and running...');
    try {
      const res = await axiosClient.post('/compiler/run', {
        language,
        code,
        stdin: customInput
      });
      
      const { run, compile } = res.data;
      if (compile && compile.code !== 0) {
        setOutput(compile.stderr || compile.output);
      } else {
        setOutput(run.output || 'Program exited with no output.');
      }
    } catch (error) {
      setOutput('Error executing code. ' + (error.response?.data?.message || ''));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-700">
      {/* Header bar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800">
        <select 
          value={language} 
          onChange={handleLanguageChange}
          className="bg-slate-700 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 border border-slate-600"
        >
          <option value="python">Python 3</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
        </select>
        
        <button 
          onClick={handleRunCode}
          disabled={isRunning}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Run Code
        </button>
      </div>
      
      {/* Editor area */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language === 'c' || language === 'cpp' ? 'cpp' : language}
          theme="vs-dark"
          value={code || boilerplates[language]}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {/* Input / Output panel */}
      <div className="h-64 flex flex-col border-t border-slate-700 bg-slate-800">
        <div className="flex border-b border-slate-700">
          <div className="px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">Custom Input</div>
        </div>
        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          className="h-20 w-full bg-slate-900 text-slate-300 font-mono text-sm p-3 border-none resize-none focus:outline-none"
          placeholder="Enter custom standard input here..."
        />
        
        <div className="flex border-y border-slate-700">
          <div className="px-4 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">Output</div>
        </div>
        <div className="flex-1 bg-slate-950 p-3 overflow-y-auto">
          <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MonacoEditorComponent;
