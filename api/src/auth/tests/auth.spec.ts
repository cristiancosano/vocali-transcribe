import type { APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type TestCommand = { constructor: { name: string }, input: Record<string, unknown> }

const mocks = vi.hoisted(() => {
  process.env.IS_OFFLINE = 'false'
  return {
    cognitoSend: vi.fn(),
    dynamoSend: vi.fn(),
    sessions: new Map<string, Record<string, unknown>>()
  }
})

vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  class Command { constructor(readonly input: Record<string, unknown>) {} }
  class InitiateAuthCommand extends Command {}
  class RevokeTokenCommand extends Command {}
  class SignUpCommand extends Command {}
  class ConfirmSignUpCommand extends Command {}
  class CognitoIdentityProviderClient { send = mocks.cognitoSend }
  return { CognitoIdentityProviderClient, InitiateAuthCommand, RevokeTokenCommand, SignUpCommand, ConfirmSignUpCommand }
})

vi.mock('@aws-sdk/client-dynamodb', () => {
  class CreateTableCommand { constructor(readonly input: Record<string, unknown>) {} }
  class DynamoDBClient { send = vi.fn() }
  return { CreateTableCommand, DynamoDBClient }
})

vi.mock('@aws-sdk/lib-dynamodb', () => {
  class Command { constructor(readonly input: Record<string, unknown>) {} }
  class PutCommand extends Command {}
  class GetCommand extends Command {}
  class DeleteCommand extends Command {}
  return {
    PutCommand,
    GetCommand,
    DeleteCommand,
    DynamoDBDocumentClient: { from: () => ({ send: mocks.dynamoSend }) }
  }
})

import { handler as confirmRegistration } from '../confirm-registration.js'
import { handler as login } from '../login.js'
import { handler as logout } from '../logout.js'
import { handler as register } from '../register.js'
import { handler as getSession } from '../session.js'
import { hashSessionId } from '../../shared/session.js'

const origin = 'http://localhost:3000'

function event(body?: unknown, cookies?: string[], requestOrigin = origin) {
  return {
    headers: { origin: requestOrigin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(cookies ? { cookies } : {})
  } as never
}

async function invoke(handler: APIGatewayProxyHandlerV2, request: ReturnType<typeof event>) {
  return await (handler as unknown as (
    requestEvent: ReturnType<typeof event>
  ) => Promise<APIGatewayProxyStructuredResultV2>)(request)
}

function idToken(id: string, email: string) {
  const payload = Buffer.from(JSON.stringify({ sub: id, email })).toString('base64url')
  return `header.${payload}.signature`
}

describe('autenticación BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sessions.clear()
    vi.stubEnv('COGNITO_CLIENT_ID', 'client-id')
    vi.stubEnv('COGNITO_CLIENT_SECRET', 'client-secret')
    vi.stubEnv('SESSIONS_TABLE', 'sessions')
    vi.stubEnv('WEB_ORIGIN', 'https://app.example')
    vi.stubEnv('WEB_ORIGIN_LOCAL', origin)
    mocks.dynamoSend.mockImplementation(async command => {
      const { input } = command as TestCommand
      if (command.constructor.name === 'PutCommand') {
        const item = input.Item as Record<string, unknown>
        mocks.sessions.set(String(item.sessionId), item)
      }
      if (command.constructor.name === 'DeleteCommand') {
        mocks.sessions.delete(String((input.Key as Record<string, unknown>).sessionId))
      }
      if (command.constructor.name === 'GetCommand') {
        return { Item: mocks.sessions.get(String((input.Key as Record<string, unknown>).sessionId)) }
      }
      return {}
    })
  })

  it('registra y confirma una cuenta con Cognito', async () => {
    mocks.cognitoSend.mockResolvedValueOnce({
      UserConfirmed: false,
      CodeDeliveryDetails: { Destination: 'u***@example.com' }
    }).mockResolvedValueOnce({})

    expect((await invoke(register, event({ email: 'user@example.com', password: 'secret123' }))).statusCode).toBe(201)
    expect((await invoke(confirmRegistration, event({ email: 'user@example.com', code: '123456' }))).statusCode).toBe(200)

    const [signUp, confirmation] = mocks.cognitoSend.mock.calls.map(([command]) => command as TestCommand)
    expect(signUp.constructor.name).toBe('SignUpCommand')
    expect(signUp.input).toMatchObject({ Username: 'user@example.com', Password: 'secret123' })
    expect(confirmation.constructor.name).toBe('ConfirmSignUpCommand')
    expect(confirmation.input).toMatchObject({ Username: 'user@example.com', ConfirmationCode: '123456' })
  })

  it('inicia, restaura y cierra una sesión opaca', async () => {
    mocks.cognitoSend.mockResolvedValueOnce({
      AuthenticationResult: {
        IdToken: idToken('user-id', 'user@example.com'),
        RefreshToken: 'refresh-token'
      }
    }).mockRejectedValueOnce({ name: 'TooManyRequestsException' })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const loginResult = await invoke(login, event({ email: 'user@example.com', password: 'secret123' }))
    const cookie = loginResult.cookies?.[0]
    expect(loginResult.statusCode).toBe(200)
    expect(cookie).toContain('HttpOnly; SameSite=Lax')
    expect(cookie).toContain('Secure')
    expect(mocks.sessions.has(cookie!.split('=')[1]!.split(';')[0]!)).toBe(false)

    const requestCookie = cookie!.split(';')[0]!
    const sessionResult = await invoke(getSession, event(undefined, [requestCookie]))
    expect(sessionResult.statusCode).toBe(200)
    expect(sessionResult.body).toContain('user@example.com')

    const logoutResult = await invoke(logout, event(undefined, [requestCookie]))
    expect(logoutResult.statusCode).toBe(204)
    expect(logoutResult.cookies?.[0]).toContain('Max-Age=0')
    expect(mocks.sessions.size).toBe(0)
    expect(consoleError).toHaveBeenCalledWith('Failed to revoke Cognito token', { name: 'TooManyRequestsException' })
    consoleError.mockRestore()
  })

  it('rechaza sesiones ausentes o caducadas', async () => {
    expect((await invoke(getSession, event())).statusCode).toBe(401)

    const sessionId = 'expired-session'
    const key = hashSessionId(sessionId)
    mocks.sessions.set(key, {
      sessionId: key,
      id: 'user-id',
      email: 'user@example.com',
      refreshToken: 'refresh-token',
      expiresAt: 0
    })

    expect((await invoke(getSession, event(undefined, [`__Host-vocali_session=${sessionId}`]))).statusCode).toBe(401)
    expect(mocks.sessions.has(key)).toBe(false)
  })

  it('valida email y contraseña antes de llamar a Cognito', async () => {
    const invalidEmail = await invoke(register, event({ email: 'not-an-email', password: 'secret123' }))
    expect(invalidEmail.statusCode).toBe(400)
    expect(invalidEmail.body).toContain('EMAIL_INVALID')

    const shortPassword = await invoke(register, event({ email: 'user@example.com', password: 'short' }))
    expect(shortPassword.statusCode).toBe(400)
    expect(shortPassword.body).toContain('password')
    expect(mocks.cognitoSend).not.toHaveBeenCalled()
  })

  it('no filtra credenciales ni acepta otros orígenes', async () => {
    mocks.cognitoSend.mockRejectedValueOnce({ name: 'NotAuthorizedException' })
    const invalidLogin = await invoke(login, event({ email: 'user@example.com', password: 'wrong' }))
    expect(invalidLogin.statusCode).toBe(401)
    expect(invalidLogin.body).toContain('INVALID_CREDENTIALS')

    const foreignOrigin = await invoke(register, event(
      { email: 'user@example.com', password: 'secret123' },
      undefined,
      'https://attacker.example'
    ))
    expect(foreignOrigin.statusCode).toBe(403)
    expect(mocks.cognitoSend).toHaveBeenCalledTimes(1)

    mocks.cognitoSend.mockRejectedValueOnce({ name: 'InvalidParameterException' })
    const invalidParameter = await invoke(register, event({ email: 'user@example.com', password: 'secret123' }))
    expect(invalidParameter.statusCode).toBe(400)
    expect(invalidParameter.body).toContain('INVALID_REQUEST')
    expect(invalidParameter.body).not.toContain('EMAIL_INVALID')
  })
})
