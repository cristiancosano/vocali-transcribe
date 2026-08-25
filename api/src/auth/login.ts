import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { AuthSessionResponse, LoginRequest } from '@vocali/contracts'
import { clientId, cognito, secretHash } from '../integrations/cognito.js'
import { cognitoHandler } from './shared/http.js'
import { createSession, sessionCookie, userFromIdToken } from '../shared/session.js'
import { HttpError, parseBody, response } from '../shared/http.js'
import { requiredEmail, requiredString } from '../shared/validation.js'

export const handler = cognitoHandler(async event => {
  const body = parseBody<LoginRequest>(event)

  const email = requiredEmail(body.email)
  const password = requiredString(body.password, 'password', { trim: false })
  const id = clientId()
  const hash = secretHash(email)
  
  const result = await cognito.send(new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: id,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      ...(hash ? { SECRET_HASH: hash } : {})
    }
  }))

  if (result.ChallengeName) {
    throw new HttpError(409, 'AUTH_CHALLENGE_REQUIRED', 'El inicio de sesión requiere un paso adicional.')
  }

  const tokens = result.AuthenticationResult
  if (!tokens?.IdToken || !tokens.RefreshToken) throw new Error('Cognito did not return a complete session')

  const user = userFromIdToken(tokens.IdToken)
  const { sessionId } = await createSession(user, tokens.RefreshToken)
  return response(200, { user } satisfies AuthSessionResponse, [sessionCookie(sessionId)])
})
