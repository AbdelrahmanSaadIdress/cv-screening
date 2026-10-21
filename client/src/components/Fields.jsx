import { useId, useState } from 'react'

export function Field({ label, error, hint, children }) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({ label, error, hint, ...input }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(aria) => <input className="field__input" {...aria} {...input} />}
    </Field>
  )
}

export function PasswordField({ label = 'Password', error, hint, children, ...input }) {
  const [visible, setVisible] = useState(false)
  return (
    <Field label={label} error={error} hint={hint}>
      {(aria) => (
        <>
          <div className="field__control">
            <input
              className="field__input field__input--padded"
              type={visible ? 'text' : 'password'}
              {...aria}
              {...input}
            />
            <button
              type="button"
              className="field__toggle"
              onClick={() => setVisible((v) => !v)}
              aria-pressed={visible}
            >
              {visible ? 'Hide' : 'Show'}
            </button>
          </div>
          {children}
        </>
      )}
    </Field>
  )
}

export function Alert({ children }) {
  if (!children) return null
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}
