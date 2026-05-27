const mongoose = require('mongoose');
const { SUBMISSION_STATUS, EVAL_STATUS } = require('../config/constants');

const mcqAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MCQQuestion' },
  selectedAnswers: [{ type: String }],
  isCorrect: { type: Boolean },
  marksAwarded: { type: Number, default: 0 },
  answeredAt: { type: Date },
});

const codingAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingQuestion' },
  language: { type: String },
  code: { type: String, default: '' },
  runResults: [
    {
      input: String,
      output: String,
      expectedOutput: String,
      passed: Boolean,
      isHidden: Boolean,
      executionTime: Number,
      error: String,
    },
  ],
  testCaseResults: [
    {
      testCaseId: mongoose.Schema.Types.ObjectId,
      passed: Boolean,
      output: String,
      expectedOutput: String,
      executionTime: Number,
      error: String,
      isHidden: Boolean,
    },
  ],
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  evalStatus: {
    type: String,
    enum: Object.values(EVAL_STATUS),
    default: EVAL_STATUS.PENDING,
  },
  plagiarismScore: { type: Number, default: 0 }, // 0-100 similarity
  submittedAt: { type: Date },
  history: [
    {
      code: String,
      language: String,
      submittedAt: Date,
      score: Number,
    },
  ],
});

const violationSchema = new mongoose.Schema({
  type: { type: String, enum: ['tab_switch', 'fullscreen_exit', 'copy_paste', 'multiple_tabs'] },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
});

const submissionSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(SUBMISSION_STATUS),
      default: SUBMISSION_STATUS.IN_PROGRESS,
    },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    expiresAt: { type: Date },
    // Answers
    mcqAnswers: [mcqAnswerSchema],
    codingAnswers: [codingAnswerSchema],
    // Proctoring
    tabViolations: { type: Number, default: 0 },
    violations: [violationSchema],
    warningsIssued: { type: Number, default: 0 },
    // Scoring
    mcqScore: { type: Number, default: 0 },
    codingScore: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    rank: { type: Number },
    // Session
    sessionToken: { type: String },
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId }],
    currentQuestionIndex: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

submissionSchema.index({ test: 1, user: 1 }, { unique: true });
submissionSchema.index({ test: 1, totalScore: -1 });
submissionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
