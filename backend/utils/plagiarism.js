/**
 * Basic plagiarism detection using token similarity (Jaccard-like)
 */
const tokenize = (code) => {
  return code
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
};

const plagiarismScore = (code1, code2) => {
  if (!code1 || !code2) return 0;
  const tokens1 = new Set(tokenize(code1));
  const tokens2 = new Set(tokenize(code2));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = [...tokens1].filter((t) => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  return Math.round((intersection / union) * 100);
};

module.exports = { plagiarismScore, tokenize };
