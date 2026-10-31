import { useAuth } from '../auth/AuthContext'
import { useOverview, usePageTitle } from '../hooks'
import { MY_JOBS_URL } from '../config'

function Figures({ items, loading }) {
  return (
    <dl className="figures">
      {items.map((item) => (
        <div className="figures__item" key={item.label}>
          <dt className="figures__label">{item.label}</dt>
          <dd className="figures__value">{loading ? '–' : item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Address of the job-description form (the n8n "job-new" page).
// Set VITE_JOB_FORM_URL in client/.env. Only http(s) addresses are accepted.
const rawJobFormUrl = import.meta.env.VITE_JOB_FORM_URL || ''
const JOB_FORM_URL = /^https?:\/\//.test(rawJobFormUrl) ? rawJobFormUrl : ''

function EmptyState({ title, text, action, href, note }) {
  return (
    <section className="empty">
      <h2 className="empty__title">{title}</h2>
      <p className="empty__text">{text}</p>
      <div className="empty__actions">
        {href ? (
          <a className="btn btn--primary btn--inline" href={href}>
            {action}
          </a>
        ) : (
          <button type="button" className="btn btn--primary btn--inline" disabled>
            {action}
          </button>
        )}
        {note && <span className="empty__note">{note}</span>}
      </div>
    </section>
  )
}

function Head({ title, lede }) {
  return (
    <header className="page__head">
      <h1 className="page__title">{title}</h1>
      <p className="page__lede">{lede}</p>
    </header>
  )
}

export function RecruiterHome() {
  usePageTitle('Overview')
  const { user } = useAuth()
  const { data, error, loading } = useOverview('/recruiter/overview')
  const first = user.fullName.split(' ')[0]

  let jobHref = ''
  if (JOB_FORM_URL) {
    const link = new URL(JOB_FORM_URL)
    link.searchParams.set('recruiter', user.slug)
    jobHref = link.toString()
  }

  return (
    <div className="page">
      <Head
        title={`Welcome, ${first}`}
        lede={`Your hiring pipeline for ${user.company} will take shape here.`}
      />
      {error && <p className="page__error" role="alert">{error}</p>}
      {/* <Figures
        loading={loading}
        items={[
          { label: 'CVs uploaded', value: data?.stats.cvsUploaded },
          { label: 'Open roles', value: data?.stats.openRoles },
          { label: 'Shortlisted', value: data?.stats.shortlisted },
        ]}
      /> */}
      <EmptyState
        title="Create your first job"
        text="Paste a job description and Shortlist picks out the skills and weights candidates will be ranked on. You review everything before it goes live."
        action="Create a job"
        href={jobHref}
        note={jobHref ? 'Opens the job form.' : 'The job form address is not set yet.'}
      />

      {MY_JOBS_URL && (
        <section className="empty" style={{ marginTop: 20 }}>
          <h2 className="empty__title">Your jobs</h2>
          <p className="empty__text">See every job you have published, with its applicants and status.</p>
          <a
            className="btn btn--primary btn--inline"
            href={`${MY_JOBS_URL}?recruiter-name=${encodeURIComponent(user.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View my jobs
          </a>
        </section>
      )}
    </div>
  )
}


export function ApplicantHome() {
  const { user } = useAuth()
  const firstName = user.fullName.split(' ')[0]

  return (
    <div className="page">
      <h1>Welcome, {firstName}</h1>
      <p className="lede">
        Shortlist connects you with our open positions. Browse the roles we are hiring for,
        check the skills our teams value most, and apply with a CV that matches what we are looking for.
      </p>

      <div className="grid-2">
        <section className="card">
          <h2>Open roles</h2>
          <p>See every position that is currently accepting applications, with its requirements and experience level.</p>
        </section>
        <section className="card">
          <h2>Skills in demand</h2>
          <p>Explore which skills appear most often across open roles and how much weight each one carries.</p>
        </section>
      </div>

      <section className="card">
        <h2>How it works</h2>
        <ol>
          <li>Choose a role that fits your background.</li>
          <li>Review the job post and apply with your CV.</li>
          <li>Track your review and interview status with us.</li>
        </ol>
      </section>
    </div>
  )
}

export function Placeholder({ title, text }) {
  usePageTitle(title)
  return (
    <div className="page">
      <Head title={title} lede={text} />
    </div>
  )
}
