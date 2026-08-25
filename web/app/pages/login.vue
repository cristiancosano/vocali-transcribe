<script setup lang="ts">
import type { AuthSessionResponse } from '@vocali/contracts'
import { ref } from 'vue'
import AuthCard from '../components/auth/AuthCard.vue'
import UiButton from '../components/ui/UiButton.vue'
import UiInput from '../components/ui/UiInput.vue'
import { getApiError } from '../composables/useApi'

definePageMeta({ layout: 'auth' })

const { checkSession } = useAuth()
const api = useApi()
const toast = useToast()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

async function submit() {
  errorMessage.value = ''
  submitting.value = true

  try {
    await api.post<AuthSessionResponse>('/auth/login', {
      email: email.value.trim(),
      password: password.value
    })
    await checkSession()
    toast.success({ message: 'Has iniciado sesión correctamente.' })
    await navigateTo('/')
  } catch (error) {
    errorMessage.value = getApiError(error)?.message ?? 'No se pudo iniciar sesión. Inténtalo de nuevo.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard title="Iniciar sesión">
    <form class="grid gap-3" @submit.prevent="submit">
      <UiInput v-model="email" id="email" label="Correo electrónico" name="email" type="email" autocomplete="email" required />
      <UiInput v-model="password" id="password" label="Contraseña" name="password" type="password" autocomplete="current-password" required />

      <p v-if="errorMessage" class="m-0 text-sm text-red-700">{{ errorMessage }}</p>

      <UiButton class="mt-2 w-full" type="submit" :disabled="submitting" :loading="submitting">
        {{ submitting ? 'Entrando…' : 'Entrar' }}
      </UiButton>
    </form>

    <p class="mt-5 text-sm">
      <NuxtLink class="font-medium text-violet-700 hover:text-violet-900" to="/register">Crear cuenta</NuxtLink>
    </p>
  </AuthCard>
</template>
