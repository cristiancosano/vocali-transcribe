const guestOnlyRoutes = new Set(['/login', '/register'])

export default defineNuxtRouteMiddleware(async (to) => {
  const { authenticated, checked, checkSession } = useAuth()
  if (!checked.value) await checkSession()

  if (guestOnlyRoutes.has(to.path)) {
    if (authenticated.value) return navigateTo('/')
    return
  }

  if (!authenticated.value) return navigateTo('/login')
})
