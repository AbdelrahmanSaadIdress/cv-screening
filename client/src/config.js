// Change the product name here and it updates everywhere in the interface.
export const BRAND = 'Shortlist'

export const ROLE_HOME = {
  recruiter: '/recruiter',
  applicant: '/applicant',
}

export const ROLE_LABEL = {
  recruiter: 'Recruiter',
  applicant: 'Applicant',
}

// What each role sees in the top navigation.
export const NAV = {
  recruiter: [
    { to: '/recruiter', label: 'Overview', end: true },
    { to: '/recruiter/candidates', label: 'Candidates' },
    { to: '/recruiter/roles', label: 'Roles' },
  ],
  applicant: [
    { to: '/applicant', label: 'Overview', end: true },
    { to: '/applicant/jobs', label: 'Open roles' },
    { to: '/applicant/applications', label: 'My applications' },
  ],
}
