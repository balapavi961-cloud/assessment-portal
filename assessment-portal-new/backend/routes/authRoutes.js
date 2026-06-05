const express = require('express');
const router = express.Router();
const { authUser, addCandidate, deleteCandidate, getCandidates } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/login', authUser);
router.post('/candidates', protect, admin, addCandidate);
router.get('/candidates', protect, admin, getCandidates);
router.delete('/candidates/:id', protect, admin, deleteCandidate);

module.exports = router;
