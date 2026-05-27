const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
};

/**
 * Send result notification email
 */
const sendResultEmail = async (userEmail, userName, testTitle, result) => {
  const transport = getTransporter();
  if (!transport) {
    console.log('Email not configured. Skipping notification.');
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Assessment Result</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Your assessment <strong>${testTitle}</strong> has been submitted.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Total Score</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${result.totalScore}/${result.maxScore}</strong></td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Percentage</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${result.percentage}%</strong></td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Rank</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>#${result.rank || 'N/A'}</strong></td></tr>
      </table>
      <p style="color: #6b7280; font-size: 12px;">Assessment Portal - Automated Notification</p>
    </div>
  `;

  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: userEmail,
    subject: `Result: ${testTitle}`,
    html,
  });
  return true;
};

module.exports = { sendResultEmail };
