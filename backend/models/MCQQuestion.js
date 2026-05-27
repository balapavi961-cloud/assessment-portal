const mongoose = require('mongoose');

const mcqQuestionSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      maxlength: 5000,
    },
    options: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true, maxlength: 1000 },
      },
    ],
    // Single: one option id; Multiple: array of option ids
    correctAnswers: [{ type: String, required: true }],
    isMultipleChoice: { type: Boolean, default: false },
    marks: { type: Number, default: 1, min: 0 },
    negativeMarks: { type: Number, default: 0 },
    explanation: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    order: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mcqQuestionSchema.index({ test: 1, order: 1 });

module.exports = mongoose.model('MCQQuestion', mcqQuestionSchema);
