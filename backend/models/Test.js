const mongoose = require('mongoose');
const { TEST_STATUS } = require('../config/constants');

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Test title is required'],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, default: '', maxlength: 2000 },
    instructions: { type: String, default: '', maxlength: 10000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: 1,
      max: 600,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(TEST_STATUS),
      default: TEST_STATUS.DRAFT,
    },
    // Scoring options
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    negativeMarking: { type: Boolean, default: false },
    negativeMarkValue: { type: Number, default: 0.25 },
    // Security & behavior
    randomizeQuestions: { type: Boolean, default: false },
    preventCopyPaste: { type: Boolean, default: true },
    fullscreenRequired: { type: Boolean, default: true },
    maxTabViolations: { type: Number, default: 3 },
    showLeaderboard: { type: Boolean, default: true },
    // Question references (ordered)
    questions: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, refPath: 'questions.questionModel' },
        questionModel: { type: String, enum: ['MCQQuestion', 'CodingQuestion'] },
        order: { type: Number, default: 0 },
        marks: { type: Number, default: 1 },
      },
    ],
    tags: [{ type: String, trim: true }],
    participantCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

testSchema.index({ status: 1, startTime: 1, endTime: 1 });
testSchema.index({ createdBy: 1 });
testSchema.index({ title: 'text', description: 'text' });

// Validate end time is after start time
testSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error('End time must be after start time'));
  }
  next();
});

module.exports = mongoose.model('Test', testSchema);
