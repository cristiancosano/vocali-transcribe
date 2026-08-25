import type { ApiErrorCode, ApiErrorResponse } from '@vocali/contracts'
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2
} from 'aws-lambda'

export type Action = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>

// Represents an expected error that can safely be returned by the API.
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly field?: ApiErrorResponse['field']
  ) {
    super(message)
  }
}

// Applies origin validation and consistent error responses to an API handler.
export function apiHandler(action: Action, checkOrigin = true): APIGatewayProxyHandlerV2 {
  return async event => {
    try {
      if (checkOrigin) assertAllowedOrigin(event)
      return await action(event)
    } catch (error) {
      return errorResponse(error)
    }
  }
}

// Parses API Gateway JSON bodies, including base64-encoded requests.
export function parseBody<T>(event: APIGatewayProxyEventV2): T {
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
      : event.body

    if (!body) throw new Error()
    return JSON.parse(body) as T
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', 'La petición no es válida.')
  }
}

// Rejects browser requests whose origin is not explicitly allowed.
export function assertAllowedOrigin(event: APIGatewayProxyEventV2) {
  const origin = event.headers.origin
  const allowedOrigins = [
    process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    process.env.WEB_ORIGIN_LOCAL ?? 'http://localhost:3000'
  ].flatMap(value => value
    .split(',')
    .map(origin => origin.trim()))

  if (!origin || !allowedOrigins.includes(origin)) {
    throw new HttpError(403, 'INVALID_REQUEST', 'Origen de la petición no permitido.')
  }
}

// Builds a JSON API Gateway response with the shared headers.
export function response(
  statusCode: number,
  body?: unknown,
  cookies?: string[]
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8'
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(cookies ? { cookies } : {})
  }
}

// Serializes expected errors and hides details from unexpected ones.
function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return response(error.statusCode, {
      code: error.code,
      message: error.message,
      ...(error.field ? { field: error.field } : {})
    } satisfies ApiErrorResponse)
  }

  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  if (process.env.IS_OFFLINE === 'true' && name === 'CredentialsProviderError') {
    return response(503, {
      code: 'INTERNAL_ERROR',
      message: 'La sesión local de AWS no está disponible. Ejecuta aws login y reinicia la API.'
    } satisfies ApiErrorResponse)
  }
  console.error('Unhandled API error', { name })
  return response(500, {
    code: 'INTERNAL_ERROR',
    message: 'No se pudo completar la operación.'
  } satisfies ApiErrorResponse)
}
