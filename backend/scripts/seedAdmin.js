require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@assessment.com';
    const exists = await User.findOne({ email });

    if (exists) {
      console.log('Super admin already exists:', email);
      process.exit(0);
    }

    await User.create({
      name: process.env.ADMIN_NAME || 'Super Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: ROLES.ADMIN,
    });

    console.log('Super admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', process.env.ADMIN_PASSWORD || 'Admin@123456');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
