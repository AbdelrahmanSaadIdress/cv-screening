import { BRAND } from '../config'

export default function BrandMark({ tone = 'dark' }) {
  return (
    <span className={`brand brand--${tone}`}>
      <svg className="brand__icon" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="brand__tile" />
        <rect x="9" y="6" width="14" height="20" rx="2" className="brand__sheet" />
        <rect x="11.5" y="10" width="9" height="2" rx="1" className="brand__line" />
        <rect x="8" y="14.5" width="16" height="4.5" rx="1" className="brand__mark" />
        <rect x="11.5" y="15.5" width="9" height="2" rx="1" className="brand__ink" />
        <rect x="11.5" y="21" width="6" height="2" rx="1" className="brand__line" />
      </svg>
      <span className="brand__name">{BRAND}</span>
    </span>
  )
}
