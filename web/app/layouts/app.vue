<script setup lang="ts">
import ProfileMenu from '../components/profile/ProfileMenu.vue'

defineProps<{
  title: string
}>()
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <main class="grid min-h-screen place-items-center p-6">
      <div class="w-full max-w-7xl self-start space-y-6">
        <header class="flex items-center justify-between gap-4">
          <div>
            <p class="font-extrabold text-violet-600">Vocali</p>
            <h1 class="text-3xl font-bold text-slate-900">{{ title }}</h1>
          </div>
          <ProfileMenu />
        </header>

        <slot />
      </div>
    </main>
  </div>
</template>
