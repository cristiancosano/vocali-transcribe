import type { RealtimeTokenResponse } from '@vocali/contracts'
import { createSpeechmaticsRealtimeToken, SpeechmaticsError } from '../integrations/speechmatics.js'
import { apiHandler, HttpError, response } from '../shared/http.js'
import { findSession } from '../shared/session.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  try {
    return response(200, await createSpeechmaticsRealtimeToken() satisfies RealtimeTokenResponse)
  } catch (error) {
    if (error instanceof SpeechmaticsError) {
      throw new HttpError(502, 'INTERNAL_ERROR', 'No se pudo iniciar la transcripción en tiempo real.')
    }
    throw error
  }
})
