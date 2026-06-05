const mongoose = require('mongoose');

const codingQuestionSchema = new mongoose.Schema({
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  statement: {
    type: String,
    required: true,
  },
  sampleInput: {
    type: String,
    default: '',
  },
  sampleOutput: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);
