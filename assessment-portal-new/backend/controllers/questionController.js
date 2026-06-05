const MCQQuestion = require('../models/MCQQuestion');
const CodingQuestion = require('../models/CodingQuestion');

// @desc    Get questions for an assessment
// @route   GET /api/questions/assessment/:assessmentId
// @access  Private
const getQuestionsByAssessmentId = async (req, res) => {
  try {
    const mcqs = await MCQQuestion.find({ assessmentId: req.params.assessmentId });
    const coding = await CodingQuestion.find({ assessmentId: req.params.assessmentId });
    res.json({ mcqs, coding });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- MCQ Question Controllers ---

// @desc    Create MCQ question
// @route   POST /api/questions/mcq
// @access  Private/Admin
const createMCQQuestion = async (req, res) => {
  const { assessmentId, question, options, answer } = req.body;
  try {
    const mcq = new MCQQuestion({ assessmentId, question, options, answer });
    const createdMCQ = await mcq.save();
    res.status(201).json(createdMCQ);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update MCQ question
// @route   PUT /api/questions/mcq/:id
// @access  Private/Admin
const updateMCQQuestion = async (req, res) => {
  const { question, options, answer } = req.body;
  try {
    const mcq = await MCQQuestion.findById(req.params.id);
    if (mcq) {
      mcq.question = question || mcq.question;
      mcq.options = options || mcq.options;
      mcq.answer = answer || mcq.answer;
      const updatedMCQ = await mcq.save();
      res.json(updatedMCQ);
    } else {
      res.status(404).json({ message: 'MCQ not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete MCQ question
// @route   DELETE /api/questions/mcq/:id
// @access  Private/Admin
const deleteMCQQuestion = async (req, res) => {
  try {
    const mcq = await MCQQuestion.findById(req.params.id);
    if (mcq) {
      await mcq.deleteOne();
      res.json({ message: 'MCQ removed' });
    } else {
      res.status(404).json({ message: 'MCQ not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Coding Question Controllers ---

// @desc    Create Coding question
// @route   POST /api/questions/coding
// @access  Private/Admin
const createCodingQuestion = async (req, res) => {
  const { assessmentId, title, statement, sampleInput, sampleOutput } = req.body;
  try {
    const coding = new CodingQuestion({ assessmentId, title, statement, sampleInput, sampleOutput });
    const createdCoding = await coding.save();
    res.status(201).json(createdCoding);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Coding question
// @route   PUT /api/questions/coding/:id
// @access  Private/Admin
const updateCodingQuestion = async (req, res) => {
  const { title, statement, sampleInput, sampleOutput } = req.body;
  try {
    const coding = await CodingQuestion.findById(req.params.id);
    if (coding) {
      coding.title = title || coding.title;
      coding.statement = statement || coding.statement;
      coding.sampleInput = sampleInput || coding.sampleInput;
      coding.sampleOutput = sampleOutput || coding.sampleOutput;
      const updatedCoding = await coding.save();
      res.json(updatedCoding);
    } else {
      res.status(404).json({ message: 'Coding question not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Coding question
// @route   DELETE /api/questions/coding/:id
// @access  Private/Admin
const deleteCodingQuestion = async (req, res) => {
  try {
    const coding = await CodingQuestion.findById(req.params.id);
    if (coding) {
      await coding.deleteOne();
      res.json({ message: 'Coding question removed' });
    } else {
      res.status(404).json({ message: 'Coding question not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getQuestionsByAssessmentId,
  createMCQQuestion,
  updateMCQQuestion,
  deleteMCQQuestion,
  createCodingQuestion,
  updateCodingQuestion,
  deleteCodingQuestion,
};
