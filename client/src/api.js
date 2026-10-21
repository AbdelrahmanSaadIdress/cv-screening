export class ApiError extends Error {
  constructor(message, { status, code, fields } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields || {}
  }
}

// Calls to these routes never trigger a silent token refresh.
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']

async function send(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        // Custom header the server requires on every state-changing request (CSRF defence).
        'X-Requested-With': 'cv-screening',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', {
      status: 0,
      code: 'NETWORK',
    })
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  return { res, data }
}

// If several requests hit an expired session at once, they share one refresh call.
let refreshing = null
function refreshSession() {
  if (!refreshing) {
    refreshing = send('/auth/refresh', { method: 'POST' })
      .then(({ res }) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export async function api(path, options) {
  let { res, data } = await send(path, options)

  if (res.status === 401 && !NO_REFRESH.includes(path)) {
    if (await refreshSession()) {
      ;({ res, data } = await send(path, options))
    }
    if (res.status === 401) window.dispatchEvent(new Event('auth:expired'))
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'Something went wrong. Try again.', {
      status: res.status,
      code: data?.code,
      fields: data?.fields,
    })
  }
  return data
}
