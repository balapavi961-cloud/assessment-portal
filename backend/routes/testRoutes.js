const express = require('express');
const {
  createTest,
  getTests,
  getAvailableTests,
  getTest,
  updateTest,
  deleteTest,
  togglePublish,
} = require('../controllers/testController');
const {
  addMcq,
  updateMcq,
  deleteMcq,
  addCoding,
  updateCoding,
  deleteCoding,
} = require('../controllers/questionController');
const { exportCSV, exportPDF } = require('../controllers/exportController');
const {
  getTestSubmissions,
  getSubmissionDetail,
  manualScoreCoding,
  getLeaderboard,
} = require('../controllers/submissionController');
const { protect, adminOnly, candidateOnly } = require('../middleware/auth');

const router = express.Router();

// Candidate routes
router.get('/available', protect, candidateOnly, getAvailableTests);
router.get('/:testId/leaderboard', protect, getLeaderboard);

// Admin routes
router.use(protect, adminOnly);
router.route('/').get(getTests).post(createTest);
router.route('/:id').get(getTest).put(updateTest).delete(deleteTest);
router.patch('/:id/publish', togglePublish);

// Questions
router.post('/:testId/mcq', addMcq);
router.put('/mcq/:id', updateMcq);
router.delete('/mcq/:id', deleteMcq);
router.post('/:testId/coding', addCoding);
router.put('/coding/:id', updateCoding);
router.delete('/coding/:id', deleteCoding);

// Submissions & export
router.get('/:testId/submissions', getTestSubmissions);
router.get('/submissions/:id', getSubmissionDetail);
router.put('/submissions/:id/score', manualScoreCoding);
router.get('/:testId/export/csv', exportCSV);
router.get('/:testId/export/pdf', exportPDF);

module.exports = router;
