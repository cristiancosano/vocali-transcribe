import type { PollTranscriptionRequest, TranscriptionResponse } from '@vocali/contracts'
import { createTranscription, findTranscription, publicTranscription } from '../database/transcriptions.js'
import {
  getSpeechmaticsJob,
  getSpeechmaticsTranscript,
  SpeechmaticsError
} from '../integrations/speechmatics.js'
import { apiHandler, HttpError, parseBody, response } from '../shared/http.js'
import { findSession } from '../shared/session.js'
import { requiredString, validateAudio } from '../shared/validation.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const id = requiredString(event.pathParameters?.id, 'id')
  const transcription = await findTranscription(id)
  if (transcription) {
    if (transcription.userId !== found.session.id) {
      throw new HttpError(404, 'NOT_FOUND', 'No se encontró la transcripción.')
    }
    return response(200, publicTranscription(transcription) satisfies TranscriptionResponse)
  }
  const body = parseBody<PollTranscriptionRequest>(event)
  const jobId = requiredString(body.jobId, 'jobId')
  const audio = validateAudio(body)
  try {
    const providerStatus = await getSpeechmaticsJob(jobId)
    if (providerStatus !== 'done') {
      if (['rejected', 'deleted', 'expired'].includes(providerStatus)) {
        throw new HttpError(502, 'INTERNAL_ERROR', 'Speechmatics no pudo completar la transcripción.')
      }
      return response(200, null)
    }

    const completed = {
      id,
      userId: found.session.id,
      ...audio,
      text: await getSpeechmaticsTranscript(jobId),
      createdAt: new Date().toISOString()
    }
    await createTranscription(completed)
    return response(201, publicTranscription(completed) satisfies TranscriptionResponse)
  } catch (error) {
    if (error instanceof SpeechmaticsError) {
      throw new HttpError(502, 'INTERNAL_ERROR', 'No se pudo consultar Speechmatics.')
    }
    throw error
  }
}, false)
