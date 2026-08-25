import type { ListTranscriptionsResponse } from '@vocali/contracts'
import { listTranscriptions, type TranscriptionCursor } from '../database/transcriptions.js'
import { apiHandler, HttpError, response } from '../shared/http.js'
import { findSession } from '../shared/session.js'

function decodeCursor(value: string, userId: string): TranscriptionCursor {
  try {
    if (value.length > 1024) throw new Error()
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>
    if (typeof cursor.id !== 'string' || typeof cursor.createdAt !== 'string') throw new Error()
    return { id: cursor.id, createdAt: cursor.createdAt, userId }
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', 'El cursor de paginación no es válido.')
  }
}

function encodeCursor({ id, createdAt }: TranscriptionCursor) {
  return Buffer.from(JSON.stringify({ id, createdAt })).toString('base64url')
}

export const handler = apiHandler(async event => {
  const found = await findSession(event)
  if (!found) throw new HttpError(401, 'UNAUTHORIZED', 'No hay una sesión activa.')

  const cursor = event.queryStringParameters?.cursor
  const page = await listTranscriptions(
    found.session.id,
    cursor ? decodeCursor(cursor, found.session.id) : undefined
  )
  return response(200, {
    items: page.items.map(({ id, name, createdAt }) => ({ id, name, createdAt })),
    ...(page.cursor ? { nextCursor: encodeCursor(page.cursor) } : {})
  } satisfies ListTranscriptionsResponse)
}, false)
