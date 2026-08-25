import { createHash, randomBytes } from 'node:crypto'
import type { AuthUser } from '@vocali/contracts'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import {
  deleteStoredSession,
  getSession,
  putSession,
  type StoredSession
} from '../database/sessions.js'

const ttlSeconds = Number(process.env.SESSION_TTL_SECONDS) || 30 * 24 * 60 * 60

export function hashSessionId(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('hex')
}

export function sessionCookie(sessionId: string, maxAge = ttlSeconds) {
  const offline = process.env.IS_OFFLINE === 'true'
  const name = offline ? 'vocali_session' : '__Host-vocali_session'
  return `${name}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${offline ? '' : '; Secure'}`
}

export function clearSessionCookie() {
  return sessionCookie('', 0)
}

export function readSessionId(event: APIGatewayProxyEventV2) {
  const cookies = event.cookies ?? event.headers.cookie?.split(';') ?? []
  const names = process.env.IS_OFFLINE === 'true'
    ? ['vocali_session']
    : ['__Host-vocali_session']

  for (const cookie of cookies) {
    const [name, ...value] = cookie.trim().split('=')
    if (names.includes(name)) return value.join('=') || null
  }

  return null
}

export async function createSession(user: AuthUser, refreshToken: string) {
  const sessionId = randomBytes(32).toString('base64url')
  const session: StoredSession = {
    ...user,
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds
  }

  await putSession(hashSessionId(sessionId), session)
  return { sessionId, session }
}

export async function findSession(event: APIGatewayProxyEventV2) {
  const sessionId = readSessionId(event)
  if (!sessionId) return null

  const key = hashSessionId(sessionId)
  const session = await getSession(key)
  if (!session) return null

  if (session.expiresAt <= Math.floor(Date.now() / 1000)) {
    await deleteStoredSession(key)
    return null
  }

  return { key, session }
}

export async function deleteSession(key: string) {
  await deleteStoredSession(key)
}

export function userFromIdToken(idToken: string): AuthUser {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      sub?: unknown
      email?: unknown
    }

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error()
    return { id: payload.sub, email: payload.email }
  } catch {
    throw new Error('Cognito returned an invalid ID token')
  }
}
