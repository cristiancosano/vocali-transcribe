import type { AuthSessionResponse, AuthUser } from '@vocali/contracts'
import { computed } from 'vue'

export function useAuth() {
  const api = useApi()
  const user = useState<AuthUser | null>('auth:user', () => null)
  const checked = useState('auth:checked', () => false)
  const authenticated = computed(() => user.value !== null)

  async function checkSession() {
    try {
      user.value = (await api.get<AuthSessionResponse>('/auth/session')).user
    } catch {
      user.value = null
    } finally {
      checked.value = true
    }

    return authenticated.value
  }

  async function logout() {
    await api.post('/auth/logout')
    user.value = null
    checked.value = true
  }

  return { user, checked, authenticated, checkSession, logout }
}
