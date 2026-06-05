const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  answers: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Object mapping question ID to candidate answer/code',
  },
  score: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
