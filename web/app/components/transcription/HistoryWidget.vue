<script setup lang="ts">
import type { ListTranscriptionsResponse, TranscriptionResponse } from '@vocali/contracts'
import { onMounted, ref } from 'vue'
import TranscriptionDialog from './TranscriptionDialog.vue'
import UiWidget from '../ui/UiWidget.vue'

const emit = defineEmits<{ navigate: [view: 'upload' | 'realtime'] }>()
const api = useApi()
const toast = useToast()
const history = ref<TranscriptionResponse[]>([])
const loading = ref(true)
const currentPage = ref(1)
const nextCursor = ref<string>()
const pageCursors = ref<(string | undefined)[]>([undefined])
const transcriptionDialog = ref<InstanceType<typeof TranscriptionDialog> | null>(null)

async function load(page = 1) {
  loading.value = true
  try {
    const cursor = pageCursors.value[page - 1]
    const result = await api.get<ListTranscriptionsResponse>(
      `/transcriptions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`
    )
    history.value = result.items
    currentPage.value = page
    nextCursor.value = result.nextCursor
    pageCursors.value = [
      ...pageCursors.value.slice(0, page),
      ...(result.nextCursor ? [result.nextCursor] : [])
    ]
  } catch {
    toast.error({ message: 'No se pudo cargar el historial de transcripciones.' })
  } finally {
    loading.value = false
  }
}

async function add(item: TranscriptionResponse) {
  await load()
  history.value = [item, ...history.value.filter(entry => entry.id !== item.id)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
}

function open(item: TranscriptionResponse) {
  void transcriptionDialog.value?.open(item)
}

onMounted(() => void load())
defineExpose({ add })
</script>

<template>
  <UiWidget eyebrow="Biblioteca" title="Transcripciones">
    <ul v-if="loading" class="mt-4 divide-y divide-slate-200">
      <li v-for="item in 10" :key="item" class="flex animate-pulse flex-col gap-3 py-4 sm:flex-row sm:items-center">
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-5 w-2/5 rounded bg-slate-200" />
          <div class="h-4 w-1/4 rounded bg-slate-200" />
        </div>
        <div class="flex gap-2">
          <div class="h-8 w-32 rounded-lg bg-slate-200" />
          <div class="h-8 w-28 rounded-lg bg-slate-200" />
        </div>
      </li>
    </ul>
    <div v-else-if="history.length === 0" class="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <svg aria-hidden="true" class="size-20 text-violet-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        <path d="M9 7h7M9 11h5" />
      </svg>
      <h3 class="mt-4 text-lg font-bold text-slate-800">No hay transcripciones</h3>
      <p class="mt-2 max-w-lg text-slate-600">
        <span class="hidden lg:inline">Sube un archivo o graba una transcripción en directo y aparecerá en tu biblioteca.</span>
        <span class="lg:hidden">
          <button type="button" class="cursor-pointer font-semibold text-violet-700 underline hover:text-violet-900" @click="emit('navigate', 'upload')">Sube un archivo</button>
          o
          <button type="button" class="cursor-pointer font-semibold text-violet-700 underline hover:text-violet-900" @click="emit('navigate', 'realtime')">graba una transcripción en directo</button>
          y aparecerá en tu biblioteca.
        </span>
      </p>
    </div>
    <ul v-else class="mt-4 divide-y divide-slate-200">
      <li v-for="item in history" :key="item.id" class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
        <button
          type="button"
          class="min-w-0 flex-1 cursor-pointer text-left hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-600"
          @click="open(item)"
        >
          <span>
            <span class="block font-semibold">{{ item.name }}</span>
            <time class="text-sm text-slate-500" :datetime="item.createdAt">{{ new Date(item.createdAt).toLocaleString('es-ES') }}</time>
          </span>
        </button>
        <div class="flex flex-wrap items-center gap-2">
          <a
            :href="api.url(`/transcriptions/${item.id}/audio?download=1`)"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700"
          >
            <svg aria-hidden="true" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 5 6 9H2v6h4l5 4Z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            </svg>
            Descargar audio
          </a>
          <a
            :href="api.url(`/transcriptions/${item.id}/transcript`)"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700"
          >
            <svg aria-hidden="true" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6M8 13h8M8 17h6" />
            </svg>
            Descargar TXT
          </a>
        </div>
      </li>
    </ul>

    <nav v-if="!loading && (currentPage > 1 || nextCursor)" class="mt-4 flex items-center justify-center gap-4">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="currentPage === 1"
        @click="load(currentPage - 1)"
      >Anterior</button>
      <span class="text-sm text-slate-600">Página {{ currentPage }}</span>
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!nextCursor"
        @click="load(currentPage + 1)"
      >Siguiente</button>
    </nav>

    <TranscriptionDialog ref="transcriptionDialog" />
  </UiWidget>
</template>
