export const BRAND = 'Shortlist'

export const ROLE_LABEL = {
  recruiter: 'Recruiter',
  applicant: 'Applicant',
}

// Each person's home address, for example /u/omar-khaled/recruiter
export function homePath(user) {
  return `/u/${user.slug}/${user.role}`
}
export const MY_JOBS_URL = import.meta.env.VITE_MY_JOBS_URL || ''
const JOBS_URL = import.meta.env.VITE_JOBS_URL || 'https://unappropriated-tatyana-nonpedagogically.ngrok-free.dev/webhook-test/jobs'
const SKILLS_URL = import.meta.env.VITE_SKILLS_URL || 'https://unappropriated-tatyana-nonpedagogically.ngrok-free.dev/webhook-test/skills'


const NAV = {
  recruiter: [
    { path: '', label: 'Overview', end: true },
    // { path: '/candidates', label: 'Candidates' },
    // { path: '/roles', label: 'Roles' },
  ],
  applicant: [
    // { to: '/applicant', label: 'Overview', end: true },
    // { href: JOBS_URL, label: 'Open roles' },
    // { href: SKILLS_URL, label: 'Skills' },
  ],
}

// Navigation links for this user, with full addresses that include their name.
export function navFor(user) {
  const base = homePath(user)
  const items = NAV[user.role].map((item) => ({ ...item, to: base + item.path }))
  if (user.role === 'recruiter' && MY_JOBS_URL) {
    items.push({
      label: 'My jobs',
      to: `${MY_JOBS_URL}?recruiter-name=${encodeURIComponent(user.slug)}`,
      external: true,
    })
  }else{
    items.push({
      label: 'Open Jobs',
      to: `${JOBS_URL}`,
      external: true,
    });
    items.push({
      label: 'Skills Trend',
      to: `${SKILLS_URL}`,
      external: true,
    })
  }
  return items
}