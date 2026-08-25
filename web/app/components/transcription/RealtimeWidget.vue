<script setup lang="ts">
import {
  MAX_AUDIO_BYTES,
  type CompleteRealtimeTranscriptionRequest,
  type CreateAudioUploadResponse,
  type RealtimeTokenResponse,
  type TranscriptionResponse
} from '@vocali/contracts'
import { PCMRecorder, type InputAudioEvent } from '@speechmatics/browser-audio-input'
import PCMAudioWorkletUrl from '@speechmatics/browser-audio-input/pcm-audio-worklet.min.js?url'
import { RealtimeClient } from '@speechmatics/real-time-client'
import { onBeforeUnmount, ref } from 'vue'
import { getApiError } from '../../composables/useApi'
import { createWavBlob } from '../../utils/wav'
import UiButton from '../ui/UiButton.vue'
import UiWidget from '../ui/UiWidget.vue'

const emit = defineEmits<{ saved: [item: TranscriptionResponse] }>()
const api = useApi()
const toast = useToast()
const state = ref<'idle' | 'connecting' | 'recording' | 'stopping'>('idle')
const finalText = ref('')
const partialText = ref('')
const errorMessage = ref('')
const needsSaving = ref(false)
let client: RealtimeClient | undefined
let recorder: PCMRecorder | undefined
let audioContext: AudioContext | undefined
let audioChunks: Float32Array[] = []
let sampleCount = 0
let sampleRate = 48000
let uploadId: string | undefined
let reachedLimit = false

async function start() {
  errorMessage.value = ''
  finalText.value = ''
  partialText.value = ''
  needsSaving.value = false
  audioChunks = []
  sampleCount = 0
  uploadId = undefined
  reachedLimit = false
  state.value = 'connecting'

  try {
    const access = await api.post<RealtimeTokenResponse>('/transcriptions/realtime-token')
    const nextAudioContext = new AudioContext()
    const nextClient = new RealtimeClient({ url: access.url, appId: 'vocali-web' })
    const nextRecorder = new PCMRecorder(PCMAudioWorkletUrl)
    audioContext = nextAudioContext
    sampleRate = nextAudioContext.sampleRate
    client = nextClient
    recorder = nextRecorder

    nextClient.addEventListener('receiveMessage', ({ data }) => {
      if (data.message === 'AddTranscript') {
        const text = data.metadata.transcript.trim()
        if (text) finalText.value = `${finalText.value} ${text}`.trim()
        if (text) needsSaving.value = true
        partialText.value = ''
      } else if (data.message === 'AddPartialTranscript') {
        partialText.value = data.metadata.transcript
      } else if (data.message === 'Error') {
        errorMessage.value = 'Speechmatics interrumpió la transcripción.'
        void stop()
      }
    })
    nextRecorder.addEventListener('audio', (event: InputAudioEvent) => {
      if (44 + (sampleCount + event.data.length) * 2 > MAX_AUDIO_BYTES) {
        reachedLimit = true
        void stop()
        return
      }
      audioChunks.push(event.data.slice())
      sampleCount += event.data.length
      nextClient.sendAudio(event.data as unknown as BufferSource)
    })

    await nextClient.start(access.token, {
      audio_format: {
        type: 'raw',
        encoding: 'pcm_f32le',
        sample_rate: nextAudioContext.sampleRate
      },
      transcription_config: {
        language: access.language,
        enable_partials: true,
        max_delay: 1
      }
    })
    await nextRecorder.startRecording({ audioContext: nextAudioContext })
    state.value = 'recording'
  } catch (error) {
    recorder?.stopRecording()
    void client?.stopRecognition({ noTimeout: true })
    void audioContext?.close()
    client = undefined
    recorder = undefined
    audioContext = undefined
    state.value = 'idle'
    errorMessage.value = getApiError(error)?.message
      ?? (error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Permite el acceso al micrófono para comenzar.'
        : 'No se pudo iniciar la transcripción en tiempo real.')
  }
}

async function stop() {
  if (state.value !== 'recording') return
  state.value = 'stopping'
  recorder?.stopRecording()
  try {
    await client?.stopRecognition()
  } catch {
    errorMessage.value = 'No se pudo cerrar correctamente la transcripción.'
  } finally {
    await audioContext?.close().catch(() => undefined)
    client = undefined
    recorder = undefined
    audioContext = undefined
    partialText.value = ''
    await save()
    state.value = 'idle'
  }
}

async function save() {
  const text = finalText.value.trim()
  if (!text) return

  try {
    const audio = createWavBlob(audioChunks, sampleRate)
    if (audio.size > MAX_AUDIO_BYTES) throw new Error('Realtime audio is too large')
    if (!uploadId) {
      const upload = await api.post<CreateAudioUploadResponse>('/transcriptions/upload', {
        name: 'Grabación en directo.wav',
        contentType: audio.type,
        size: audio.size
      })
      const form = new FormData()
      for (const [name, value] of Object.entries(upload.fields)) form.append(name, value)
      form.append('file', audio, 'grabacion-en-directo.wav')
      const result = await fetch(upload.url, { method: 'POST', body: form })
      if (!result.ok) throw new Error('S3 upload failed')
      uploadId = upload.id
    }

    const saved = await api.post<TranscriptionResponse>(`/transcriptions/${uploadId}/realtime`, {
      text,
      name: 'Grabación en directo.wav',
      contentType: audio.type,
      size: audio.size
    } satisfies CompleteRealtimeTranscriptionRequest)
    needsSaving.value = false
    audioChunks = []
    sampleCount = 0
    uploadId = undefined
    errorMessage.value = reachedLimit ? 'La grabación se detuvo al alcanzar el límite de 20 MB.' : ''
    emit('saved', saved)
    toast.success({ message: 'La transcripción en directo se ha guardado en la biblioteca.' })
  } catch (error) {
    needsSaving.value = true
    errorMessage.value = getApiError(error)?.message ?? 'No se pudo guardar la transcripción en la biblioteca.'
  }
}

async function retrySave() {
  state.value = 'stopping'
  await save()
  state.value = 'idle'
}

onBeforeUnmount(() => {
  recorder?.stopRecording()
  void client?.stopRecognition({ noTimeout: true })
  void audioContext?.close()
})
</script>

<template>
  <UiWidget
    eyebrow="En directo"
    title="Transcripción en tiempo real"
    description="Habla al micrófono y verás el texto mientras grabas."
  >
    <template #header-end>
      <span
        class="mt-1 size-3 shrink-0 rounded-full"
        :class="state === 'recording' ? 'animate-pulse bg-red-500' : 'bg-slate-300'"
      />
    </template>

    <div class="mt-6 min-h-44 rounded-xl bg-slate-50 p-4">
      <p v-if="!finalText && !partialText" class="text-sm text-slate-500">
        {{ state === 'connecting' ? 'Conectando con Speechmatics…' : 'La transcripción aparecerá aquí.' }}
      </p>
      <p v-else class="whitespace-pre-wrap leading-7 text-slate-800">
        {{ finalText }} <span class="text-slate-400">{{ partialText }}</span>
      </p>
    </div>

    <p v-if="errorMessage" class="mt-3 text-sm text-red-700">{{ errorMessage }}</p>
    <div class="mt-auto flex items-center justify-between gap-4 pt-4">
      <span class="text-sm font-medium text-slate-500">
        {{ state === 'recording' ? 'Grabando…' : state === 'stopping' ? 'Finalizando…' : 'Micrófono detenido' }}
      </span>
      <UiButton v-if="state === 'idle'" @click="needsSaving ? retrySave() : start()">
        {{ needsSaving ? 'Guardar en biblioteca' : finalText ? 'Nueva grabación' : 'Iniciar grabación' }}
      </UiButton>
      <UiButton v-else :disabled="state !== 'recording'" :loading="state !== 'recording'" @click="stop">Detener</UiButton>
    </div>
  </UiWidget>
</template>
