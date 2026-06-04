require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const testRoutes = require('./routes/testRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const createAdmin = require('./utils/createAdmin');


// ─── Startup: Verify Compilers ────────────────────────────────────────────────
/**
 * Check that all required language runtimes are available in PATH.
 * Logs a ✅ or ❌ for each. This surfaces ENOENT issues immediately
 * rather than failing silently during a live exam submission.
 */
const compilerStatus = { java: false, python: false, cpp: false, node: false };

const checkCompiler = (name, cmd) => {
  try {
    const version = execSync(cmd, { stdio: 'pipe', timeout: 5000 }).toString().trim().split('\n')[0];
    console.log(`  ✅ ${name.padEnd(8)} ${version}`);
    return true;
  } catch (e) {
    console.warn(`  ❌ ${name.padEnd(8)} NOT FOUND — ${e.message.split('\n')[0]}`);
    return false;
  }
};

console.log('\n🔧 Compiler verification:');
compilerStatus.java   = checkCompiler('java',    'java -version 2>&1 | head -1');
compilerStatus.java   = checkCompiler('javac',   'javac -version 2>&1') && compilerStatus.java;
compilerStatus.python = checkCompiler('python3', 'python3 --version 2>&1');
compilerStatus.cpp    = checkCompiler('g++',     'g++ --version 2>&1 | head -1');
compilerStatus.node   = checkCompiler('node',    'node --version 2>&1');
console.log('');

// ─── Database & Services ──────────────────────────────────────────────────────
connectDB();
createAdmin();


// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

// Dynamic CORS: reads CLIENT_URL env var (comma-separated list of allowed origins)
const buildAllowedOrigins = () => {
  const base = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
  ];
  const fromEnv = (process.env.CLIENT_URL || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  return [...new Set([...base, ...fromEnv])];
};

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = buildAllowedOrigins();
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check Endpoints ───────────────────────────────────────────────────
// /health — root-level (required by Render, Railway, Koyeb)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    compilers: compilerStatus,
    environment: process.env.NODE_ENV || 'development',
  });
});

// /api/health — legacy endpoint (keep for backwards compat)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Assessment Portal API is running',
    compilers: compilerStatus,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/submissions', submissionRoutes);

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  console.log(`   Health: http://0.0.0.0:${PORT}/health`);
  console.log(`   CORS allowed origins: ${buildAllowedOrigins().join(', ')}`);
});
