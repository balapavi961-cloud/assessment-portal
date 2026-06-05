const Submission = require('../models/Submission');

// @desc    Submit assessment
// @route   POST /api/submissions
// @access  Private (Candidate)
const createSubmission = async (req, res) => {
  const { assessmentId, answers } = req.body;
  try {
    // In a real application, you would auto-score the MCQs here.
    // For simplicity, we just save the submission.
    // Let's do a basic scoring for MCQs if they are provided, but since we don't have the MCQ answers easily accessible here without querying, 
    // we'll just save it with score 0 for now, or you could implement grading logic.
    
    const submission = new Submission({
      userId: req.user._id,
      assessmentId,
      answers,
      score: 0, // Placeholder
    });
    const createdSubmission = await submission.save();
    res.status(201).json(createdSubmission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get submissions by assessment ID
// @route   GET /api/submissions/assessment/:assessmentId
// @access  Private/Admin
const getSubmissionsByAssessment = async (req, res) => {
  try {
    const submissions = await Submission.find({ assessmentId: req.params.assessmentId })
      .populate('userId', 'name email');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get candidate's own submissions
// @route   GET /api/submissions/me
// @access  Private (Candidate)
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user._id }).populate('assessmentId', 'title');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSubmission, getSubmissionsByAssessment, getMySubmissions };
