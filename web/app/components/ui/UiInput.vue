<script setup lang="ts">
import type { InputTypeHTMLAttribute } from 'vue'
import { computed, ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  label: string
  error?: string
}>()

const model = defineModel<string>({ required: true })
const attrs = useAttrs()
const passwordVisible = ref(false)
const isPassword = computed(() => attrs.type === 'password')
const inputType = computed<InputTypeHTMLAttribute | undefined>(() =>
  isPassword.value && passwordVisible.value ? 'text' : attrs.type as InputTypeHTMLAttribute | undefined
)
</script>

<template>
  <div class="grid gap-1.5">
    <label :for="props.id" class="font-semibold text-slate-800">{{ props.label }}</label>
    <div class="relative">
      <input
        :id="props.id"
        v-model="model"
        v-bind="$attrs"
        :type="inputType"
        class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-violet-600 focus:ring-3 focus:ring-violet-200"
        :class="[props.error ? 'border-red-700 focus:ring-red-200' : '', isPassword ? 'pr-11' : '']"
      >
      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-3 text-violet-700 hover:text-violet-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        :aria-label="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="passwordVisible = !passwordVisible"
      >
        <svg v-if="passwordVisible" aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path d="m3 3 18 18" />
        </svg>
        <svg v-else aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
    <p v-if="props.error" class="m-0 text-sm text-red-700">{{ props.error }}</p>
  </div>
</template>
