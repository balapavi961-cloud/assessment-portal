const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../config/constants');

/**
 * Protect routes - verify JWT
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized. Please login.');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found or deactivated');
  }

  req.user = user;
  next();
});

/**
 * Restrict to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }
    next();
  };
};

const adminOnly = authorize(ROLES.ADMIN);
const candidateOnly = authorize(ROLES.CANDIDATE);

module.exports = { protect, authorize, adminOnly, candidateOnly };
