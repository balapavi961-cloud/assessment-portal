const Test = require('../models/Test');
const MCQQuestion = require('../models/MCQQuestion');
const CodingQuestion = require('../models/CodingQuestion');
const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { TEST_STATUS } = require('../config/constants');

const recalculateTestMarks = async (testId) => {
  const [mcqMarks, codingMarks] = await Promise.all([
    MCQQuestion.aggregate([{ $match: { test: testId } }, { $group: { _id: null, total: { $sum: '$marks' } } }]),
    CodingQuestion.aggregate([{ $match: { test: testId } }, { $group: { _id: null, total: { $sum: '$marks' } } }]),
  ]);
  const total = (mcqMarks[0]?.total || 0) + (codingMarks[0]?.total || 0);
  await Test.findByIdAndUpdate(testId, { totalMarks: total });
  return total;
};

/** Default schedule: starts now, ends in 30 days (if admin leaves dates empty) */
const normalizeSchedule = (body) => {
  const now = new Date();
  const payload = { ...body };
  if (!payload.startTime) {
    payload.startTime = now;
  } else {
    payload.startTime = new Date(payload.startTime);
  }
  if (!payload.endTime) {
    const end = new Date(payload.startTime);
    end.setDate(end.getDate() + 30);
    payload.endTime = end;
  } else {
    payload.endTime = new Date(payload.endTime);
  }
  return payload;
};

/**
 * @route   POST /api/tests
 */
const createTest = asyncHandler(async (req, res) => {
  const test = await Test.create({
    ...normalizeSchedule(req.body),
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: test });
});

/**
 * @route   GET /api/tests
 */
const getTests = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const query = { createdBy: req.user._id };
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [tests, total] = await Promise.all([
    Test.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    Test.countDocuments(query),
  ]);

  res.json({ success: true, data: tests, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) } });
});

/**
 * @route   GET /api/tests/available
 * @desc    Published tests for candidates
 */
const getAvailableTests = asyncHandler(async (req, res) => {
  const now = new Date();
  // Show all published tests (active, upcoming, or ended) — not only those with future endTime
  const tests = await Test.find({ status: TEST_STATUS.PUBLISHED })
    .select('-questions')
    .sort({ startTime: 1 });

  const testIds = tests.map((t) => t._id);
  const submissions = await Submission.find({
    user: req.user._id,
    test: { $in: testIds },
  }).select('test status totalScore percentage');

  const subMap = Object.fromEntries(submissions.map((s) => [s.test.toString(), s]));

  const enriched = tests.map((t) => {
    let scheduleStatus = 'active';
    if (now < t.startTime) scheduleStatus = 'upcoming';
    else if (now > t.endTime) scheduleStatus = 'ended';

    return {
      ...t.toObject(),
      userSubmission: subMap[t._id.toString()] || null,
      canJoin: scheduleStatus === 'active',
      scheduleStatus,
    };
  });

  res.json({ success: true, data: enriched });
});

/**
 * @route   GET /api/tests/:id
 */
const getTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id).populate('createdBy', 'name email');
  if (!test) throw new ApiError(404, 'Test not found');

  const [mcqQuestions, codingQuestions] = await Promise.all([
    MCQQuestion.find({ test: test._id }).sort({ order: 1 }),
    CodingQuestion.find({ test: test._id }).sort({ order: 1 }),
  ]);

  res.json({
    success: true,
    data: { test, mcqQuestions, codingQuestions },
  });
});

/**
 * @route   PUT /api/tests/:id
 */
const updateTest = asyncHandler(async (req, res) => {
  let test = await Test.findById(req.params.id);
  if (!test) throw new ApiError(404, 'Test not found');
  if (test.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorized');
  }

  test = await Test.findByIdAndUpdate(req.params.id, normalizeSchedule(req.body), {
    new: true,
    runValidators: true,
  });
  await recalculateTestMarks(test._id);
  res.json({ success: true, data: test });
});

/**
 * @route   DELETE /api/tests/:id
 */
const deleteTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) throw new ApiError(404, 'Test not found');

  await Promise.all([
    MCQQuestion.deleteMany({ test: test._id }),
    CodingQuestion.deleteMany({ test: test._id }),
    Submission.deleteMany({ test: test._id }),
    Test.findByIdAndDelete(test._id),
  ]);

  res.json({ success: true, message: 'Test deleted' });
});

/**
 * @route   PATCH /api/tests/:id/publish
 */
const togglePublish = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id);
  if (!test) throw new ApiError(404, 'Test not found');

  if (test.status === TEST_STATUS.PUBLISHED) {
    test.status = TEST_STATUS.UNPUBLISHED;
  } else {
    await recalculateTestMarks(test._id);
    const mcqCount = await MCQQuestion.countDocuments({ test: test._id });
    const codingCount = await CodingQuestion.countDocuments({ test: test._id });
    if (mcqCount + codingCount === 0) {
      throw new ApiError(400, 'Add at least one question before publishing');
    }
    test.status = TEST_STATUS.PUBLISHED;
  }

  await test.save();
  res.json({ success: true, data: test, message: `Test ${test.status}` });
});

module.exports = {
  createTest,
  getTests,
  getAvailableTests,
  getTest,
  updateTest,
  deleteTest,
  togglePublish,
  recalculateTestMarks,
};
