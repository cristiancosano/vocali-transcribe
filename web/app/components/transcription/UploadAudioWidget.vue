<script setup lang="ts">
import {
  MAX_AUDIO_BYTES,
  type CreateAudioUploadRequest,
  type CreateAudioUploadResponse,
  type PollTranscriptionRequest,
  type StartTranscriptionResponse,
  type TranscriptionResponse
} from '@vocali/contracts'
import { computed, onBeforeUnmount, ref } from 'vue'
import { getApiError } from '../../composables/useApi'
import UiButton from '../ui/UiButton.vue'
import UiWidget from '../ui/UiWidget.vue'

const emit = defineEmits<{ saved: [item: TranscriptionResponse] }>()
const api = useApi()
const audio = ref<File | null>(null)
const errorMessage = ref('')
const uploading = ref(false)
const transcribing = ref(false)
const completed = ref(false)
let pollTimer: ReturnType<typeof setTimeout> | undefined

const progressMessage = computed(() => {
  if (uploading.value) return 'Subiendo el audio…'
  if (transcribing.value) return 'Transcribiendo el audio…'
  return completed.value ? 'Transcripción completada.' : ''
})

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = undefined
}

function pollStatus(id: string, jobId: string, audio: CreateAudioUploadRequest) {
  stopPolling()
  pollTimer = setTimeout(async () => {
    try {
      const result = await api.post<TranscriptionResponse | null>(`/transcriptions/${id}/status`, {
        ...audio,
        jobId
      } satisfies PollTranscriptionRequest)
      if (!result) {
        pollStatus(id, jobId, audio)
        return
      }
      completed.value = true
      transcribing.value = false
      emit('saved', result)
    } catch (error) {
      errorMessage.value = getApiError(error)?.message ?? 'No se pudo consultar el progreso.'
      transcribing.value = false
    }
  }, 3000)
}

function selectAudio(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  audio.value = null
  errorMessage.value = ''
  completed.value = false
  transcribing.value = false
  stopPolling()

  if (!file) return
  if (!file.type.startsWith('audio/')) {
    errorMessage.value = 'Selecciona un archivo de audio.'
    return
  }
  if (file.size < 1 || file.size > MAX_AUDIO_BYTES) {
    errorMessage.value = 'El audio debe ocupar como máximo 20 MB.'
    return
  }

  audio.value = file
}

async function uploadAudio() {
  if (!audio.value) return
  errorMessage.value = ''
  uploading.value = true

  try {
    const metadata = {
      name: audio.value.name,
      contentType: audio.value.type,
      size: audio.value.size
    } satisfies CreateAudioUploadRequest
    const upload = await api.post<CreateAudioUploadResponse>('/transcriptions/upload', metadata)
    const form = new FormData()
    for (const [name, value] of Object.entries(upload.fields)) form.append(name, value)
    form.append('file', audio.value)

    const result = await fetch(upload.url, { method: 'POST', body: form })
    if (!result.ok) throw new Error('S3 upload failed')
    const { jobId } = await api.post<StartTranscriptionResponse>(`/transcriptions/${upload.id}/start`, metadata)
    transcribing.value = true
    pollStatus(upload.id, jobId, metadata)
  } catch (error) {
    errorMessage.value = getApiError(error)?.message ?? 'No se pudo iniciar la transcripción. Inténtalo de nuevo.'
  } finally {
    uploading.value = false
  }
}

onBeforeUnmount(stopPolling)
</script>

<template>
  <UiWidget
    eyebrow="Archivo"
    title="Subir un audio"
    description="Selecciona un archivo de audio de hasta 20 MB."
  >
    <form class="mt-6 flex flex-1 flex-col gap-4" @submit.prevent="uploadAudio">
      <div class="grid gap-1.5">
        <label for="audio" class="font-semibold text-slate-800">Archivo de audio</label>
        <input
          id="audio"
          name="audio"
          type="file"
          accept="audio/*"
          class="w-full min-w-0 rounded-lg border border-slate-300 p-2 text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:font-semibold file:text-violet-800"
          @change="selectAudio"
        >
        <p v-if="errorMessage" class="m-0 text-sm text-red-700">{{ errorMessage }}</p>
        <p v-else-if="audio" class="m-0 text-sm text-slate-600">{{ audio.name }}</p>
      </div>

      <div v-if="progressMessage" class="rounded-lg bg-slate-100 p-4">
        <progress v-if="uploading || transcribing" class="w-full accent-violet-600">Procesando</progress>
        <p class="m-0 text-sm font-medium text-slate-700">{{ progressMessage }}</p>
      </div>

      <UiButton
        class="mt-auto"
        type="submit"
        :disabled="!audio || uploading || transcribing"
        :loading="uploading || transcribing"
      >
        {{ uploading ? 'Subiendo…' : 'Transcribir audio' }}
      </UiButton>
    </form>
  </UiWidget>
</template>
