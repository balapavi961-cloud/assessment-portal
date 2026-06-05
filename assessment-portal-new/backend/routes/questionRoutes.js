const express = require('express');
const router = express.Router();
const {
  getQuestionsByAssessmentId,
  createMCQQuestion,
  updateMCQQuestion,
  deleteMCQQuestion,
  createCodingQuestion,
  updateCodingQuestion,
  deleteCodingQuestion,
} = require('../controllers/questionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/assessment/:assessmentId', protect, getQuestionsByAssessmentId);

// MCQ routes
router.post('/mcq', protect, admin, createMCQQuestion);
router.put('/mcq/:id', protect, admin, updateMCQQuestion);
router.delete('/mcq/:id', protect, admin, deleteMCQQuestion);

// Coding routes
router.post('/coding', protect, admin, createCodingQuestion);
router.put('/coding/:id', protect, admin, updateCodingQuestion);
router.delete('/coding/:id', protect, admin, deleteCodingQuestion);

module.exports = router;
