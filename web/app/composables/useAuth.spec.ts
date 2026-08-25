import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    const states = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, initialValue: () => unknown) => {
      if (!states.has(key)) states.set(key, ref(initialValue()))
      return states.get(key)
    })
    vi.stubGlobal('useApi', () => mocks)
  })

  it('restaura y cierra la sesión', async () => {
    mocks.get.mockResolvedValue({ user: { id: 'user-id', email: 'user@example.com' } })
    const auth = useAuth()

    expect(await auth.checkSession()).toBe(true)
    expect(auth.authenticated.value).toBe(true)

    await auth.logout()
    expect(mocks.post).toHaveBeenCalledWith('/auth/logout')
    expect(auth.authenticated.value).toBe(false)
  })
})
