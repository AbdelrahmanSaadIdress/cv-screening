import BrandMark from './BrandMark'
import CvField from './CvField'

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth__stage">
        <CvField />
        <div className="auth__veil" aria-hidden="true" />
        <header className="auth__brand">
          <BrandMark tone="light" />
        </header>
        <div className="auth__pitch">
          <h2 className="auth__headline">Thousands of CVs in. The right few out.</h2>
          <p className="auth__subline">
            Upload a stack, describe the role and get a ranked shortlist you can trust.
          </p>
        </div>
      </aside>
      <main className="auth__panel">
        <div className="auth__form">{children}</div>
      </main>
    </div>
  )
}
