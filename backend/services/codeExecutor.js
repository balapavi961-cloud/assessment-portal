const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const TIMEOUT = parseInt(process.env.CODE_EXEC_TIMEOUT, 10) || 10000;

const LANGUAGE_CONFIG = {
  javascript: {
    ext: 'js',
    run: (file) => ['node', [file]],
  },
  python: {
    ext: 'py',
    run: (file) => ['python', [file]],
  },
  java: {
    ext: 'java',
    compile: (dir, baseName) =>
      new Promise((resolve, reject) => {
        const proc = spawn('javac', [`${baseName}.java`], { cwd: dir });
        let err = '';
        proc.stderr.on('data', (d) => (err += d.toString()));
        proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err || 'Compilation failed'))));
      }),
    run: (dir, baseName) => ['java', ['-cp', dir, baseName]],
  },
  cpp: {
    ext: 'cpp',
    compile: (dir, baseName) =>
      new Promise((resolve, reject) => {
        const out = path.join(dir, 'program');
        const proc = spawn('g++', [`${baseName}.cpp`, '-o', out], { cwd: dir });
        let err = '';
        proc.stderr.on('data', (d) => (err += d.toString()));
        proc.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err || 'Compilation failed'))));
      }),
    run: (outFile) => [outFile, []],
  },
};

const runProcess = (command, args, input, cwd) => {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn(command, args, { cwd, timeout: TIMEOUT });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    if (input) proc.stdin.write(input);
    proc.stdin.end();

    const timer = setTimeout(() => {
      proc.kill();
      resolve({
        output: '',
        error: 'Execution timed out',
        executionTime: Date.now() - start,
        timedOut: true,
      });
    }, TIMEOUT);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        output: stdout.trim(),
        error: stderr.trim() || (code !== 0 ? `Process exited with code ${code}` : ''),
        executionTime: Date.now() - start,
        timedOut: false,
      });
    });
  });
};

/**
 * Execute code with optional stdin input
 */
const executeCode = async (language, code, input = '') => {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { output: '', error: `Unsupported language: ${language}`, executionTime: 0 };
  }

  const workDir = path.join(os.tmpdir(), `assess-${uuidv4()}`);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    const baseName = language === 'java' ? 'Main' : 'main';
    let filePath;

    if (language === 'java') {
      // Wrap in Main class if not present
      const javaCode = code.includes('class Main')
        ? code
        : `public class Main {\n  public static void main(String[] args) {\n${code}\n  }\n}`;
      filePath = path.join(workDir, 'Main.java');
      fs.writeFileSync(filePath, javaCode);
    } else if (language === 'cpp') {
      filePath = path.join(workDir, 'main.cpp');
      fs.writeFileSync(filePath, code);
    } else {
      filePath = path.join(workDir, `main.${config.ext}`);
      fs.writeFileSync(filePath, code);
    }

    if (config.compile) {
      await config.compile(workDir, baseName);
    }

    const [cmd, args] =
      language === 'java'
        ? config.run(workDir, baseName)
        : language === 'cpp'
          ? config.run(path.join(workDir, 'program'))
          : config.run(filePath);

    const result = await runProcess(cmd, args, input, workDir);
    return result;
  } catch (err) {
    return { output: '', error: err.message, executionTime: 0 };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

/**
 * Run against multiple test cases
 */
const runTestCases = async (language, code, testCases, includeHidden = false) => {
  const results = [];

  for (const tc of testCases) {
    if (tc.isHidden && !includeHidden) continue;

    const exec = await executeCode(language, code, tc.input || '');
    const passed =
      !exec.error &&
      !exec.timedOut &&
      normalizeOutput(exec.output) === normalizeOutput(tc.expectedOutput);

    results.push({
      testCaseId: tc._id,
      input: tc.isHidden ? '[Hidden]' : tc.input,
      output: exec.output,
      expectedOutput: tc.isHidden ? '[Hidden]' : tc.expectedOutput,
      passed,
      isHidden: tc.isHidden,
      executionTime: exec.executionTime,
      error: exec.error || (exec.timedOut ? 'Time limit exceeded' : ''),
      marks: passed ? (tc.marks || 1) : 0,
    });
  }

  return results;
};

const normalizeOutput = (str) =>
  (str || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/gm, '');

module.exports = { executeCode, runTestCases, normalizeOutput };
