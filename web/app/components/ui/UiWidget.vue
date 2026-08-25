<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description?: string
}>()
</script>

<template>
  <section class="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm font-bold uppercase tracking-wider text-violet-600">{{ eyebrow }}</p>
        <h2 class="mt-1 text-2xl font-bold text-slate-900">{{ title }}</h2>
        <p v-if="description" class="mt-2 text-sm text-slate-600">{{ description }}</p>
      </div>
      <slot name="header-end" />
    </header>

    <div class="flex flex-1 flex-col">
      <slot />
    </div>
  </section>
</template>
