import { useAuth } from '../auth/AuthContext'
import { useOverview, usePageTitle } from '../hooks'

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

function EmptyState({ title, text, action, note }) {
  return (
    <section className="empty">
      <h2 className="empty__title">{title}</h2>
      <p className="empty__text">{text}</p>
      <div className="empty__actions">
        <button type="button" className="btn btn--primary btn--inline" disabled>
          {action}
        </button>
        <span className="empty__note">{note}</span>
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

  return (
    <div className="page">
      <Head
        title={`Welcome, ${first}`}
        lede={`Your hiring pipeline for ${user.company} will take shape here.`}
      />
      {error && <p className="page__error" role="alert">{error}</p>}
      <Figures
        loading={loading}
        items={[
          { label: 'CVs uploaded', value: data?.stats.cvsUploaded },
          { label: 'Open roles', value: data?.stats.openRoles },
          { label: 'Shortlisted', value: data?.stats.shortlisted },
        ]}
      />
      <EmptyState
        title="Upload your first batch of CVs"
        text="Add a folder of PDF or Word files. Each CV is read for skills, experience and education, so you can search and rank all of them at once."
        action="Upload CVs"
        note="Uploads are not enabled yet."
      />
    </div>
  )
}

export function ApplicantHome() {
  usePageTitle('Overview')
  const { user } = useAuth()
  const { data, error, loading } = useOverview('/applicant/overview')
  const first = user.fullName.split(' ')[0]

  return (
    <div className="page">
      <Head
        title={`Welcome, ${first}`}
        lede="Keep one CV on file and apply to roles with a single click."
      />
      {error && <p className="page__error" role="alert">{error}</p>}
      <Figures
        loading={loading}
        items={[
          { label: 'Profile complete', value: `${data?.stats.profileCompletion ?? 0}%` },
          { label: 'Open roles', value: data?.stats.openRoles },
          { label: 'Applications', value: data?.stats.applications },
        ]}
      />
      <EmptyState
        title="Add your CV"
        text="Upload your CV and recruiters can match you to roles that fit your experience."
        action="Upload your CV"
        note="Uploads are not enabled yet."
      />
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
