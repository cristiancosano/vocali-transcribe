import type { CompleteRealtimeTranscriptionRequest, TranscriptionResponse } from '@vocali/contracts'
import { createTranscription, findTranscription, publicTranscription } from '../database/transcriptions.js'
import { findSession } from '../shared/session.js'
import { apiHandler, HttpError, parseBody, response } from '../shared/http.js'
import { requiredString, validateAudio } from '../shared/validation.js'
import { assertAudioExists } from '../storage/audio.js'

const MAX_TRANSCRIPT_BYTES = 300 * 1024

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const id = requiredString(event.pathParameters?.id, 'id')
  const body = parseBody<CompleteRealtimeTranscriptionRequest>(event)
  const text = requiredString(body.text, 'text', { trim: false })
  const audio = validateAudio(body)
  if (Buffer.byteLength(text) > MAX_TRANSCRIPT_BYTES) {
    throw new HttpError(400, 'INVALID_REQUEST', 'La transcripción es demasiado larga.', 'text')
  }
  const transcription = await findTranscription(id)
  if (transcription?.userId === found.session.id) {
    return response(200, publicTranscription(transcription) satisfies TranscriptionResponse)
  }
  if (transcription) {
    throw new HttpError(404, 'NOT_FOUND', 'No se encontró la transcripción.')
  }

  await assertAudioExists(found.session.id, id)
  const completed = {
    id,
    userId: found.session.id,
    ...audio,
    text,
    createdAt: new Date().toISOString()
  }
  await createTranscription(completed)

  return response(201, publicTranscription(completed) satisfies TranscriptionResponse)
})
