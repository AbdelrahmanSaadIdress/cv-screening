import { useEffect, useState } from 'react'
import { api } from './api'
import { BRAND } from './config'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} - ${BRAND}` : BRAND
  }, [title])
}

/** Loads a role-specific overview from the API. */
export function useOverview(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true })

  useEffect(() => {
    let cancelled = false
    api(path)
      .then((data) => !cancelled && setState({ data, error: '', loading: false }))
      .catch((err) => !cancelled && setState({ data: null, error: err.message, loading: false }))
    return () => {
      cancelled = true
    }
  }, [path])

  return state
}
