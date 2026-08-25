import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import ProfileMenu from './ProfileMenu.vue'

describe('menú de perfil', () => {
  beforeEach(() => {
    vi.stubGlobal('useAuth', () => ({ user: ref({ email: 'user@example.com' }), logout: vi.fn() }))
    vi.stubGlobal('useToast', () => ({ success: vi.fn(), error: vi.fn() }))
    vi.stubGlobal('navigateTo', vi.fn())
  })

  it('se cierra al clicar fuera', () => {
    const wrapper = mount(ProfileMenu)
    const menu = wrapper.get('details').element as HTMLDetailsElement
    menu.open = true

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    expect(menu.open).toBe(false)
    wrapper.unmount()
  })
})
