/**
 * Auto-evaluate MCQ answer
 */
const evaluateMcq = (question, selectedAnswers) => {
  const correct = [...question.correctAnswers].sort();
  const selected = [...(selectedAnswers || [])].sort();

  const isCorrect =
    correct.length === selected.length &&
    correct.every((ans, i) => ans === selected[i]);

  let marksAwarded = 0;
  if (isCorrect) {
    marksAwarded = question.marks;
  } else if (selected.length > 0 && question.negativeMarks) {
    marksAwarded = -question.negativeMarks;
  }

  return { isCorrect, marksAwarded };
};

module.exports = evaluateMcq;
