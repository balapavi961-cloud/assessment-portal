const express = require('express');
const router = express.Router();
const { createSubmission, getSubmissionsByAssessment, getMySubmissions } = require('../controllers/submissionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, createSubmission);
router.get('/me', protect, getMySubmissions);
router.get('/assessment/:assessmentId', protect, admin, getSubmissionsByAssessment);

module.exports = router;
