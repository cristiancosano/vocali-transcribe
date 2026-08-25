import { RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider'
import { clientId, clientSecret, cognito } from '../integrations/cognito.js'
import { clearSessionCookie, deleteSession, findSession } from '../shared/session.js'
import { apiHandler, response } from '../shared/http.js'

export const handler = apiHandler(async event => {
  const found = await findSession(event)

  if (found) {
    try {
      await cognito.send(new RevokeTokenCommand({
        ClientId: clientId(),
        ClientSecret: clientSecret(),
        Token: found.session.refreshToken
      }))
    } catch (error) {
      const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
      console.error('Failed to revoke Cognito token', { name })
    }
    await deleteSession(found.key)
  }

  return response(204, undefined, [clearSessionCookie()])
})
