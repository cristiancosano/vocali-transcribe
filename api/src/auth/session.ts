import type { AuthSessionResponse } from '@vocali/contracts'
import { findSession } from '../shared/session.js'
import { apiHandler, HttpError, response } from '../shared/http.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const { id, email } = found.session
  return response(200, { user: { id, email } } satisfies AuthSessionResponse)
}, false)
