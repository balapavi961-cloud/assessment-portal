const mongoose = require('mongoose');

const mcqQuestionSchema = new mongoose.Schema({
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('MCQQuestion', mcqQuestionSchema);
