const PDFDocument = require('pdfkit');
const Result = require('../models/Result');
const Submission = require('../models/Submission');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Export results as CSV
 */
const exportCSV = asyncHandler(async (req, res) => {
  const results = await Result.find({ test: req.params.testId })
    .sort({ totalScore: -1 })
    .lean();

  const headers = [
    'Rank',
    'Name',
    'Email',
    'MCQ Score',
    'Coding Score',
    'Total Score',
    'Max Score',
    'Percentage',
    'Status',
    'Submitted At',
  ];

  const rows = results.map((r, i) => [
    r.rank || i + 1,
    r.userName,
    r.userEmail,
    r.mcqScore,
    r.codingScore,
    r.totalScore,
    r.maxScore,
    r.percentage + '%',
    r.status,
    r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
  ]);

  const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=results-${req.params.testId}.csv`);
  res.send(csv);
});

/**
 * Export results as PDF
 */
const exportPDF = asyncHandler(async (req, res) => {
  const results = await Result.find({ test: req.params.testId })
    .sort({ totalScore: -1 })
    .lean();

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=results-${req.params.testId}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text('Assessment Results Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Test ID: ${req.params.testId}`, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  results.forEach((r, i) => {
    doc
      .fontSize(11)
      .text(
        `${i + 1}. ${r.userName} (${r.userEmail}) - Score: ${r.totalScore}/${r.maxScore} (${r.percentage}%)`
      );
  });

  doc.end();
});

module.exports = { exportCSV, exportPDF };
