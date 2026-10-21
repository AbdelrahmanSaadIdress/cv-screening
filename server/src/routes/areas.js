const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Each area is enforced here on the server. Hiding a link in the UI is only
// a convenience; these checks are what actually keep roles apart.

router.get('/recruiter/overview', requireAuth, requireRole('recruiter'), (req, res) => {
  res.json({
    company: req.user.company,
    stats: { cvsUploaded: 0, openRoles: 0, shortlisted: 0 },
  });
});

router.get('/applicant/overview', requireAuth, requireRole('applicant'), (req, res) => {
  res.json({
    stats: { profileCompletion: 0, applications: 0, openRoles: 0 },
  });
});

module.exports = router;
