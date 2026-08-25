<script setup lang="ts">
const view = defineModel<'library' | 'upload' | 'realtime'>({ required: true })

const itemClasses = (item: typeof view.value) => [
  'flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 px-2 text-xs font-semibold transition focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-600',
  view.value === item ? 'text-violet-700' : 'text-slate-500 hover:text-slate-800'
]
</script>

<template>
  <nav
    aria-label="Navegación principal"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
  >
    <div class="mx-auto grid max-w-md grid-cols-3">
      <button type="button" :class="itemClasses('library')" :aria-current="view === 'library' ? 'page' : undefined" @click="view = 'library'">
        <svg aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
        Biblioteca
      </button>
      <button type="button" :class="itemClasses('upload')" :aria-current="view === 'upload' ? 'page' : undefined" @click="view = 'upload'">
        <svg aria-hidden="true" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
        Subir audio
      </button>
      <button type="button" :class="itemClasses('realtime')" :aria-current="view === 'realtime' ? 'page' : undefined" @click="view = 'realtime'">
        <span aria-hidden="true" class="size-4 rounded-full bg-red-500 ring-2 ring-red-100" />
        En directo
      </button>
    </div>
  </nav>
</template>
