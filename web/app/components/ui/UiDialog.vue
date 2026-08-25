<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{
  title: string
  eyebrow?: string
}>(), {
  eyebrow: ''
})

const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

function open() {
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

defineExpose({ open, close })
</script>

<template>
  <dialog
    ref="dialog"
    class="fixed inset-0 m-auto w-[min(44rem,calc(100%-2rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    @click.self="close"
    @close="emit('close')"
  >
    <div class="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
      <header class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p v-if="eyebrow" class="text-sm font-bold uppercase tracking-wider text-violet-600">{{ eyebrow }}</p>
          <h2 class="mt-1 truncate text-2xl font-bold">{{ title }}</h2>
        </div>
        <button
          type="button"
          class="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600"
          @click="close"
        >
          ×
        </button>
      </header>

      <div class="mt-6">
        <slot />
      </div>
    </div>
  </dialog>
</template>
