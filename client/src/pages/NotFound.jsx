import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark'
import { usePageTitle } from '../hooks'

export default function NotFound() {
  usePageTitle('Page not found')
  return (
    <div className="lost">
      <BrandMark tone="dark" />
      <h1 className="lost__title">This page does not exist</h1>
      <p className="lost__text">The address may be mistyped, or the page has moved.</p>
      <Link className="btn btn--primary btn--inline" to="/">
        Go to your home page
      </Link>
    </div>
  )
}
