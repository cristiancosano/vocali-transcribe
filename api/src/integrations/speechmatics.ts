export class SpeechmaticsError extends Error {
  constructor(readonly status: number) {
    super(`Speechmatics request failed with status ${status}`)
  }
}

function config() {
  const apiKey = process.env.SPEECHMATICS_API_KEY
  if (!apiKey) throw new Error('SPEECHMATICS_API_KEY is not configured')
  return {
    apiKey,
    baseUrl: (process.env.SPEECHMATICS_API_URL ?? 'https://eu1.asr.api.speechmatics.com').replace(/\/$/, ''),
    language: process.env.SPEECHMATICS_LANGUAGE ?? 'es'
  }
}

async function request(path: string, init?: RequestInit) {
  const { apiKey, baseUrl } = config()
  const result = await fetch(`${baseUrl}/v2/jobs${path}`, {
    ...init,
    headers: { ...init?.headers, authorization: `Bearer ${apiKey}` }
  })
  if (!result.ok) throw new SpeechmaticsError(result.status)
  return result
}

export async function createSpeechmaticsJob(audioUrl: string, reference: string, title: string) {
  const form = new FormData()
  form.append('config', JSON.stringify({
    type: 'transcription',
    transcription_config: { language: config().language },
    fetch_data: { url: audioUrl },
    tracking: { reference, title }
  }))
  const result = await request('', { method: 'POST', body: form })
  const body = await result.json() as { id?: unknown }
  if (typeof body.id !== 'string') throw new Error('Speechmatics returned an invalid job')
  return body.id
}

export async function getSpeechmaticsJob(id: string) {
  const result = await request(`/${encodeURIComponent(id)}`)
  const body = await result.json() as { job?: { status?: unknown } }
  if (typeof body.job?.status !== 'string') throw new Error('Speechmatics returned an invalid status')
  return body.job.status
}

export async function getSpeechmaticsTranscript(id: string) {
  return (await request(`/${encodeURIComponent(id)}/transcript?format=txt`)).text()
}

export async function createSpeechmaticsRealtimeToken() {
  const { apiKey, language } = config()
  const result = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ ttl: 60 })
  })
  if (!result.ok) throw new SpeechmaticsError(result.status)

  const body = await result.json() as { key_value?: unknown }
  if (typeof body.key_value !== 'string') throw new Error('Speechmatics returned an invalid realtime token')
  return {
    token: body.key_value,
    url: process.env.SPEECHMATICS_REALTIME_URL ?? 'wss://eu.rt.speechmatics.com/v2',
    language
  }
}
