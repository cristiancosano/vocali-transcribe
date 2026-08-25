import type { CreateAudioUploadRequest, StartTranscriptionResponse } from '@vocali/contracts'
import { createSpeechmaticsJob, SpeechmaticsError } from '../integrations/speechmatics.js'
import { apiHandler, HttpError, parseBody, response } from '../shared/http.js'
import { findSession } from '../shared/session.js'
import { requiredString, validateAudio } from '../shared/validation.js'
import { assertAudioExists, createAudioReadUrl } from '../storage/audio.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const id = requiredString(event.pathParameters?.id, 'id')
  const audio = validateAudio(parseBody<CreateAudioUploadRequest>(event))
  try {
    await assertAudioExists(found.session.id, id)
  } catch (error) {
    const status = error && typeof error === 'object' && '$metadata' in error
      ? (error.$metadata as { httpStatusCode?: number }).httpStatusCode
      : undefined
    if (status === 404 || (error as { name?: string })?.name === 'NotFound') {
      throw new HttpError(404, 'NOT_FOUND', 'No se encontró el audio.')
    }
    throw error
  }

  try {
    const audioUrl = await createAudioReadUrl(found.session.id, id, 6 * 60 * 60)
    const jobId = await createSpeechmaticsJob(audioUrl, id, audio.name)
    return response(200, { jobId } satisfies StartTranscriptionResponse)
  } catch (error) {
    if (error instanceof SpeechmaticsError) {
      throw new HttpError(502, 'INTERNAL_ERROR', 'Speechmatics no pudo iniciar la transcripción.')
    }
    throw error
  }
})
