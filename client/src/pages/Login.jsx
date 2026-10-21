import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { Alert, PasswordField, Spinner, TextField } from '../components/Fields'
import { BRAND } from '../config'
import { usePageTitle } from '../hooks'

export default function Login() {
  usePageTitle('Sign in')
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fields, setFields] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // A field's message disappears as soon as the person edits that field.
  const clearError = (name) => setFields((f) => ({ ...f, [name]: undefined }))

  async function onSubmit(event) {
    event.preventDefault()
    const missing = {}
    if (!email.trim()) missing.email = 'Enter your email address.'
    if (!password) missing.password = 'Enter your password.'
    setFields(missing)
    setError('')
    if (Object.keys(missing).length) return

    setBusy(true)
    try {
      // On success the router sends the person to the home for their role.
      await login(email.trim(), password)
    } catch (err) {
      setFields(err.fields || {})
      if (!err.fields || !Object.keys(err.fields).length) setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth__title">Sign in</h1>
      <p className="auth__lede">Welcome back. Pick up where you left off.</p>

      <Alert>{error}</Alert>

      <form className="form" onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            clearError('email')
          }}
          error={fields.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            clearError('password')
          }}
          error={fields.password}
        />
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy && <Spinner />}
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>

      <p className="switch">
        New to {BRAND}? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
