const axios = require('axios');

// Judge0 API configurations
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions';

// Map our frontend language names to Judge0 language IDs
const languageMap = {
  python: 71, // Python (3.8.1)
  java: 62,   // Java (OpenJDK 13.0.1)
  c: 50,      // C (GCC 9.2.0)
  cpp: 54,    // C++ (GCC 9.2.0)
};

// @desc    Execute code
// @route   POST /api/compiler/run
// @access  Private
const runCode = async (req, res) => {
  const { language, code, stdin } = req.body;

  if (!languageMap[language]) {
    return res.status(400).json({ message: 'Unsupported language' });
  }

  const languageId = languageMap[language];

  try {
    const response = await axios.post(
      `${JUDGE0_URL}?base64_encoded=false&wait=true`,
      {
        language_id: languageId,
        source_code: code,
        stdin: stdin || '',
      },
      {
        headers: {
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
          'x-rapidapi-key': process.env.JUDGE0_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;

    // Standardize the response format to match what our frontend expects
    // Frontend expects: res.data.compile (optional, with code/output) and res.data.run (with output)
    
    if (data.status && data.status.id !== 3) {
      // id 3 is "Accepted". Other IDs might be Compilation Error (6), Runtime Error, etc.
      return res.json({
        compile: {
          code: data.status.id === 6 ? 1 : 0, 
          stderr: data.compile_output || data.stderr || data.message || data.status.description,
        },
        run: {
          output: data.stdout || '',
        }
      });
    }

    res.json({
      compile: { code: 0 },
      run: { output: data.stdout || '' }
    });
    
  } catch (error) {
    console.error('Judge0 API Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error executing code: ' + (error.response?.data?.message || error.message) });
  }
};

module.exports = { runCode };
