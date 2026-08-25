import type { ApiErrorResponse } from '@vocali/contracts'

export function useApi() {
  const baseURL = useRuntimeConfig().public.apiBase
  const apiFetch = useRequestFetch()

  return {
    url: (path: string) => `${baseURL.replace(/\/$/, '')}${path}`,
    get: <T>(path: string) => apiFetch<T>(path, { baseURL, credentials: 'include' }),
    post: <T>(path: string, body?: Record<string, unknown> | BodyInit | null) => apiFetch<T>(path, {
      baseURL,
      method: 'POST',
      body,
      credentials: 'include'
    })
  }
}

export function getApiError(error: unknown) {
  if (!error || typeof error !== 'object' || !('data' in error)) return null
  const data = error.data
  if (!data || typeof data !== 'object' || !('code' in data) || !('message' in data)) return null
  return data as ApiErrorResponse
}
