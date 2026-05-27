const User = require('../models/User');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ROLES, TEST_STATUS } = require('../config/constants');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Admin dashboard statistics
 */
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCandidates,
    totalTests,
    publishedTests,
    totalSubmissions,
    completedSubmissions,
    recentSubmissions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: ROLES.CANDIDATE }),
    Test.countDocuments(),
    Test.countDocuments({ status: TEST_STATUS.PUBLISHED }),
    Submission.countDocuments(),
    Submission.countDocuments({ status: { $in: ['submitted', 'auto_submitted'] } }),
    Submission.find()
      .populate('user', 'name email')
      .populate('test', 'title')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Monthly submission trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const submissionTrend = await Submission.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Test participation stats
  const testStats = await Test.aggregate([
    { $match: { status: TEST_STATUS.PUBLISHED } },
    {
      $lookup: {
        from: 'submissions',
        localField: '_id',
        foreignField: 'test',
        as: 'subs',
      },
    },
    {
      $project: {
        title: 1,
        participantCount: { $size: '$subs' },
        avgScore: { $avg: '$subs.totalScore' },
      },
    },
    { $sort: { participantCount: -1 } },
    { $limit: 5 },
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalCandidates,
        totalTests,
        publishedTests,
        totalSubmissions,
        completedSubmissions,
        completionRate:
          totalSubmissions > 0
            ? Math.round((completedSubmissions / totalSubmissions) * 100)
            : 0,
      },
      submissionTrend,
      testStats,
      recentSubmissions,
    },
  });
});

/**
 * @route   GET /api/admin/users
 * @desc    List users with search/filter
 */
const getUsers = asyncHandler(async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query;
  const query = {};

  if (role) query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { college: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

/**
 * @route   PUT /api/admin/users/:id/toggle
 * @desc    Activate/deactivate user
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === ROLES.ADMIN) throw new ApiError(403, 'Cannot modify admin');

  user.isActive = !user.isActive;
  await user.save();

  res.json({ success: true, data: user, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
});

module.exports = { getDashboard, getUsers, toggleUserStatus };
