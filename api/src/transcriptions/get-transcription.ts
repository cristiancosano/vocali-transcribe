import type { TranscriptionResponse } from '@vocali/contracts'
import { findTranscription, publicTranscription } from '../database/transcriptions.js'
import { apiHandler, HttpError, response } from '../shared/http.js'
import { findSession } from '../shared/session.js'
import { requiredString } from '../shared/validation.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const id = requiredString(event.pathParameters?.id, 'id')
  const transcription = await findTranscription(id)
  if (!transcription || transcription.userId !== found.session.id) {
    throw new HttpError(404, 'NOT_FOUND', 'No se encontró la transcripción.')
  }

  return response(200, publicTranscription(transcription) satisfies TranscriptionResponse)
}, false)
