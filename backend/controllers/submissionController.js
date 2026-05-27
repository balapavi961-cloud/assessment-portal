const { v4: uuidv4 } = require('uuid');
const Test = require('../models/Test');
const MCQQuestion = require('../models/MCQQuestion');
const CodingQuestion = require('../models/CodingQuestion');
const Submission = require('../models/Submission');
const Result = require('../models/Result');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const evaluateMcq = require('../utils/evaluateMcq');
const { plagiarismScore } = require('../utils/plagiarism');
const { executeCode, runTestCases } = require('../services/codeExecutor');
const { sendResultEmail } = require('../services/emailService');
const { TEST_STATUS, SUBMISSION_STATUS, EVAL_STATUS } = require('../config/constants');

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Start or resume test
 */
const startTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.testId);
  if (!test || test.status !== TEST_STATUS.PUBLISHED) {
    throw new ApiError(404, 'Test not available');
  }

  const now = new Date();
  if (now < test.startTime) throw new ApiError(400, 'Test has not started yet');
  if (now > test.endTime) throw new ApiError(400, 'Test has ended');

  let submission = await Submission.findOne({ test: test._id, user: req.user._id });

  if (submission && ['submitted', 'auto_submitted', 'disqualified'].includes(submission.status)) {
    throw new ApiError(400, 'You have already submitted this test');
  }

  const [mcqs, codings] = await Promise.all([
    MCQQuestion.find({ test: test._id }).sort({ order: 1 }),
    CodingQuestion.find({ test: test._id }).sort({ order: 1 }),
  ]);

  let questionOrder = [
    ...mcqs.map((q) => ({ id: q._id, type: 'mcq' })),
    ...codings.map((q) => ({ id: q._id, type: 'coding' })),
  ];

  if (test.randomizeQuestions) {
    questionOrder = shuffle(questionOrder);
  }

  const expiresAt = new Date(now.getTime() + test.duration * 60 * 1000);
  const endCap = test.endTime < expiresAt ? test.endTime : expiresAt;

  if (!submission) {
    submission = await Submission.create({
      test: test._id,
      user: req.user._id,
      sessionToken: uuidv4(),
      questionOrder: questionOrder.map((q) => q.id),
      expiresAt: endCap,
      maxScore: test.totalMarks,
      mcqAnswers: mcqs.map((q) => ({ questionId: q._id, selectedAnswers: [] })),
      codingAnswers: codings.map((q) => ({
        questionId: q._id,
        code: q.starterCode?.javascript || '',
        language: 'javascript',
        maxScore: q.marks,
      })),
    });
    await Test.findByIdAndUpdate(test._id, { $inc: { participantCount: 1 } });
  }

  // Return questions without correct answers for candidate
  const mcqForUser = mcqs.map((q) => ({
    _id: q._id,
    questionText: q.questionText,
    options: q.options,
    isMultipleChoice: q.isMultipleChoice,
    marks: q.marks,
    imageUrl: q.imageUrl,
    order: q.order,
  }));

  const codingForUser = codings.map((q) => ({
    _id: q._id,
    title: q.title,
    description: q.description,
    constraints: q.constraints,
    sampleInput: q.sampleInput,
    sampleOutput: q.sampleOutput,
    starterCode: q.starterCode,
    allowedLanguages: q.allowedLanguages,
    marks: q.marks,
    preventCopyPaste: q.preventCopyPaste,
    order: q.order,
  }));

  res.json({
    success: true,
    data: {
      submission,
      test: {
        _id: test._id,
        title: test.title,
        instructions: test.instructions,
        duration: test.duration,
        preventCopyPaste: test.preventCopyPaste,
        fullscreenRequired: test.fullscreenRequired,
        maxTabViolations: test.maxTabViolations,
        totalMarks: test.totalMarks,
      },
      mcqQuestions: mcqForUser,
      codingQuestions: codingForUser,
      questionOrder: submission.questionOrder,
      expiresAt: submission.expiresAt,
    },
  });
});

/**
 * Auto-save MCQ answer
 */
const saveMcqAnswer = asyncHandler(async (req, res) => {
  const { questionId, selectedAnswers } = req.body;
  const submission = await Submission.findOne({
    test: req.params.testId,
    user: req.user._id,
    status: SUBMISSION_STATUS.IN_PROGRESS,
  });

  if (!submission) throw new ApiError(404, 'Active submission not found');

  const answerIdx = submission.mcqAnswers.findIndex(
    (a) => a.questionId.toString() === questionId
  );
  if (answerIdx === -1) throw new ApiError(404, 'Question not in test');

  submission.mcqAnswers[answerIdx].selectedAnswers = selectedAnswers;
  submission.mcqAnswers[answerIdx].answeredAt = new Date();
  await submission.save();

  res.json({ success: true, message: 'Answer saved' });
});

/**
 * Save coding code (auto-save)
 */
const saveCodingAnswer = asyncHandler(async (req, res) => {
  const { questionId, code, language } = req.body;
  const submission = await Submission.findOne({
    test: req.params.testId,
    user: req.user._id,
    status: SUBMISSION_STATUS.IN_PROGRESS,
  });

  if (!submission) throw new ApiError(404, 'Active submission not found');

  const answerIdx = submission.codingAnswers.findIndex(
    (a) => a.questionId.toString() === questionId
  );
  if (answerIdx === -1) throw new ApiError(404, 'Question not in test');

  submission.codingAnswers[answerIdx].code = code;
  submission.codingAnswers[answerIdx].language = language;
  await submission.save();

  res.json({ success: true, message: 'Code saved' });
});

/**
 * Run code with custom input (no hidden tests)
 */
const runCode = asyncHandler(async (req, res) => {
  const { questionId, code, language, customInput } = req.body;
  const question = await CodingQuestion.findById(questionId);
  if (!question) throw new ApiError(404, 'Question not found');

  const result = await executeCode(language, code, customInput || question.sampleInput);
  res.json({ success: true, data: result });
});

/**
 * Submit coding answer for evaluation
 */
const submitCoding = asyncHandler(async (req, res) => {
  const { questionId, code, language } = req.body;
  const submission = await Submission.findOne({
    test: req.params.testId,
    user: req.user._id,
    status: SUBMISSION_STATUS.IN_PROGRESS,
  });
  if (!submission) throw new ApiError(404, 'Active submission not found');

  const question = await CodingQuestion.findById(questionId);
  if (!question) throw new ApiError(404, 'Question not found');

  const answerIdx = submission.codingAnswers.findIndex(
    (a) => a.questionId.toString() === questionId
  );

  let testResults = [];
  let score = 0;

  if (question.autoEvaluate && question.testCases.length > 0) {
    testResults = await runTestCases(language, code, question.testCases, true);
    const visibleCases = question.testCases.filter((tc) => !tc.isHidden);
    const hiddenCount = question.testCases.length - visibleCases.length;
    const passedCount = testResults.filter((r) => r.passed).length;
    score = Math.round((passedCount / question.testCases.length) * question.marks);
  }

  // Basic plagiarism vs other submissions
  const otherSubs = await Submission.find({
    test: req.params.testId,
    'codingAnswers.questionId': questionId,
    user: { $ne: req.user._id },
  }).select('codingAnswers');

  let maxPlagiarism = 0;
  for (const sub of otherSubs) {
    const other = sub.codingAnswers.find((a) => a.questionId.toString() === questionId);
    if (other?.code) {
      maxPlagiarism = Math.max(maxPlagiarism, plagiarismScore(code, other.code));
    }
  }

  const answer = submission.codingAnswers[answerIdx];
  answer.code = code;
  answer.language = language;
  answer.testCaseResults = testResults;
  answer.score = score;
  answer.maxScore = question.marks;
  answer.evalStatus = question.autoEvaluate ? EVAL_STATUS.AUTO : EVAL_STATUS.PENDING;
  answer.plagiarismScore = maxPlagiarism;
  answer.submittedAt = new Date();
  answer.history = answer.history || [];
  answer.history.push({ code, language, submittedAt: new Date(), score });

  await submission.save();

  const visibleResults = testResults.filter((r) => !r.isHidden);
  const hiddenResults = testResults
    .filter((r) => r.isHidden)
    .map((r, idx) => ({
      index: idx + 1,
      testCaseId: r.testCaseId,
      passed: r.passed,
      executionTime: r.executionTime,
      error: r.passed ? '' : (r.error || 'Wrong answer'),
      marks: r.marks,
    }));

  res.json({
    success: true,
    data: {
      score,
      maxScore: question.marks,
      passed: testResults.filter((r) => r.passed).length,
      total: testResults.length,
      results: visibleResults,
      hiddenResults,
      plagiarismScore: maxPlagiarism,
    },
  });
});

/**
 * Record proctoring violation
 */
const recordViolation = asyncHandler(async (req, res) => {
  const { type, details } = req.body;
  const submission = await Submission.findOne({
    test: req.params.testId,
    user: req.user._id,
    status: SUBMISSION_STATUS.IN_PROGRESS,
  });
  if (!submission) throw new ApiError(404, 'Active submission not found');

  const test = await Test.findById(req.params.testId);
  submission.violations.push({ type, details });
  submission.tabViolations += 1;
  submission.warningsIssued += 1;

  const maxViolations = test?.maxTabViolations || 3;
  let autoSubmit = false;

  if (submission.tabViolations >= maxViolations) {
    autoSubmit = true;
    await finalizeSubmission(submission, SUBMISSION_STATUS.DISQUALIFIED);
  } else {
    await submission.save();
  }

  res.json({
    success: true,
    data: {
      tabViolations: submission.tabViolations,
      warningsIssued: submission.warningsIssued,
      maxViolations,
      autoSubmit,
    },
  });
});

/**
 * Finalize and score submission
 */
const finalizeSubmission = async (submission, status = SUBMISSION_STATUS.SUBMITTED) => {
  const test = await Test.findById(submission.test);
  const mcqQuestions = await MCQQuestion.find({ test: submission.test });

  let mcqScore = 0;
  for (const answer of submission.mcqAnswers) {
    const question = mcqQuestions.find((q) => q._id.toString() === answer.questionId.toString());
    if (!question) continue;
    const evalResult = evaluateMcq(question, answer.selectedAnswers);
    answer.isCorrect = evalResult.isCorrect;
    answer.marksAwarded = evalResult.marksAwarded;
    mcqScore += evalResult.marksAwarded;
  }

  if (test?.negativeMarking && mcqScore < 0) mcqScore = 0;

  const codingScore = submission.codingAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
  const totalScore = mcqScore + codingScore;
  const maxScore = test?.totalMarks || submission.maxScore;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  submission.mcqScore = mcqScore;
  submission.codingScore = codingScore;
  submission.totalScore = totalScore;
  submission.maxScore = maxScore;
  submission.percentage = percentage;
  submission.status = status;
  submission.submittedAt = new Date();

  await submission.save();

  // Calculate rank
  const betterCount = await Submission.countDocuments({
    test: submission.test,
    status: { $in: [SUBMISSION_STATUS.SUBMITTED, SUBMISSION_STATUS.AUTO_SUBMITTED] },
    totalScore: { $gt: totalScore },
  });
  submission.rank = betterCount + 1;
  await submission.save();

  // Create result snapshot
  const user = await require('../models/User').findById(submission.user);
  await Result.findOneAndUpdate(
    { submission: submission._id },
    {
      submission: submission._id,
      test: submission.test,
      user: submission.user,
      userName: user?.name,
      userEmail: user?.email,
      testTitle: test?.title,
      mcqScore,
      codingScore,
      totalScore,
      maxScore,
      percentage,
      rank: submission.rank,
      status: submission.status,
      submittedAt: submission.submittedAt,
      timeTakenMinutes: Math.round((submission.submittedAt - submission.startedAt) / 60000),
    },
    { upsert: true, new: true }
  );

  if (user?.email && !submission.emailSent) {
    try {
      await sendResultEmail(user.email, user.name, test?.title, {
        totalScore,
        maxScore,
        percentage,
        rank: submission.rank,
      });
      submission.emailSent = true;
      await submission.save();
    } catch (e) {
      console.log('Email send failed:', e.message);
    }
  }

  return submission;
};

/**
 * Submit entire test
 */
const submitTest = asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({
    test: req.params.testId,
    user: req.user._id,
    status: SUBMISSION_STATUS.IN_PROGRESS,
  });
  if (!submission) throw new ApiError(404, 'Active submission not found');

  const finalized = await finalizeSubmission(submission, SUBMISSION_STATUS.SUBMITTED);

  res.json({
    success: true,
    message: 'Test submitted successfully',
    data: {
      totalScore: finalized.totalScore,
      maxScore: finalized.maxScore,
      percentage: finalized.percentage,
      rank: finalized.rank,
      mcqScore: finalized.mcqScore,
      codingScore: finalized.codingScore,
    },
  });
});

/**
 * Get submission result for candidate
 */
const getMyResult = asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({
    test: req.params.testId,
    user: req.user._id,
  }).populate('test', 'title showLeaderboard');

  if (!submission) throw new ApiError(404, 'Submission not found');
  if (submission.status === SUBMISSION_STATUS.IN_PROGRESS) {
    throw new ApiError(400, 'Test still in progress');
  }

  res.json({ success: true, data: submission });
});

/**
 * Leaderboard
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.testId);
  if (!test?.showLeaderboard && req.user.role !== 'admin') {
    throw new ApiError(403, 'Leaderboard not available');
  }

  const leaderboard = await Submission.find({
    test: req.params.testId,
    status: { $in: [SUBMISSION_STATUS.SUBMITTED, SUBMISSION_STATUS.AUTO_SUBMITTED] },
  })
    .populate('user', 'name email college')
    .select('totalScore percentage rank submittedAt timeSpentSeconds')
    .sort({ totalScore: -1, submittedAt: 1 })
    .limit(100);

  res.json({ success: true, data: leaderboard });
});

/**
 * Admin: view all submissions for a test
 */
const getTestSubmissions = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const query = { test: req.params.testId };

  let submissions = await Submission.find(query)
    .populate('user', 'name email college registrationNumber')
    .sort({ totalScore: -1 });

  if (search) {
    const s = search.toLowerCase();
    submissions = submissions.filter(
      (sub) =>
        sub.user?.name?.toLowerCase().includes(s) ||
        sub.user?.email?.toLowerCase().includes(s)
    );
  }

  const total = submissions.length;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const paginated = submissions.slice(skip, skip + parseInt(limit, 10));

  res.json({
    success: true,
    data: paginated,
    pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * Admin: get single submission detail
 */
const getSubmissionDetail = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('user', 'name email college')
    .populate('test', 'title');

  if (!submission) throw new ApiError(404, 'Submission not found');
  res.json({ success: true, data: submission });
});

/**
 * Admin: manual coding score
 */
const manualScoreCoding = asyncHandler(async (req, res) => {
  const { questionId, score } = req.body;
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw new ApiError(404, 'Submission not found');

  const answerIdx = submission.codingAnswers.findIndex(
    (a) => a.questionId.toString() === questionId
  );
  if (answerIdx === -1) throw new ApiError(404, 'Coding answer not found');

  submission.codingAnswers[answerIdx].score = score;
  submission.codingAnswers[answerIdx].evalStatus = EVAL_STATUS.MANUAL;
  await submission.save();

  res.json({ success: true, message: 'Score updated' });
});

module.exports = {
  startTest,
  saveMcqAnswer,
  saveCodingAnswer,
  runCode,
  submitCoding,
  recordViolation,
  submitTest,
  getMyResult,
  getLeaderboard,
  getTestSubmissions,
  getSubmissionDetail,
  manualScoreCoding,
  finalizeSubmission,
};
