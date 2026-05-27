const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../config/constants');

/**
 * @route   POST /api/auth/register
 * @desc    Register candidate
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, college, registrationNumber } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    throw new ApiError(400, 'Email already registered');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: ROLES.CANDIDATE,
    phone: phone || '',
    college: college || '',
    registrationNumber: registrationNumber || '',
  });

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user,
      token,
    },
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user (admin or candidate)
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account has been deactivated');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token,
    },
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, college, registrationNumber, avatar } = req.body;
  const updates = {};

  if (name) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (college !== undefined) updates.college = college;
  if (registrationNumber !== undefined) updates.registrationNumber = registrationNumber;
  if (avatar !== undefined) updates.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    message: 'Profile updated',
    data: user,
  });
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

module.exports = { register, login, getMe, updateProfile, changePassword };
