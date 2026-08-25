export type AuthUser = {
  id: string
  email: string
}

export type AuthSessionResponse = {
  user: AuthUser
}

export type AuthActionResponse = {
  complete: boolean
  destination?: string
}

export type ApiErrorCode =
  | 'AUTH_CHALLENGE_REQUIRED'
  | 'CODE_EXPIRED'
  | 'CODE_INVALID'
  | 'EMAIL_EXISTS'
  | 'EMAIL_INVALID'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'PASSWORD_INVALID'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'USER_NOT_CONFIRMED'
  | 'INTERNAL_ERROR'

export type ApiErrorResponse = {
  code: ApiErrorCode
  message: string
  field?: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = LoginRequest

export type ConfirmationRequest = {
  email: string
  code: string
}

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024

export type CreateAudioUploadRequest = {
  name: string
  contentType: string
  size: number
}

export type CreateAudioUploadResponse = {
  id: string
  url: string
  fields: Record<string, string>
}

export type RealtimeTokenResponse = {
  token: string
  url: string
  language: string
}

export type StartTranscriptionResponse = {
  jobId: string
}

export type PollTranscriptionRequest = CreateAudioUploadRequest & {
  jobId: string
}

export type CompleteRealtimeTranscriptionRequest = CreateAudioUploadRequest & {
  text: string
}

export type TranscriptionResponse = {
  id: string
  name: string
  createdAt: string
  text?: string
}

export type ListTranscriptionsResponse = {
  items: TranscriptionResponse[]
  nextCursor?: string
}
