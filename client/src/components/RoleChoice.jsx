const OPTIONS = [
  {
    value: 'recruiter',
    title: "I'm hiring",
    text: 'Upload CVs, screen candidates and build shortlists.',
  },
  {
    value: 'applicant',
    title: "I'm applying",
    text: 'Share your CV and apply to open roles.',
  },
]

export default function RoleChoice({ value, onChange, error }) {
  return (
    <fieldset className="roles">
      <legend className="field__label">How will you use the platform?</legend>
      <div className="roles__grid">
        {OPTIONS.map((o) => (
          <label key={o.value} className={`roles__option${value === o.value ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="role"
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="roles__title">{o.title}</span>
            <span className="roles__text">{o.text}</span>
          </label>
        ))}
      </div>
      {error && <p className="field__error">{error}</p>}
    </fieldset>
  )
}
