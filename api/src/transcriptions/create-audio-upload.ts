import { randomUUID } from 'node:crypto'
import type { CreateAudioUploadRequest, CreateAudioUploadResponse } from '@vocali/contracts'
import { apiHandler, HttpError, parseBody, response } from '../shared/http.js'
import { findSession } from '../shared/session.js'
import { validateAudio } from '../shared/validation.js'
import { createAudioUpload } from '../storage/audio.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const { contentType } = validateAudio(parseBody<CreateAudioUploadRequest>(event))

  const id = randomUUID()
  const upload = await createAudioUpload(found.session.id, id, contentType)
  return response(201, { id, ...upload } satisfies CreateAudioUploadResponse)
})
