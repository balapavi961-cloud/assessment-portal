module.exports = {
  ROLES: {
    ADMIN: 'admin',
    CANDIDATE: 'candidate',
  },
  TEST_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
    ARCHIVED: 'archived',
  },
  QUESTION_TYPES: {
    MCQ: 'mcq',
    CODING: 'coding',
  },
  SUBMISSION_STATUS: {
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    AUTO_SUBMITTED: 'auto_submitted',
    DISQUALIFIED: 'disqualified',
  },
  EVAL_STATUS: {
    PENDING: 'pending',
    AUTO: 'auto',
    MANUAL: 'manual',
  },
  SUPPORTED_LANGUAGES: ['javascript', 'python', 'java', 'cpp'],
  MAX_TAB_VIOLATIONS: 3,
};
