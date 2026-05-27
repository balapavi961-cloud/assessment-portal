const mongoose = require('mongoose');

/**
 * Aggregated result snapshot for analytics and exports
 */
const resultSchema = new mongoose.Schema(
  {
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
    },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String },
    userEmail: { type: String },
    testTitle: { type: String },
    mcqScore: { type: Number, default: 0 },
    codingScore: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    rank: { type: Number },
    totalParticipants: { type: Number },
    timeTakenMinutes: { type: Number },
    status: { type: String },
    submittedAt: { type: Date },
    breakdown: {
      mcqCorrect: { type: Number, default: 0 },
      mcqWrong: { type: Number, default: 0 },
      mcqUnanswered: { type: Number, default: 0 },
      codingPassed: { type: Number, default: 0 },
      codingPartial: { type: Number, default: 0 },
      codingFailed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

resultSchema.index({ test: 1, totalScore: -1 });
resultSchema.index({ test: 1, user: 1 });
resultSchema.index({ userEmail: 1 });

module.exports = mongoose.model('Result', resultSchema);
