<script setup lang="ts">
import type { AuthActionResponse } from '@vocali/contracts'
import { reactive, ref } from 'vue'
import AuthCard from '../components/auth/AuthCard.vue'
import UiButton from '../components/ui/UiButton.vue'
import UiInput from '../components/ui/UiInput.vue'
import { getApiError } from '../composables/useApi'

definePageMeta({ layout: 'auth' })

type RegistrationField = 'email' | 'password' | 'passwordConfirmation'

const api = useApi()
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const confirmationCode = ref('')
const confirmationPending = ref(false)
const completed = ref(false)
const errorMessage = ref('')
const submitting = ref(false)
const confirmationCodeError = ref('')
const codeDestination = ref('')
const fieldErrors = reactive<Record<RegistrationField, string>>({
  email: '',
  password: '',
  passwordConfirmation: ''
})

function clearRegistrationErrors() {
  errorMessage.value = ''
  Object.keys(fieldErrors).forEach(key => fieldErrors[key as RegistrationField] = '')
}

function applySignUpError(error: unknown) {
  const apiError = getApiError(error)
  if (apiError?.field === 'email') fieldErrors.email = apiError.message
  else if (apiError?.field === 'password') fieldErrors.password = apiError.message
  else return false
  return true
}

async function register() {
  clearRegistrationErrors()

  if (password.value !== passwordConfirmation.value) {
    fieldErrors.passwordConfirmation = 'Las contraseñas no coinciden.'
  }

  if (fieldErrors.passwordConfirmation) return

  submitting.value = true

  try {
    email.value = email.value.trim()
    const result = await api.post<AuthActionResponse>('/auth/register', {
      email: email.value,
      password: password.value
    })
    completed.value = result.complete
    confirmationPending.value = !result.complete
    codeDestination.value = result.destination ?? email.value
  } catch (error) {
    if (!applySignUpError(error)) {
      errorMessage.value = 'No se pudo crear la cuenta. Revisa los datos introducidos.'
    }
  } finally {
    submitting.value = false
  }
}

async function confirm() {
  errorMessage.value = ''
  confirmationCodeError.value = ''
  submitting.value = true

  try {
    const result = await api.post<AuthActionResponse>('/auth/register/confirm', {
      email: email.value,
      code: confirmationCode.value.trim()
    })
    completed.value = result.complete

    if (!result.complete) {
      errorMessage.value = 'El registro requiere un paso adicional.'
    }
  } catch (error) {
    const apiError = getApiError(error)
    if (apiError?.field === 'code') confirmationCodeError.value = apiError.message
    else errorMessage.value = 'No se pudo confirmar la cuenta. Revisa el código.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard title="Crear cuenta">
    <div v-if="completed" class="space-y-3 text-center">
      <p class="mt-6">Cuenta confirmada. Ya puedes iniciar sesión.</p>
      <NuxtLink class="font-medium text-violet-700 hover:text-violet-900" to="/login">Ir al inicio de sesión</NuxtLink>
    </div>

    <form v-else-if="confirmationPending" class="mt-6 grid gap-3" @submit.prevent="confirm">
      <p class="mb-3 text-slate-600">Introduce el código que hemos enviado a {{ codeDestination || email }}.</p>
      <UiInput
        id="confirmation-code"
        v-model="confirmationCode"
        label="Código de confirmación"
        name="confirmationCode"
        inputmode="numeric"
        autocomplete="one-time-code"
        :error="confirmationCodeError"
        required
      />
      <p v-if="errorMessage" class="error m-0 text-sm text-red-700">{{ errorMessage }}</p>
      <UiButton class="mt-2 w-full" type="submit" :disabled="submitting" :loading="submitting">Confirmar cuenta</UiButton>
    </form>

    <form v-else class="mt-6 grid gap-3" @submit.prevent="register">
      <p class="mb-3 text-slate-600">Regístrate para empezar a transcribir.</p>
      <UiInput
        id="email"
        v-model="email"
        label="Correo electrónico"
        name="email"
        type="email"
        autocomplete="email"
        :error="fieldErrors.email"
        required
        @input="fieldErrors.email = ''"
      />
      <UiInput
        id="password"
        v-model="password"
        label="Contraseña"
        name="password"
        type="password"
        autocomplete="new-password"
        minlength="8"
        :error="fieldErrors.password"
        required
        @input="fieldErrors.password = ''"
      />
      <UiInput
        id="password-confirmation"
        v-model="passwordConfirmation"
        label="Repite la contraseña"
        name="passwordConfirmation"
        type="password"
        autocomplete="new-password"
        minlength="8"
        :error="fieldErrors.passwordConfirmation"
        required
        @input="fieldErrors.passwordConfirmation = ''"
      />

      <p v-if="errorMessage" class="error m-0 text-sm text-red-700">{{ errorMessage }}</p>
      <UiButton class="mt-2 w-full" type="submit" :disabled="submitting" :loading="submitting">{{ submitting ? 'Creando…' : 'Crear cuenta' }}</UiButton>
    </form>

    <p v-if="!completed" class="mt-5 text-sm">
      <NuxtLink class="font-medium text-violet-700 hover:text-violet-900" to="/login">Ya tengo una cuenta</NuxtLink>
    </p>
  </AuthCard>
</template>
