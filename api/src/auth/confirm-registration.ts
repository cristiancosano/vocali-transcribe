import { ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { AuthActionResponse, ConfirmationRequest } from '@vocali/contracts'
import { clientId, cognito, secretHash } from '../integrations/cognito.js'
import { cognitoHandler } from './shared/http.js'
import { parseBody, response } from '../shared/http.js'
import { requiredEmail, requiredString } from '../shared/validation.js'

export const handler = cognitoHandler(async event => {
  const body = parseBody<ConfirmationRequest>(event)
  const email = requiredEmail(body.email)

  await cognito.send(new ConfirmSignUpCommand({
    ClientId: clientId(),
    Username: email,
    ConfirmationCode: requiredString(body.code, 'code'),
    SecretHash: secretHash(email)
  }))
  
  return response(200, { complete: true } satisfies AuthActionResponse)
})
