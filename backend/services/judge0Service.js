const encodeBase64 = (str) => {
  return Buffer.from(str || '').toString('base64');
};

const decodeBase64 = (b64) => {
  return Buffer.from(b64 || '', 'base64').toString('utf8');
};

// Default language IDs fallback (Judge0 CE standard)
const languageIdMap = {
  javascript: parseInt(process.env.JUDGE0_LANG_JS, 10) || 93, // Node.js 18.15.0
  python: parseInt(process.env.JUDGE0_LANG_PYTHON, 10) || 92,     // Python 3.11.2
  java: parseInt(process.env.JUDGE0_LANG_JAVA, 10) || 91,       // Java 17.0.6
  cpp: parseInt(process.env.JUDGE0_LANG_CPP, 10) || 105,       // C++ (GCC 13.2.0)
};

/**
 * Auto-detect and map languages from the configured Judge0 API
 */
const initializeJudge0 = async () => {
  if (process.env.USE_JUDGE0 !== 'true') {
    console.log('Judge0 service is disabled. Falling back to local execution.');
    return;
  }

  const apiUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
  const apiKey = process.env.JUDGE0_API_KEY;

  console.log(`Initializing Judge0 service with URL: ${apiUrl}...`);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    if (apiUrl.includes('rapidapi.com')) {
      headers['x-rapidapi-key'] = apiKey;
      try {
        const url = new URL(apiUrl);
        headers['x-rapidapi-host'] = url.host;
      } catch (e) {
        // Ignore URL parsing errors
      }
    } else {
      headers['X-Auth-Token'] = apiKey;
    }
  }

  try {
    const response = await fetch(`${apiUrl}/languages`, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const languages = await response.json();
    console.log(`Fetched ${languages.length} languages from Judge0.`);

    // Helper to find the best match
    const matchLanguage = (patterns) => {
      // Sort languages descending by ID to prefer newer versions
      const sorted = [...languages].sort((a, b) => b.id - a.id);
      for (const pattern of patterns) {
        const found = sorted.find(lang => lang.name.toLowerCase().includes(pattern.toLowerCase()));
        if (found) return found.id;
      }
      return null;
    };

    // Update mapping if overrides are not explicitly set in env variables
    if (!process.env.JUDGE0_LANG_JS) {
      const id = matchLanguage(['node.js', 'javascript']);
      if (id) {
        languageIdMap.javascript = id;
        console.log(`Mapped 'javascript' to Judge0 ID: ${id}`);
      }
    }
    if (!process.env.JUDGE0_LANG_PYTHON) {
      const id = matchLanguage(['python 3', 'python']);
      if (id) {
        languageIdMap.python = id;
        console.log(`Mapped 'python' to Judge0 ID: ${id}`);
      }
    }
    if (!process.env.JUDGE0_LANG_JAVA) {
      const id = matchLanguage(['openjdk', 'java']);
      if (id) {
        languageIdMap.java = id;
        console.log(`Mapped 'java' to Judge0 ID: ${id}`);
      }
    }
    if (!process.env.JUDGE0_LANG_CPP) {
      const id = matchLanguage(['c++ (gcc', 'g++', 'c++']);
      if (id) {
        languageIdMap.cpp = id;
        console.log(`Mapped 'cpp' to Judge0 ID: ${id}`);
      }
    }
  } catch (error) {
    console.warn(`Could not fetch Judge0 languages list. Using default language mapping. Error: ${error.message}`);
  }
};

/**
 * Execute code via Judge0 API
 * 
 * @param {string} language - The language key ('javascript', 'python', 'java', 'cpp')
 * @param {string} code - Code to run
 * @param {string} input - Standard input
 * @param {object} options - Performance constraints (timeLimit in ms, memoryLimit in MB)
 */
const executeCodeInJudge0 = async (language, code, input = '', options = {}) => {
  const apiUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
  const apiKey = process.env.JUDGE0_API_KEY;

  const langId = languageIdMap[language];
  if (!langId) {
    return {
      output: '',
      error: `Unsupported language: ${language}`,
      executionTime: 0,
      timedOut: false,
    };
  }

  // CPU time limit in seconds
  const cpuTimeLimit = (options.timeLimit || parseInt(process.env.CODE_EXEC_TIMEOUT, 10) || 10000) / 1000;
  // Memory limit in KB
  const memoryLimit = (options.memoryLimit || 256) * 1024;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    if (apiUrl.includes('rapidapi.com')) {
      headers['x-rapidapi-key'] = apiKey;
      try {
        const url = new URL(apiUrl);
        headers['x-rapidapi-host'] = url.host;
      } catch (e) {
        // Ignore URL parsing errors
      }
    } else {
      headers['X-Auth-Token'] = apiKey;
    }
  }

  const payload = {
    source_code: encodeBase64(code),
    language_id: langId,
    stdin: encodeBase64(input),
    cpu_time_limit: cpuTimeLimit,
    memory_limit: memoryLimit,
  };

  try {
    const submitRes = await fetch(`${apiUrl}/submissions?base64_encoded=true&wait=false`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) {
      const text = await submitRes.text();
      throw new Error(`Failed to submit code to Judge0: ${submitRes.status} ${text}`);
    }

    const { token } = await submitRes.json();
    if (!token) {
      throw new Error('Did not receive submission token from Judge0');
    }

    // Poll Judge0 for status
    let statusId = 1; // In Queue
    let submissionDetails = null;
    const maxRetries = 15;
    let retries = 0;

    while ((statusId === 1 || statusId === 2) && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;

      const getRes = await fetch(`${apiUrl}/submissions/${token}?base64_encoded=true`, { headers });
      if (!getRes.ok) {
        throw new Error(`Failed to fetch submission status from Judge0: ${getRes.status}`);
      }

      submissionDetails = await getRes.json();
      statusId = submissionDetails.status?.id;
    }

    if (!submissionDetails || statusId === 1 || statusId === 2) {
      return {
        output: '',
        error: 'Execution timed out waiting for compiler response',
        executionTime: cpuTimeLimit * 1000,
        timedOut: true,
      };
    }

    const executionTimeMs = parseFloat(submissionDetails.time || 0) * 1000;
    const isTimedOut = statusId === 5; // Time Limit Exceeded

    let output = '';
    let error = '';

    if (statusId === 3) { // Accepted
      output = decodeBase64(submissionDetails.stdout || '');
    } else if (statusId === 6) { // Compilation Error
      error = decodeBase64(submissionDetails.compile_output || '') || 'Compilation Error';
    } else if (statusId === 5) {
      error = 'Time limit exceeded';
    } else {
      const stderr = decodeBase64(submissionDetails.stderr || '');
      const compileOut = decodeBase64(submissionDetails.compile_output || '');
      const message = decodeBase64(submissionDetails.message || '');
      error = stderr || compileOut || message || submissionDetails.status?.description || 'Runtime Error';
    }

    return {
      output: output.trim(),
      error: error.trim(),
      executionTime: Math.round(executionTimeMs),
      timedOut: isTimedOut,
    };
  } catch (error) {
    console.error('Judge0 execution error:', error);
    return {
      output: '',
      error: `Compiler Service Error: ${error.message}`,
      executionTime: 0,
      timedOut: false,
    };
  }
};

module.exports = {
  initializeJudge0,
  executeCodeInJudge0,
  languageIdMap,
};
