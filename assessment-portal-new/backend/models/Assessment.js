const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    description: 'Duration in minutes',
  },
}, { timestamps: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
