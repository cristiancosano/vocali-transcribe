import type { APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findSession: vi.fn(),
  presign: vi.fn(),
  s3Send: vi.fn(),
  signedUrl: vi.fn(),
  createTranscription: vi.fn(),
  findTranscription: vi.fn(),
  listTranscriptions: vi.fn(),
  createSpeechmaticsRealtimeToken: vi.fn(),
  createSpeechmaticsJob: vi.fn(),
  getSpeechmaticsJob: vi.fn(),
  getSpeechmaticsTranscript: vi.fn()
}))

vi.mock('../../shared/session.js', () => ({ findSession: mocks.findSession }))
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { send = mocks.s3Send },
  GetObjectCommand: class { constructor(readonly input: unknown) {} },
  HeadObjectCommand: class { constructor(readonly input: unknown) {} },
  PutObjectCommand: class { constructor(readonly input: unknown) {} }
}))
vi.mock('@aws-sdk/s3-presigned-post', () => ({ createPresignedPost: mocks.presign }))
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: mocks.signedUrl }))
vi.mock('../../integrations/speechmatics.js', () => ({
  SpeechmaticsError: class extends Error {},
  createSpeechmaticsRealtimeToken: mocks.createSpeechmaticsRealtimeToken,
  createSpeechmaticsJob: mocks.createSpeechmaticsJob,
  getSpeechmaticsJob: mocks.getSpeechmaticsJob,
  getSpeechmaticsTranscript: mocks.getSpeechmaticsTranscript
}))
vi.mock('../../database/transcriptions.js', () => ({
  createTranscription: mocks.createTranscription,
  findTranscription: mocks.findTranscription,
  listTranscriptions: mocks.listTranscriptions,
  publicTranscription: ({ userId: _, contentType: __, size: ___, ...result }: Record<string, unknown>) => result
}))

import { handler as completeRealtimeTranscription } from '../complete-realtime-transcription.js'
import { handler as createAudioUpload } from '../create-audio-upload.js'
import { handler as createRealtimeTranscriptionToken } from '../create-realtime-transcription-token.js'
import { handler as downloadTranscriptionAudio } from '../download-transcription-audio.js'
import { handler as downloadTranscriptionText } from '../download-transcription-text.js'
import { handler as getTranscription } from '../get-transcription.js'
import { handler as listTranscriptions } from '../list-transcriptions.js'
import { handler as pollTranscription } from '../poll-transcription.js'
import { handler as startTranscription } from '../start-transcription.js'

async function invoke(
  handler: APIGatewayProxyHandlerV2,
  body?: unknown,
  id?: string,
  method = body === undefined ? 'GET' : 'POST',
  queryStringParameters?: Record<string, string>
) {
  return await (handler as unknown as (
    event: unknown
  ) => Promise<APIGatewayProxyStructuredResultV2>)({
    headers: { origin: 'http://localhost:3000' },
    requestContext: { http: { method } },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(id ? { pathParameters: { id } } : {}),
    ...(queryStringParameters ? { queryStringParameters } : {})
  })
}

const audio = { name: 'audio.mp3', contentType: 'audio/mpeg', size: 1024 }
const completed = {
  id: 'transcription-id',
  userId: 'user-id',
  ...audio,
  text: 'Hola mundo.',
  createdAt: '2026-08-26T10:00:00.000Z'
}

describe('transcripciones', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('AUDIO_BUCKET', 'audio-bucket')
    vi.stubEnv('IS_OFFLINE', 'false')
    vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000')
    mocks.findSession.mockResolvedValue({ session: { id: 'user-id' } })
    mocks.findTranscription.mockResolvedValue(null)
    mocks.listTranscriptions.mockResolvedValue({ items: [] })
    mocks.presign.mockResolvedValue({ url: 'https://s3.example', fields: { key: 'value' } })
    mocks.s3Send.mockResolvedValue({})
    mocks.signedUrl.mockResolvedValue('https://s3.example/audio')
    mocks.createSpeechmaticsJob.mockResolvedValue('job-id')
    mocks.createSpeechmaticsRealtimeToken.mockResolvedValue({
      token: 'temporary-jwt',
      url: 'wss://eu.rt.speechmatics.com/v2',
      language: 'es'
    })
    mocks.getSpeechmaticsJob.mockResolvedValue('running')
    mocks.getSpeechmaticsTranscript.mockResolvedValue('Hola mundo.')
  })

  it('valida el audio, prefiere la carga directa y no crea un registro todavía', async () => {
    expect((await invoke(createAudioUpload, { name: 'notes.txt', contentType: 'text/plain', size: 10 })).statusCode).toBe(400)
    expect((await invoke(createAudioUpload, { ...audio, size: 20 * 1024 * 1024 + 1 })).statusCode).toBe(400)
    expect(mocks.presign).not.toHaveBeenCalled()

    const result = await invoke(createAudioUpload, audio)

    expect(result.statusCode).toBe(201)
    expect(JSON.parse(result.body!)).toMatchObject({ url: 'https://s3.example', fields: { key: 'value' } })
    expect(mocks.presign).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      Bucket: 'audio-bucket',
      Key: expect.stringMatching(/^user-id\/[0-9a-f-]+$/),
      Conditions: expect.arrayContaining([['content-length-range', 1, 20 * 1024 * 1024]])
    }))
    expect(mocks.createTranscription).not.toHaveBeenCalled()
  })

  it('explica cómo recuperar una sesión AWS ausente en desarrollo', async () => {
    vi.stubEnv('IS_OFFLINE', 'true')
    mocks.presign.mockRejectedValueOnce({ name: 'CredentialsProviderError' })

    const result = await invoke(createAudioUpload, { name: 'audio.m4a', contentType: 'audio/x-m4a', size: 40480 })

    expect(result.statusCode).toBe(503)
    expect(result.body).toContain('aws login')
  })

  it('entrega una credencial temporal autenticada para tiempo real', async () => {
    const result = await invoke(createRealtimeTranscriptionToken, undefined, undefined, 'POST')

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body!)).toMatchObject({ token: 'temporary-jwt', language: 'es' })
  })

  it('crea la transcripción en directo solamente después de tener audio y texto', async () => {
    expect((await invoke(completeRealtimeTranscription, { text: '   ' }, 'transcription-id')).statusCode).toBe(400)

    const result = await invoke(completeRealtimeTranscription, {
      ...audio,
      name: 'Grabación en directo.wav',
      contentType: 'audio/wav',
      text: 'Hola desde el micrófono.'
    }, 'transcription-id')

    expect(result.statusCode).toBe(201)
    expect(JSON.parse(result.body!)).toMatchObject({
      name: 'Grabación en directo.wav',
      text: 'Hola desde el micrófono.'
    })
    expect(mocks.s3Send.mock.calls[0]![0].input).toMatchObject({
      Bucket: 'audio-bucket',
      Key: 'user-id/transcription-id'
    })
    expect(mocks.createTranscription).toHaveBeenCalledWith(expect.objectContaining({
      id: 'transcription-id',
      userId: 'user-id',
      text: 'Hola desde el micrófono.'
    }))
  })

  it('mantiene el trabajo fuera de DynamoDB y crea el registro cuando Speechmatics termina', async () => {
    const started = await invoke(startTranscription, audio, 'transcription-id')

    expect(started.statusCode).toBe(200)
    expect(JSON.parse(started.body!)).toEqual({ jobId: 'job-id' })
    expect(mocks.s3Send.mock.calls[0]![0].input).toEqual({
      Bucket: 'audio-bucket',
      Key: 'user-id/transcription-id'
    })
    expect(mocks.createSpeechmaticsJob).toHaveBeenCalledWith(
      'https://s3.example/audio', 'transcription-id', 'audio.mp3'
    )
    expect(mocks.createTranscription).not.toHaveBeenCalled()

    const poll = { ...audio, jobId: 'job-id' }
    const processing = await invoke(pollTranscription, poll, 'transcription-id')
    expect(JSON.parse(processing.body!)).toBeNull()
    expect(mocks.createTranscription).not.toHaveBeenCalled()

    mocks.getSpeechmaticsJob.mockResolvedValueOnce('done')
    const result = await invoke(pollTranscription, poll, 'transcription-id')

    expect(result.statusCode).toBe(201)
    expect(JSON.parse(result.body!)).toMatchObject({ id: 'transcription-id', text: 'Hola mundo.' })
    expect(mocks.createTranscription).toHaveBeenCalledWith(expect.objectContaining({
      id: 'transcription-id',
      userId: 'user-id',
      text: 'Hola mundo.'
    }))
    expect(mocks.createTranscription.mock.calls[0]![0]).not.toHaveProperty('status')
  })

  it('lista y consulta únicamente las transcripciones completas del usuario', async () => {
    const cursor = { id: 'last-id', userId: 'user-id', createdAt: '2026-08-25T10:00:00.000Z' }
    mocks.listTranscriptions.mockResolvedValue({ items: [completed], cursor })
    mocks.findTranscription.mockResolvedValue(completed)

    const history = await invoke(listTranscriptions)
    const detail = await invoke(getTranscription, undefined, 'transcription-id')

    expect(JSON.parse(history.body!).items[0]).toEqual({
      id: 'transcription-id',
      name: 'audio.mp3',
      createdAt: '2026-08-26T10:00:00.000Z'
    })
    const nextCursor = JSON.parse(history.body!).nextCursor
    expect(JSON.parse(Buffer.from(nextCursor, 'base64url').toString())).toEqual({
      id: 'last-id',
      createdAt: '2026-08-25T10:00:00.000Z'
    })
    expect(JSON.parse(detail.body!).text).toBe('Hola mundo.')
    expect(mocks.listTranscriptions).toHaveBeenCalledWith('user-id', undefined)

    mocks.listTranscriptions.mockClear()
    mocks.listTranscriptions.mockResolvedValueOnce({ items: [] })
    await invoke(listTranscriptions, undefined, undefined, 'GET', { cursor: nextCursor })
    expect(mocks.listTranscriptions).toHaveBeenCalledWith('user-id', cursor)

    mocks.listTranscriptions.mockClear()
    const invalidCursor = await invoke(listTranscriptions, undefined, undefined, 'GET', { cursor: 'invalid' })
    expect(invalidCursor.statusCode).toBe(400)
    expect(mocks.listTranscriptions).not.toHaveBeenCalled()

    mocks.findTranscription.mockResolvedValueOnce({ ...completed, userId: 'other-user' })
    expect((await invoke(getTranscription, undefined, 'transcription-id')).statusCode).toBe(404)
  })

  it('descarga el audio desde S3 y el texto desde DynamoDB', async () => {
    mocks.findTranscription.mockResolvedValue(completed)

    const playbackResult = await invoke(downloadTranscriptionAudio, undefined, 'transcription-id')
    const audioResult = await invoke(downloadTranscriptionAudio, undefined, 'transcription-id', 'GET', { download: '1' })
    const transcriptResult = await invoke(downloadTranscriptionText, undefined, 'transcription-id')

    expect(playbackResult.statusCode).toBe(302)
    expect(mocks.signedUrl.mock.calls[0]![1].input).not.toHaveProperty('ResponseContentDisposition')
    expect(mocks.signedUrl.mock.calls[0]![2]).toEqual({ expiresIn: 60 * 60 })
    expect(audioResult.statusCode).toBe(302)
    expect(audioResult.headers?.location).toBe('https://s3.example/audio')
    expect(mocks.signedUrl.mock.calls[1]![1].input.ResponseContentDisposition).toContain('attachment')
    expect(transcriptResult.statusCode).toBe(200)
    expect(transcriptResult.body).toBe('Hola mundo.')
  })
})
