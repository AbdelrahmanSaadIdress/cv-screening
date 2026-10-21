import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ROLE_HOME } from '../config'

function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <span className="spinner spinner--dark" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

/** Login and register: signed-in people are sent to their own home instead. */
export function PublicOnly() {
  const { user, ready } = useAuth()
  if (!ready) return <Splash />
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Outlet />
}

/** Only the given role gets through. Anyone else goes to login or to their own area. */
export function RequireRole({ role }) {
  const { user, ready } = useAuth()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Outlet />
}

/** The root address sends everyone to the right place. */
export function RoleRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <Splash />
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />
}
