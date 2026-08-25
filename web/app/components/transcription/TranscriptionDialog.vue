<script setup lang="ts">
import type { TranscriptionResponse } from '@vocali/contracts'
import { onBeforeUnmount, ref } from 'vue'
import { getApiError } from '../../composables/useApi'
import UiDialog from '../ui/UiDialog.vue'

const api = useApi()
const toast = useToast()
const dialog = ref<InstanceType<typeof UiDialog> | null>(null)
const audio = ref<HTMLAudioElement | null>(null)
const transcription = ref<TranscriptionResponse | null>(null)
const loading = ref(false)

async function open(item: TranscriptionResponse) {
  transcription.value = item
  loading.value = true
  dialog.value?.open()

  try {
    transcription.value = await api.get<TranscriptionResponse>(`/transcriptions/${item.id}`)
  } catch (error) {
    toast.error({ message: getApiError(error)?.message ?? 'No se pudo cargar la transcripción.' })
  } finally {
    loading.value = false
  }
}

function pauseAudio() {
  audio.value?.pause()
}

onBeforeUnmount(pauseAudio)
defineExpose({ open })
</script>

<template>
  <UiDialog
    ref="dialog"
    :title="transcription?.name ?? ''"
    eyebrow="Transcripción"
    @close="pauseAudio"
  >
    <template v-if="transcription">
      <section>
        <h3 class="font-bold">Audio</h3>
        <audio
          ref="audio"
          class="mt-3 w-full"
          controls
          preload="metadata"
          :src="api.url(`/transcriptions/${transcription.id}/audio`)"
        >
          Tu navegador no permite reproducir este audio.
        </audio>
      </section>

      <section class="mt-6 border-t border-slate-200 pt-6">
        <h3 class="font-bold">Texto</h3>
        <p class="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
          {{ loading
            ? 'Cargando transcripción…'
            : transcription.text === undefined
              ? 'No se pudo cargar la transcripción.'
              : transcription.text || 'El audio no contiene texto reconocible.' }}
        </p>
      </section>
    </template>
  </UiDialog>
</template>
