import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
// import { NAV, ROLE_LABEL } from '../config'
import { navFor, ROLE_LABEL } from '../config'
import BrandMark from './BrandMark'

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <header className="shell__bar">
        <div className="shell__inner">
          <BrandMark tone="dark" />
          <nav className="shell__nav" aria-label="Main">
            {navFor(user).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="shell__link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="shell__user">
            <span className={`pill pill--${user.role}`}>{ROLE_LABEL[user.role]}</span>
            <span className="shell__name">{user.fullName}</span>
            <button type="button" className="btn btn--quiet" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  )
}
