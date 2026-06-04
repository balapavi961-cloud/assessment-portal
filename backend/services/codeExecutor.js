const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { executeCodeInJudge0 } = require('./judge0Service');

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
        let completed = false;
        const safeReject = (err) => {
          if (!completed) {
            completed = true;
            reject(err);
          }
        };
        const safeResolve = () => {
          if (!completed) {
            completed = true;
            resolve();
          }
        };

        const proc = spawn('javac', [`${baseName}.java`], { cwd: dir });
        let err = '';
        proc.on('error', (e) => safeReject(new Error(`Failed to start javac: ${e.message}`)));
        if (proc.stderr) {
          proc.stderr.on('data', (d) => (err += d.toString()));
        }
        proc.on('close', (code) => (code === 0 ? safeResolve() : safeReject(new Error(err || 'Compilation failed'))));
      }),
    run: (dir, baseName) => ['java', ['-cp', dir, baseName]],
  },
  cpp: {
    ext: 'cpp',
    compile: (dir, baseName) =>
      new Promise((resolve, reject) => {
        let completed = false;
        const safeReject = (err) => {
          if (!completed) {
            completed = true;
            reject(err);
          }
        };
        const safeResolve = (out) => {
          if (!completed) {
            completed = true;
            resolve(out);
          }
        };

        const out = path.join(dir, 'program');
        const proc = spawn('g++', [`${baseName}.cpp`, '-o', out], { cwd: dir });
        let err = '';
        proc.on('error', (e) => safeReject(new Error(`Failed to start g++: ${e.message}`)));
        if (proc.stderr) {
          proc.stderr.on('data', (d) => (err += d.toString()));
        }
        proc.on('close', (code) => (code === 0 ? safeResolve(out) : safeReject(new Error(err || 'Compilation failed'))));
      }),
    run: (outFile) => [outFile, []],
  },
};

const runProcess = (command, args, input, cwd) => {
  return new Promise((resolve) => {
    const start = Date.now();
    let proc;
    try {
      proc = spawn(command, args, { cwd, timeout: TIMEOUT });
    } catch (e) {
      return resolve({
        output: '',
        error: `Failed to spawn process: ${e.message}`,
        executionTime: 0,
        timedOut: false,
      });
    }

    let stdout = '';
    let stderr = '';

    proc.on('error', (err) => {
      stderr += `Execution error: ${err.message}\n`;
    });

    if (proc.stdout) {
      proc.stdout.on('data', (d) => (stdout += d.toString()));
    }
    if (proc.stderr) {
      proc.stderr.on('data', (d) => (stderr += d.toString()));
    }

    if (input && proc.stdin) {
      proc.stdin.on('error', (err) => {
        stderr += `Stdin error: ${err.message}\n`;
      });
      proc.stdin.write(input);
      proc.stdin.end();
    }

    const timer = setTimeout(() => {
      if (proc) proc.kill();
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
const executeCode = async (language, code, input = '', options = {}) => {
  if (process.env.USE_JUDGE0 === 'true') {
    return await executeCodeInJudge0(language, code, input, options);
  }

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
const runTestCases = async (language, code, testCases, includeHidden = false, options = {}) => {
  const results = [];

  for (const tc of testCases) {
    if (tc.isHidden && !includeHidden) continue;

    const exec = await executeCode(language, code, tc.input || '', options);
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
