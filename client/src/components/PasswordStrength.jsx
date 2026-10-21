const LABELS = ['', 'Not valid yet', 'Acceptable', 'Good', 'Strong']

export function passwordChecks(password) {
  return {
    length: password.length >= 10,
    mix: /[A-Za-z]/.test(password) && /\d/.test(password),
  }
}

function score(password) {
  if (!password) return 0
  const { length, mix } = passwordChecks(password)
  if (!length || !mix) return 1
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  if (password.length >= 14 && classes >= 3) return 4
  if (password.length >= 12 || classes >= 3) return 3
  return 2
}

export default function PasswordStrength({ password }) {
  const s = score(password)
  const checks = passwordChecks(password)
  return (
    <div className="strength">
      <div className="strength__bar" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`strength__seg${n <= s ? ` strength__seg--on-${s}` : ''}`} />
        ))}
      </div>
      <p className="strength__label" aria-live="polite">
        {s ? `Password strength: ${LABELS[s].toLowerCase()}` : 'Use at least 10 characters with a letter and a number.'}
      </p>
      {password && (
        <ul className="strength__rules">
          <li className={checks.length ? 'is-met' : ''}>At least 10 characters</li>
          <li className={checks.mix ? 'is-met' : ''}>A letter and a number</li>
        </ul>
      )}
    </div>
  )
}
