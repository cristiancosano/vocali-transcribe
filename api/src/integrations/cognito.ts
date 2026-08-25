import { createHmac } from 'node:crypto'
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'

export const cognito = new CognitoIdentityProviderClient({})

// Genera la firma que Cognito exige a los clientes configurados con secreto
export function secretHash(username: string) {
  return createHmac('sha256', clientSecret()).update(`${username}${clientId()}`).digest('base64')
}

// Obtiene el clientId de Cognito
export function clientId() {
  if (!process.env.COGNITO_CLIENT_ID) throw new Error('COGNITO_CLIENT_ID is not configured')
  return process.env.COGNITO_CLIENT_ID
}

// Obtiene el clientSecret de Cognito
export function clientSecret() {
  if (!process.env.COGNITO_CLIENT_SECRET) throw new Error('COGNITO_CLIENT_SECRET is not configured')
  return process.env.COGNITO_CLIENT_SECRET
}
