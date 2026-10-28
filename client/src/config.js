export const BRAND = 'Shortlist'

export const ROLE_LABEL = {
  recruiter: 'Recruiter',
  applicant: 'Applicant',
}

// Each person's home address, for example /u/omar-khaled/recruiter
export function homePath(user) {
  return `/u/${user.slug}/${user.role}`
}

const NAV = {
  recruiter: [
    { path: '', label: 'Overview', end: true },
    { path: '/candidates', label: 'Candidates' },
    { path: '/roles', label: 'Roles' },
  ],
  applicant: [
    { path: '', label: 'Overview', end: true },
    { path: '/jobs', label: 'Open roles' },
    { path: '/applications', label: 'My applications' },
  ],
}

// Navigation links for this user, with full addresses that include their name.
export function navFor(user) {
  const base = homePath(user)
  return NAV[user.role].map((item) => ({ ...item, to: base + item.path }))
}