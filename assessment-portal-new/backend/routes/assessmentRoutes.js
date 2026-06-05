const express = require('express');
const router = express.Router();
const {
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
} = require('../controllers/assessmentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAssessments)
  .post(protect, admin, createAssessment);

router.route('/:id')
  .get(protect, getAssessmentById)
  .put(protect, admin, updateAssessment)
  .delete(protect, admin, deleteAssessment);

module.exports = router;
