<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const { user, logout } = useAuth()
const toast = useToast()
const menu = ref<HTMLDetailsElement | null>(null)

function closeOnOutsideClick(event: Event) {
  if (menu.value && !menu.value.contains(event.target as Node)) menu.value.open = false
}

async function onLogout() {
  try {
    await logout()
    toast.success({ message: 'Has cerrado sesión correctamente.' })
    await navigateTo('/login')
  } catch {
    toast.error({ message: 'No se pudo cerrar la sesión.' })
  }
}

onMounted(() => document.addEventListener('pointerdown', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsideClick))
</script>

<template>
  <details ref="menu" class="group relative">
    <summary
      class="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-300 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 [&::-webkit-details-marker]:hidden"
    >
      <svg viewBox="0 0 24 24" fill="none" class="size-6" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0 17.9 17.9 0 0 1-15 0Z" />
      </svg>
    </summary>
    <div class="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
      <p class="truncate px-3 py-2 text-sm text-slate-500">{{ user?.email }}</p>
      <button
        type="button"
        class="w-full cursor-pointer rounded-lg px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600"
        @click="onLogout"
      >
        Cerrar sesión
      </button>
    </div>
  </details>
</template>
