/**
 * codeExecutor.js
 *
 * Local code execution engine using Docker-installed compilers.
 * Supports: JavaScript (Node.js), Python 3, Java 17, C++ (g++)
 *
 * All execution is done via child_process.spawn() with:
 *   - Full PATH inheritance so compilers are always found
 *   - Per-language memory limits
 *   - Hard execution time limit
 *   - 1 MB output cap to prevent runaway output
 *   - Automatic temp-file cleanup
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// ─── Configuration ────────────────────────────────────────────────────────────

const TIMEOUT_MS   = parseInt(process.env.CODE_EXEC_TIMEOUT, 10) || 10000;
const MAX_MEM_MB   = parseInt(process.env.MAX_MEMORY_MB, 10)   || 256;
const MAX_OUT_BYTES = 1024 * 1024; // 1 MB output cap

// ─── Spawn Environment ────────────────────────────────────────────────────────

/**
 * Build a spawn environment that always inherits the full system PATH
 * plus explicit compiler locations for both amd64 and arm64 hosts.
 *
 * Without this, child_process.spawn() inside Docker starts with a
 * minimal environment where /usr/bin is NOT in PATH, causing ENOENT
 * errors for java, javac, python3, and g++ even when they are installed.
 */
const getSpawnEnv = () => ({
  ...process.env,
  PATH: [
    process.env.PATH || '',
    '/usr/bin',
    '/usr/local/bin',
    '/usr/sbin',
    '/sbin',
    '/bin',
    // Java on amd64 (Render, Railway default)
    '/usr/lib/jvm/java-17-openjdk-amd64/bin',
    // Java on arm64 (Koyeb, Apple Silicon)
    '/usr/lib/jvm/java-17-openjdk-arm64/bin',
    // JAVA_HOME from Dockerfile ENV (whichever resolved at build time)
    process.env.JAVA_HOME ? `${process.env.JAVA_HOME}/bin` : '',
  ]
    .filter(Boolean)
    .join(':'),
});

// ─── Language Configurations ──────────────────────────────────────────────────

const LANGUAGE_CONFIG = {
  javascript: {
    ext: 'js',
    compile: null,
    run: (file) => ({ cmd: 'node', args: [file] }),
  },

  python: {
    ext: 'py',
    compile: null,
    // Use python3 explicitly — 'python' binary may not exist even if python-is-python3 is installed
    run: (file) => ({ cmd: 'python3', args: [file] }),
  },

  java: {
    ext: 'java',
    /**
     * Compile Main.java with javac.
     * The source file MUST be named Main.java and contain `public class Main`.
     */
    compile: (dir, baseName) =>
      new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, val) => { if (!done) { done = true; fn(val); } };

        const proc = spawn('javac', [`${baseName}.java`], {
          cwd: dir,
          env: getSpawnEnv(),
          timeout: TIMEOUT_MS,
        });

        let stderr = '';
        proc.stderr?.on('data', (d) => (stderr += d.toString()));
        proc.on('error', (e) =>
          finish(reject, new Error(
            `javac failed to start: ${e.message}. ` +
            `Verify OpenJDK 17 is installed in the Docker image.`
          ))
        );
        proc.on('close', (code) =>
          code === 0
            ? finish(resolve, undefined)
            : finish(reject, new Error(stderr.trim() || 'Java compilation failed'))
        );
      }),

    // Run with classpath pointing at the temp dir; limit JVM heap to MAX_MEM_MB
    run: (dir, baseName) => ({
      cmd: 'java',
      args: [
        `-Xmx${MAX_MEM_MB}m`,
        `-Xms32m`,
        '-cp', dir,
        baseName,
      ],
    }),
  },

  cpp: {
    ext: 'cpp',
    /**
     * Compile main.cpp with g++ → executable named "program" in the same dir.
     * Returns the full path to the compiled binary.
     */
    compile: (dir, baseName) =>
      new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, val) => { if (!done) { done = true; fn(val); } };

        const outFile = path.join(dir, 'program');
        const proc = spawn(
          'g++',
          [`${baseName}.cpp`, '-o', outFile, '-O2', '-std=c++17', '-lm'],
          { cwd: dir, env: getSpawnEnv(), timeout: TIMEOUT_MS }
        );

        let stderr = '';
        proc.stderr?.on('data', (d) => (stderr += d.toString()));
        proc.on('error', (e) =>
          finish(reject, new Error(
            `g++ failed to start: ${e.message}. ` +
            `Verify build-essential is installed in the Docker image.`
          ))
        );
        proc.on('close', (code) =>
          code === 0
            ? finish(resolve, outFile)
            : finish(reject, new Error(stderr.trim() || 'C++ compilation failed'))
        );
      }),

    // The compiled binary is run directly (no interpreter needed)
    run: (outFile) => ({ cmd: outFile, args: [] }),
  },
};

// ─── Process Runner ───────────────────────────────────────────────────────────

/**
 * Spawn a subprocess, feed it stdin, collect stdout/stderr, and
 * enforce the time limit and output cap.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} input   - stdin to send to the process
 * @param {string} cwd     - working directory
 * @returns {{ output: string, error: string, executionTime: number, timedOut: boolean }}
 */
const runProcess = (cmd, args, input, cwd) =>
  new Promise((resolve) => {
    const startTime = Date.now();
    let proc;

    try {
      proc = spawn(cmd, args, {
        cwd,
        env: getSpawnEnv(),
        timeout: TIMEOUT_MS,    // Node's built-in SIGTERM after timeout
      });
    } catch (e) {
      return resolve({
        output: '',
        error: `Failed to spawn '${cmd}': ${e.message}`,
        executionTime: 0,
        timedOut: false,
      });
    }

    let stdout = '';
    let stderr = '';
    let truncated = false;

    // Collect stdout with size cap
    proc.stdout?.on('data', (chunk) => {
      if (stdout.length < MAX_OUT_BYTES) {
        stdout += chunk.toString();
      } else if (!truncated) {
        truncated = true;
        stdout += '\n[Output truncated — exceeded 1 MB limit]';
      }
    });

    // Collect stderr (compilation errors, runtime errors, stack traces)
    proc.stderr?.on('data', (chunk) => (stderr += chunk.toString()));

    proc.on('error', (err) => (stderr += `\nProcess error: ${err.message}`));

    // Write stdin and close the stream
    if (input && proc.stdin) {
      proc.stdin.on('error', () => {}); // ignore broken pipe
      try {
        proc.stdin.write(input);
        proc.stdin.end();
      } catch (_) {}
    } else if (proc.stdin) {
      proc.stdin.end();
    }

    // Belt-and-suspenders timeout guard (in case Node's spawn timeout doesn't fire)
    const killTimer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (_) {}
      resolve({
        output: '',
        error: 'Time limit exceeded',
        executionTime: TIMEOUT_MS,
        timedOut: true,
      });
    }, TIMEOUT_MS + 1000);

    proc.on('close', (code, signal) => {
      clearTimeout(killTimer);
      const elapsed = Date.now() - startTime;
      const timedOut = signal === 'SIGKILL' || signal === 'SIGTERM';

      resolve({
        output: stdout.trim(),
        error: stderr.trim() ||
          (timedOut ? 'Time limit exceeded' : '') ||
          (code !== 0 ? `Process exited with code ${code}` : ''),
        executionTime: elapsed,
        timedOut,
      });
    });
  });

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute code in the given language with optional stdin input.
 *
 * @param {string} language   - 'javascript' | 'python' | 'java' | 'cpp'
 * @param {string} code       - Source code to run
 * @param {string} [input]    - Standard input
 * @param {object} [options]  - { timeLimit (ms), memoryLimit (MB) } — currently for future use
 * @returns {{ output, error, executionTime, timedOut }}
 */
const executeCode = async (language, code, input = '', _options = {}) => {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return {
      output: '',
      error: `Unsupported language: "${language}". Supported: javascript, python, java, cpp`,
      executionTime: 0,
      timedOut: false,
    };
  }

  // Create an isolated temp directory for this execution
  const workDir = path.join(os.tmpdir(), `exec-${uuidv4()}`);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    // ── Write source file ──────────────────────────────────────────────────
    let filePath;
    const baseName = language === 'java' ? 'Main' : 'main';

    if (language === 'java') {
      // Wrap user code in Main class if they didn't provide one
      const wrappedCode = code.includes('class Main')
        ? code
        : [
            'import java.util.*;',
            'import java.io.*;',
            'public class Main {',
            '  public static void main(String[] args) throws Exception {',
            code,
            '  }',
            '}',
          ].join('\n');
      filePath = path.join(workDir, 'Main.java');
      fs.writeFileSync(filePath, wrappedCode, 'utf8');
    } else {
      filePath = path.join(workDir, `${baseName}.${config.ext}`);
      fs.writeFileSync(filePath, code, 'utf8');
    }

    // ── Compile (Java, C++) ────────────────────────────────────────────────
    let compiledArtifact; // holds the binary path for C++
    if (config.compile) {
      compiledArtifact = await config.compile(workDir, baseName);
    }

    // ── Build run command ──────────────────────────────────────────────────
    let runSpec;
    if (language === 'java') {
      runSpec = config.run(workDir, baseName);
    } else if (language === 'cpp') {
      runSpec = config.run(compiledArtifact);
    } else {
      runSpec = config.run(filePath);
    }

    // ── Execute ────────────────────────────────────────────────────────────
    return await runProcess(runSpec.cmd, runSpec.args, input, workDir);
  } catch (err) {
    // Compilation errors surface here
    return { output: '', error: err.message, executionTime: 0, timedOut: false };
  } finally {
    // Always clean up — even if execution threw
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
  }
};

/**
 * Run code against an array of test cases and return per-case results.
 *
 * @param {string}  language
 * @param {string}  code
 * @param {Array}   testCases        - Array of { input, expectedOutput, isHidden, marks, _id }
 * @param {boolean} includeHidden    - Whether to run hidden test cases
 * @param {object}  [options]        - Execution options (passed through to executeCode)
 * @returns {Array} results
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
      testCaseId:     tc._id,
      input:          tc.isHidden ? '[Hidden]'  : tc.input,
      output:         exec.output,
      expectedOutput: tc.isHidden ? '[Hidden]'  : tc.expectedOutput,
      passed,
      isHidden:       tc.isHidden,
      executionTime:  exec.executionTime,
      error:          exec.error || (exec.timedOut ? 'Time limit exceeded' : ''),
      marks:          passed ? (tc.marks || 1) : 0,
    });
  }

  return results;
};

/**
 * Normalize output for comparison — trim whitespace, normalize line endings.
 */
const normalizeOutput = (str) =>
  (str || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, ''); // strip trailing spaces on each line

module.exports = { executeCode, runTestCases, normalizeOutput };
