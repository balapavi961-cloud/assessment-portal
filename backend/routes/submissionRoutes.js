const express = require('express');
const {
  startTest,
  saveMcqAnswer,
  saveCodingAnswer,
  runCode,
  submitCoding,
  recordViolation,
  submitTest,
  getMyResult,
  getMySubmissions,
} = require('../controllers/submissionController');
const { protect, candidateOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, candidateOnly);

router.get('/my', getMySubmissions);           // GET all past submissions for this candidate
router.post('/:testId/start', startTest);
router.put('/:testId/mcq', saveMcqAnswer);
router.put('/:testId/coding/save', saveCodingAnswer);
router.post('/:testId/coding/run', runCode);
router.post('/:testId/coding/submit', submitCoding);
router.post('/:testId/violation', recordViolation);
router.post('/:testId/submit', submitTest);
router.get('/:testId/result', getMyResult);

module.exports = router;
