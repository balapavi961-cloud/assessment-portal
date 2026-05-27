const mongoose = require('mongoose');
const { SUPPORTED_LANGUAGES } = require('../config/constants');

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: true },
    marks: { type: Number, default: 1 },
  },
  { _id: true }
);

const codingQuestionSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },
    title: { type: String, required: true, maxlength: 300 },
    description: { type: String, required: true, maxlength: 10000 },
    constraints: { type: String, default: '' },
    sampleInput: { type: String, default: '' },
    sampleOutput: { type: String, default: '' },
    starterCode: {
      javascript: { type: String, default: '' },
      python: { type: String, default: '' },
      java: { type: String, default: '' },
      cpp: { type: String, default: '' },
    },
    testCases: [testCaseSchema],
    marks: { type: Number, default: 10, min: 0 },
    timeLimit: { type: Number, default: 2000 }, // ms per test case
    memoryLimit: { type: Number, default: 256 }, // MB
    allowedLanguages: {
      type: [{ type: String, enum: SUPPORTED_LANGUAGES }],
      default: SUPPORTED_LANGUAGES,
    },
    autoEvaluate: { type: Boolean, default: true },
    preventCopyPaste: { type: Boolean, default: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

codingQuestionSchema.index({ test: 1, order: 1 });

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);
