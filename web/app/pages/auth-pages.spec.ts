import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './login.vue'
import RegisterPage from './register.vue'

const { checkSessionMock, navigateToMock, postMock, toastSuccessMock } = vi.hoisted(() => ({
  checkSessionMock: vi.fn(),
  navigateToMock: vi.fn(),
  postMock: vi.fn(),
  toastSuccessMock: vi.fn()
}))

const options = { global: { stubs: ['NuxtLink'] } }

async function fillRegistration(wrapper: VueWrapper) {
  await wrapper.get('[name="email"]').setValue('user@example.com')
  await wrapper.get('[name="password"]').setValue('secret123')
  await wrapper.get('[name="passwordConfirmation"]').setValue('secret123')
  await flushPromises()
}

describe('páginas de acceso', () => {
  beforeEach(() => {
    checkSessionMock.mockReset()
    navigateToMock.mockReset()
    postMock.mockReset()
    toastSuccessMock.mockReset()
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useApi', () => ({ post: postMock }))
    vi.stubGlobal('useAuth', () => ({ checkSession: checkSessionMock }))
    vi.stubGlobal('useToast', () => ({ success: toastSuccessMock }))
    vi.stubGlobal('navigateTo', navigateToMock)
  })

  it('inicia sesión mediante el BFF', async () => {
    postMock.mockResolvedValue({ user: { id: 'user-id', email: 'user@example.com' } })
    const wrapper = mount(LoginPage, options)

    await wrapper.get('input[name="email"]').setValue(' user@example.com ')
    await wrapper.get('input[name="password"]').setValue('secret123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'secret123'
    })
    expect(checkSessionMock).toHaveBeenCalledOnce()
    expect(navigateToMock).toHaveBeenCalledWith('/')
  })

  it('muestra y oculta la contraseña', async () => {
    const wrapper = mount(LoginPage, options)
    const input = wrapper.get('input[name="password"]')

    await wrapper.get('button[aria-label="Mostrar contraseña"]').trigger('click')
    expect(input.attributes('type')).toBe('text')

    await wrapper.get('button[aria-label="Ocultar contraseña"]').trigger('click')
    expect(input.attributes('type')).toBe('password')
  })

  it('registra y confirma una cuenta', async () => {
    postMock.mockImplementation((path: string) => ({
      '/auth/register': { complete: false, destination: 'u***@example.com' },
      '/auth/register/confirm': { complete: true }
    })[path])
    const wrapper = mount(RegisterPage, options)

    await fillRegistration(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('[name="confirmationCode"]').setValue('123456')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(postMock).toHaveBeenCalledWith('/auth/register', {
      email: 'user@example.com',
      password: 'secret123'
    })
    expect(postMock).toHaveBeenCalledWith('/auth/register/confirm', {
      email: 'user@example.com',
      code: '123456'
    })
    expect(wrapper.text()).toContain('Cuenta confirmada')
  })

  it.each([
    [
      { data: { code: 'PASSWORD_INVALID', message: 'Debe incluir al menos una letra minúscula.', field: 'password' } },
      'input[name="password"]',
      'Debe incluir al menos una letra minúscula.'
    ],
    [
      { data: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } },
      '.error',
      'No se pudo crear la cuenta. Revisa los datos introducidos.'
    ]
  ])('muestra el error de registro en su lugar correspondiente', async (error, selector, message) => {
    postMock.mockRejectedValue(error)
    const wrapper = mount(RegisterPage, options)

    await fillRegistration(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const displayedError = selector === '.error'
      ? wrapper.get(selector).text()
      : wrapper.get(selector).element.parentElement?.nextElementSibling?.textContent
    expect(displayedError).toBe(message)
  })
})
