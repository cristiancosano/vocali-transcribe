import { MAX_AUDIO_BYTES, type CreateAudioUploadRequest } from '@vocali/contracts'
import { HttpError } from './http.js'

export function validateAudio({ name, contentType, size }: CreateAudioUploadRequest) {
  const audio = {
    name: requiredString(name, 'name'),
    contentType: requiredString(contentType, 'contentType'),
    size
  }
  if (!audio.contentType.startsWith('audio/')) {
    throw new HttpError(400, 'INVALID_REQUEST', 'Selecciona un archivo de audio.', 'contentType')
  }
  if (!Number.isInteger(audio.size) || audio.size < 1 || audio.size > MAX_AUDIO_BYTES) {
    throw new HttpError(400, 'INVALID_REQUEST', 'El audio debe ocupar como máximo 20 MB.', 'size')
  }
  return audio
}

export function requiredString(
  value: unknown,
  field: string,
  { minLength = 1, trim = true } = {}
) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, 'INVALID_REQUEST', 'Falta un campo obligatorio.', field)
  }

  const result = trim ? value.trim() : value
  if (result.length < minLength) {
    throw new HttpError(400, 'INVALID_REQUEST', `Debe tener al menos ${minLength} caracteres.`, field)
  }

  return result
}

export function requiredEmail(value: unknown) {
  const email = requiredString(value, 'email')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'EMAIL_INVALID', 'Introduce un correo electrónico válido.', 'email')
  }
  return email
}
