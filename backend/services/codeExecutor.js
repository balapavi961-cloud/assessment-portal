const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { executeCodeInJudge0 } = require('./judge0Service');

const TIMEOUT = parseInt(process.env.CODE_EXEC_TIMEOUT, 10) || 10000;
const MAX_MEMORY_MB = parseInt(process.env.MAX_MEMORY_MB, 10) || 256;
const MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB output cap

/**
 * Build a safe spawn environment that always includes the system PATH
 * plus common compiler locations. This fixes spawn ENOENT on Debian/Ubuntu
 * containers where PATH is not forwarded by default.
 */
const getSpawnEnv = () => ({
  ...process.env,
  PATH: [
    process.env.PATH || '',
    '/usr/bin',
    '/usr/local/bin',
    '/usr/lib/jvm/java-17-openjdk-amd64/bin',
    '/usr/lib/jvm/java-17-openjdk-arm64/bin',
    // Fallback: detect JAVA_HOME at runtime
    process.env.JAVA_HOME ? `${process.env.JAVA_HOME}/bin` : '',
  ]
    .filter(Boolean)
    .join(':'),
});

const LANGUAGE_CONFIG = {
  javascript: {
    ext: 'js',
    run: (file) => ['node', [file]],
  },
  python: {
    ext: 'py',
    // Use python3 explicitly — 'python' may not exist even with python-is-python3
    run: (file) => ['python3', [file]],
  },
  java: {
    ext: 'java',
    compile: (dir, baseName) =>
      new Promise((resolve, reject) => {
        let completed = false;
        const safeReject = (err) => {
          if (!completed) { completed = true; reject(err); }
        };
        const safeResolve = () => {
          if (!completed) { completed = true; resolve(); }
        };

        const proc = spawn('javac', [`${baseName}.java`], {
          cwd: dir,
          env: getSpawnEnv(),
          timeout: TIMEOUT,
        });
        let err = '';
        proc.on('error', (e) =>
          safeReject(new Error(`javac not found or failed to start: ${e.message}. Ensure OpenJDK is installed.`))
        );
        if (proc.stderr) {
          proc.stderr.on('data', (d) => (err += d.toString()));
        }
        proc.on('close', (code) =>
          code === 0 ? safeResolve() : safeReject(new Error(err || 'Java compilation failed'))
        );
      }),
    run: (dir, baseName) => ['java', ['-cp', dir, '-Xmx' + MAX_MEMORY_MB + 'm', baseName]],
  },
  cpp: {
    ext: 'cpp',
    compile: (dir, baseName) =>
      new Promise((resolve, reject) => {
        let completed = false;
        const safeReject = (err) => {
          if (!completed) { completed = true; reject(err); }
        };
        const safeResolve = (out) => {
          if (!completed) { completed = true; resolve(out); }
        };

        const outFile = path.join(dir, 'program');
        const proc = spawn('g++', [`${baseName}.cpp`, '-o', outFile, '-O2', '-std=c++17'], {
          cwd: dir,
          env: getSpawnEnv(),
          timeout: TIMEOUT,
        });
        let err = '';
        proc.on('error', (e) =>
          safeReject(new Error(`g++ not found or failed to start: ${e.message}. Ensure build-essential is installed.`))
        );
        if (proc.stderr) {
          proc.stderr.on('data', (d) => (err += d.toString()));
        }
        proc.on('close', (code) =>
          code === 0 ? safeResolve(outFile) : safeReject(new Error(err || 'C++ compilation failed'))
        );
      }),
    run: (outFile) => [outFile, []],
  },
};

/**
 * Spawn a process with full environment, time limit, and output cap.
 * Returns { output, error, executionTime, timedOut }
 */
const runProcess = (command, args, input, cwd) => {
  return new Promise((resolve) => {
    const start = Date.now();
    let proc;

    try {
      proc = spawn(command, args, {
        cwd,
        env: getSpawnEnv(),
        // Node's built-in timeout kills the process after N ms
        timeout: TIMEOUT,
      });
    } catch (e) {
      return resolve({
        output: '',
        error: `Failed to spawn '${command}': ${e.message}`,
        executionTime: 0,
        timedOut: false,
      });
    }

    let stdout = '';
    let stderr = '';
    let outputTruncated = false;

    proc.on('error', (err) => {
      stderr += `Execution error: ${err.message}\n`;
    });

    if (proc.stdout) {
      proc.stdout.on('data', (d) => {
        if (stdout.length < MAX_OUTPUT_BYTES) {
          stdout += d.toString();
        } else if (!outputTruncated) {
          outputTruncated = true;
          stdout += '\n[Output truncated — exceeded 1 MB limit]';
        }
      });
    }
    if (proc.stderr) {
      proc.stderr.on('data', (d) => (stderr += d.toString()));
    }

    if (input && proc.stdin) {
      proc.stdin.on('error', (err) => {
        stderr += `Stdin error: ${err.message}\n`;
      });
      try {
        proc.stdin.write(input);
        proc.stdin.end();
      } catch (_) {
        // stdin may already be closed
      }
    }

    // Manual timeout guard (belt-and-suspenders alongside spawn's timeout option)
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (_) {}
      resolve({
        output: '',
        error: 'Time limit exceeded',
        executionTime: Date.now() - start,
        timedOut: true,
      });
    }, TIMEOUT + 500);

    proc.on('close', (code, signal) => {
      clearTimeout(timer);
      const timedOut = signal === 'SIGKILL' && Date.now() - start >= TIMEOUT;
      resolve({
        output: stdout.trim(),
        error:
          stderr.trim() ||
          (timedOut ? 'Time limit exceeded' : '') ||
          (code !== 0 ? `Process exited with code ${code}` : ''),
        executionTime: Date.now() - start,
        timedOut,
      });
    });
  });
};

/**
 * Execute code with optional stdin input.
 * Supports: javascript, python, java, cpp
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
      // Ensure user code is wrapped in a Main class if not already
      const javaCode = code.includes('class Main')
        ? code
        : `public class Main {\n  public static void main(String[] args) throws Exception {\n${code}\n  }\n}`;
      filePath = path.join(workDir, 'Main.java');
      fs.writeFileSync(filePath, javaCode, 'utf8');
    } else if (language === 'cpp') {
      filePath = path.join(workDir, 'main.cpp');
      fs.writeFileSync(filePath, code, 'utf8');
    } else {
      filePath = path.join(workDir, `main.${config.ext}`);
      fs.writeFileSync(filePath, code, 'utf8');
    }

    if (config.compile) {
      await config.compile(workDir, baseName);
    }

    let cmd, args;
    if (language === 'java') {
      [cmd, args] = config.run(workDir, baseName);
    } else if (language === 'cpp') {
      [cmd, args] = config.run(path.join(workDir, 'program'));
    } else {
      [cmd, args] = config.run(filePath);
    }

    return await runProcess(cmd, args, input, workDir);
  } catch (err) {
    return { output: '', error: err.message, executionTime: 0 };
  } finally {
    // Always clean up temp files
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
  }
};

/**
 * Run code against an array of test cases.
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
