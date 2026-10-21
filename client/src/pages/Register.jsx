import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { Alert, PasswordField, Spinner, TextField } from '../components/Fields'
import PasswordStrength, { passwordChecks } from '../components/PasswordStrength'
import RoleChoice from '../components/RoleChoice'
import { BRAND } from '../config'
import { usePageTitle } from '../hooks'

export default function Register() {
  usePageTitle('Create account')
  const { register } = useAuth()
  const [role, setRole] = useState(null)
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fields, setFields] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Update a field and drop its error message as soon as the person edits it.
  const bind = (name, setter) => ({
    onChange: (e) => {
      setter(e.target.value)
      setFields((f) => ({ ...f, [name]: undefined }))
    },
    error: fields[name],
  })

  async function onSubmit(event) {
    event.preventDefault()
    const missing = {}
    if (!role) missing.role = `Choose how you will use ${BRAND}.`
    if (fullName.trim().length < 2) missing.fullName = 'Enter your full name.'
    if (role === 'recruiter' && company.trim().length < 2) missing.company = 'Enter your company name.'
    if (!email.trim()) missing.email = 'Enter your email address.'
    const checks = passwordChecks(password)
    if (!checks.length || !checks.mix) missing.password = 'Use at least 10 characters with a letter and a number.'
    setFields(missing)
    setError('')
    if (Object.keys(missing).length) return

    setBusy(true)
    try {
      await register({
        role,
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        ...(role === 'recruiter' ? { company: company.trim() } : {}),
      })
    } catch (err) {
      setFields(err.fields || {})
      if (!err.fields || !Object.keys(err.fields).length) setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="auth__title">Create your account</h1>
      <p className="auth__lede">It takes a minute. Your choice below sets up the right workspace.</p>

      <Alert>{error}</Alert>

      <form className="form" onSubmit={onSubmit} noValidate>
        <RoleChoice
          value={role}
          onChange={(value) => {
            setRole(value)
            setFields((f) => ({ ...f, role: undefined }))
          }}
          error={fields.role}
        />

        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          value={fullName}
          {...bind('fullName', setFullName)}
        />
        {role === 'recruiter' && (
          <TextField
            label="Company"
            name="organization"
            autoComplete="organization"
            value={company}
            {...bind('company', setCompany)}
          />
        )}
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          {...bind('email', setEmail)}
        />
        <PasswordField
          label="Password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          {...bind('password', setPassword)}
        >
          <PasswordStrength password={password} />
        </PasswordField>

        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy && <Spinner />}
          {busy ? 'Creating account' : 'Create account'}
        </button>
      </form>

      <p className="switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
