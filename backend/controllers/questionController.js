const Test = require('../models/Test');
const MCQQuestion = require('../models/MCQQuestion');
const CodingQuestion = require('../models/CodingQuestion');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { recalculateTestMarks } = require('./testController');

const verifyTestOwnership = async (testId, userId) => {
  const test = await Test.findById(testId);
  if (!test) throw new ApiError(404, 'Test not found');
  if (test.createdBy.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized');
  }
  return test;
};

const syncTestQuestions = async (testId) => {
  const [mcqs, codings] = await Promise.all([
    MCQQuestion.find({ test: testId }).sort({ order: 1 }),
    CodingQuestion.find({ test: testId }).sort({ order: 1 }),
  ]);

  const questions = [
    ...mcqs.map((q, i) => ({
      question: q._id,
      questionModel: 'MCQQuestion',
      order: q.order ?? i,
      marks: q.marks,
    })),
    ...codings.map((q, i) => ({
      question: q._id,
      questionModel: 'CodingQuestion',
      order: q.order ?? i + mcqs.length,
      marks: q.marks,
    })),
  ].sort((a, b) => a.order - b.order);

  await Test.findByIdAndUpdate(testId, { questions });
  await recalculateTestMarks(testId);
};

// ---- MCQ ----
const addMcq = asyncHandler(async (req, res) => {
  await verifyTestOwnership(req.params.testId, req.user._id);
  const question = await MCQQuestion.create({
    ...req.body,
    test: req.params.testId,
    createdBy: req.user._id,
  });
  await syncTestQuestions(req.params.testId);
  res.status(201).json({ success: true, data: question });
});

const updateMcq = asyncHandler(async (req, res) => {
  const question = await MCQQuestion.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  await verifyTestOwnership(question.test, req.user._id);

  Object.assign(question, req.body);
  await question.save();
  await syncTestQuestions(question.test);
  res.json({ success: true, data: question });
});

const deleteMcq = asyncHandler(async (req, res) => {
  const question = await MCQQuestion.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  await verifyTestOwnership(question.test, req.user._id);
  const testId = question.test;
  await question.deleteOne();
  await syncTestQuestions(testId);
  res.json({ success: true, message: 'MCQ deleted' });
});

// ---- Coding ----
const addCoding = asyncHandler(async (req, res) => {
  await verifyTestOwnership(req.params.testId, req.user._id);
  const question = await CodingQuestion.create({
    ...req.body,
    test: req.params.testId,
    createdBy: req.user._id,
  });
  await syncTestQuestions(req.params.testId);
  res.status(201).json({ success: true, data: question });
});

const updateCoding = asyncHandler(async (req, res) => {
  const question = await CodingQuestion.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  await verifyTestOwnership(question.test, req.user._id);

  Object.assign(question, req.body);
  await question.save();
  await syncTestQuestions(question.test);
  res.json({ success: true, data: question });
});

const deleteCoding = asyncHandler(async (req, res) => {
  const question = await CodingQuestion.findById(req.params.id);
  if (!question) throw new ApiError(404, 'Question not found');
  await verifyTestOwnership(question.test, req.user._id);
  const testId = question.test;
  await question.deleteOne();
  await syncTestQuestions(testId);
  res.json({ success: true, message: 'Coding question deleted' });
});

module.exports = {
  addMcq,
  updateMcq,
  deleteMcq,
  addCoding,
  updateCoding,
  deleteCoding,
};
