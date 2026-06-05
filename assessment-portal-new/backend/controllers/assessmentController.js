const Assessment = require('../models/Assessment');

// @desc    Get all assessments
// @route   GET /api/assessments
// @access  Private (Admin & Candidate)
const getAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find({});
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get assessment by ID
// @route   GET /api/assessments/:id
// @access  Private
const getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (assessment) {
      res.json(assessment);
    } else {
      res.status(404).json({ message: 'Assessment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create assessment
// @route   POST /api/assessments
// @access  Private/Admin
const createAssessment = async (req, res) => {
  const { title, duration } = req.body;
  try {
    const assessment = new Assessment({ title, duration });
    const createdAssessment = await assessment.save();
    res.status(201).json(createdAssessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update assessment
// @route   PUT /api/assessments/:id
// @access  Private/Admin
const updateAssessment = async (req, res) => {
  const { title, duration } = req.body;
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (assessment) {
      assessment.title = title || assessment.title;
      assessment.duration = duration || assessment.duration;
      const updatedAssessment = await assessment.save();
      res.json(updatedAssessment);
    } else {
      res.status(404).json({ message: 'Assessment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete assessment
// @route   DELETE /api/assessments/:id
// @access  Private/Admin
const deleteAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (assessment) {
      await assessment.deleteOne();
      res.json({ message: 'Assessment removed' });
    } else {
      res.status(404).json({ message: 'Assessment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
};
