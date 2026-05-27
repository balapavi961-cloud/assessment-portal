const User = require("../models/User");

const createAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    if (!email) return;

    let admin = await User.findOne({ email });

    if (!admin) {
      await User.create({
        name: process.env.ADMIN_NAME,
        email: email,
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
      });

      console.log("✅ Admin Created Successfully");
    } else {
      // Fetch admin with password to verify it's correctly hashed and matches env variable
      const adminWithPass = await User.findOne({ email }).select('+password');
      const isMatch = await adminWithPass.comparePassword(process.env.ADMIN_PASSWORD);
      if (!isMatch) {
        adminWithPass.password = process.env.ADMIN_PASSWORD;
        await adminWithPass.save();
        console.log("🔄 Admin Password Corrected (fixed double-hashing)");
      } else {
        console.log("✅ Admin Already Exists");
      }
    }
  } catch (error) {
    console.log("Admin Creation Error:", error.message);
  }
};

module.exports = createAdmin;