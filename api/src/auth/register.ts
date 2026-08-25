import { SignUpCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { AuthActionResponse, RegisterRequest } from '@vocali/contracts'
import { clientId, cognito, secretHash } from '../integrations/cognito.js'
import { cognitoHandler } from './shared/http.js'
import { parseBody, response } from '../shared/http.js'
import { requiredEmail, requiredString } from '../shared/validation.js'

export const handler = cognitoHandler(async event => {
  const body = parseBody<RegisterRequest>(event)

  const email = requiredEmail(body.email)
  const password = requiredString(body.password, 'password', { minLength: 8, trim: false })
  
  const result = await cognito.send(new SignUpCommand({
    ClientId: clientId(),
    Username: email,
    Password: password,
    SecretHash: secretHash(email),
    UserAttributes: [{ Name: 'email', Value: email }]
  }))

  return response(201, {
    complete: result.UserConfirmed ?? false,
    destination: result.CodeDeliveryDetails?.Destination
  } satisfies AuthActionResponse)
})
