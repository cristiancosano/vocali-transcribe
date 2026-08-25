import { findTranscription } from '../database/transcriptions.js'
import { apiHandler, HttpError } from '../shared/http.js'
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
  if (transcription.text === undefined) {
    throw new HttpError(404, 'NOT_FOUND', 'No se encontró el texto de la transcripción.')
  }

  const fileName = encodeURIComponent(`${transcription.name}.txt`).replaceAll("'", '%27')
  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="transcripcion.txt"; filename*=UTF-8''${fileName}`,
      'content-type': 'text/plain; charset=utf-8'
    },
    body: transcription.text
  }
}, false)
