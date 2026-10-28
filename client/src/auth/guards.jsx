import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { homePath } from '../config'

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
  if (user) return <Navigate to={homePath(user)} replace />
  return <Outlet />
}

/** The address must contain this user's own name. Anyone else is sent home. */
export function RequireOwner() {
  const { user, ready } = useAuth()
  const { slug } = useParams()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  if (user.slug !== slug) return <Navigate to={homePath(user)} replace />
  return <Outlet />
}

/** Only the given role gets through. */
export function RequireRole({ role }) {
  const { user, ready } = useAuth()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homePath(user)} replace />
  return <Outlet />
}

/** The root address sends everyone to their own page. */
export function RoleRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <Splash />
  return <Navigate to={user ? homePath(user) : '/login'} replace />
}