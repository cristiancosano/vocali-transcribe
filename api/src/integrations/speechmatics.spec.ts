import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSpeechmaticsRealtimeToken,
  createSpeechmaticsJob,
  getSpeechmaticsJob,
  getSpeechmaticsTranscript
} from './speechmatics.js'

const fetchMock = vi.fn()

describe('cliente Speechmatics', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('SPEECHMATICS_API_KEY', 'secret-key')
    vi.stubEnv('SPEECHMATICS_API_URL', 'https://eu1.asr.api.speechmatics.com')
    vi.stubEnv('SPEECHMATICS_LANGUAGE', 'es')
    vi.stubGlobal('fetch', fetchMock)
  })

  it('crea el trabajo, consulta su estado y descarga el texto', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'job-id' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ job: { status: 'done' } })))
      .mockResolvedValueOnce(new Response('Hola mundo.'))

    expect(await createSpeechmaticsJob('https://s3.example/audio', 'local-id', 'audio.mp3')).toBe('job-id')
    expect(await getSpeechmaticsJob('job-id')).toBe('done')
    expect(await getSpeechmaticsTranscript('job-id')).toBe('Hola mundo.')

    const [url, request] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://eu1.asr.api.speechmatics.com/v2/jobs')
    expect(request.headers.authorization).toBe('Bearer secret-key')
    const config = JSON.parse(request.body.get('config'))
    expect(config).toMatchObject({
      transcription_config: { language: 'es' },
      fetch_data: { url: 'https://s3.example/audio' },
      tracking: { reference: 'local-id', title: 'audio.mp3' }
    })
  })

  it('crea una credencial temporal para tiempo real sin exponer la clave principal', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ key_value: 'temporary-jwt' })))

    expect(await createSpeechmaticsRealtimeToken()).toEqual({
      token: 'temporary-jwt',
      url: 'wss://eu.rt.speechmatics.com/v2',
      language: 'es'
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mp.speechmatics.com/v1/api_keys?type=rt',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer secret-key' }),
        body: JSON.stringify({ ttl: 60 })
      })
    )
  })
})
