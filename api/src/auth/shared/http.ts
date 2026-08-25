import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { apiHandler, HttpError, type Action } from '../../shared/http.js'

// Añade traducción de errores de Cognito al API Handler
export function cognitoHandler(action: Action, checkOrigin = true): APIGatewayProxyHandlerV2 {
  return apiHandler(async event => {
    try {
      return await action(event)
    } catch (error) {
      throw cognitoError(error)
    }
  }, checkOrigin)
}

// Mapea las excepciones conocidas y más comunes de Cognito a mensajes de error que se pueden mostrar al usuario
function cognitoError(error: unknown) {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''

  const mapped: Record<string, HttpError> = {
    AliasExistsException: new HttpError(409, 'EMAIL_EXISTS', 'Ya existe una cuenta con este correo electrónico.', 'email'),
    CodeMismatchException: new HttpError(400, 'CODE_INVALID', 'El código no es correcto.', 'code'),
    ExpiredCodeException: new HttpError(400, 'CODE_EXPIRED', 'El código ha caducado.', 'code'),
    InvalidPasswordException: new HttpError(400, 'PASSWORD_INVALID', passwordMessage(message), 'password'),
    NotAuthorizedException: new HttpError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.'),
    TooManyFailedAttemptsException: new HttpError(429, 'RATE_LIMITED', 'Demasiados intentos. Espera unos minutos.'),
    TooManyRequestsException: new HttpError(429, 'RATE_LIMITED', 'Demasiadas solicitudes. Espera unos minutos.'),
    LimitExceededException: new HttpError(429, 'RATE_LIMITED', 'Demasiadas solicitudes. Espera unos minutos.'),
    UsernameExistsException: new HttpError(409, 'EMAIL_EXISTS', 'Ya existe una cuenta con este correo electrónico.', 'email'),
    UserNotFoundException: new HttpError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no son correctos.'),
    UserNotConfirmedException: new HttpError(403, 'USER_NOT_CONFIRMED', 'Debes confirmar tu cuenta antes de iniciar sesión.')
  }

  if (mapped[name]) return mapped[name]
  if (name === 'InvalidParameterException') {
    return new HttpError(400, 'INVALID_REQUEST', 'La petición no es válida.')
  }

  return error
}

// Muestra mensajes de error de política de contraseña más amigables para el usuario.
function passwordMessage(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('lowercase')) return 'Debe incluir al menos una letra minúscula.'
  if (normalized.includes('uppercase')) return 'Debe incluir al menos una letra mayúscula.'
  if (normalized.includes('numeric') || normalized.includes('number')) return 'Debe incluir al menos un número.'
  if (normalized.includes('special') || normalized.includes('symbol')) return 'Debe incluir al menos un carácter especial.'
  if (normalized.includes('length') || normalized.includes('long enough')) return 'No alcanza la longitud mínima requerida.'
  return 'La contraseña no cumple la política de seguridad.'
}
