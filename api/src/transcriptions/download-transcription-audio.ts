import { findTranscription } from '../database/transcriptions.js'
import { apiHandler, HttpError } from '../shared/http.js'
import { findSession } from '../shared/session.js'
import { requiredString } from '../shared/validation.js'
import { createAudioReadUrl } from '../storage/audio.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const id = requiredString(event.pathParameters?.id, 'id')
  const transcription = await findTranscription(id)
  if (!transcription || transcription.userId !== found.session.id) {
    throw new HttpError(404, 'NOT_FOUND', 'No se encontró la transcripción.')
  }
  const download = event.queryStringParameters?.download === '1'
  const url = await createAudioReadUrl(
    found.session.id,
    id,
    download ? 60 : 60 * 60,
    download ? transcription.name : undefined
  )

  return { statusCode: 302, headers: { location: url, 'cache-control': 'no-store' } }
}, false)
