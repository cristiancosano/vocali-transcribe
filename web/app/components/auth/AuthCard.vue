<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <section class="w-full max-w-[26rem] rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
    <p class="mb-2 font-extrabold text-violet-600">Vocali</p>
    <h1 class="m-0 text-3xl font-bold tracking-tight text-slate-900">{{ title }}</h1>
    <slot />
  </section>
</template>
