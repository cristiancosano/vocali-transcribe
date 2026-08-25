<script setup lang="ts">
import type { TranscriptionResponse } from '@vocali/contracts'
import { ref } from 'vue'
import BottomNavigationBar from '../components/navigation/BottomNavigationBar.vue'
import HistoryWidget from '../components/transcription/HistoryWidget.vue'
import RealtimeWidget from '../components/transcription/RealtimeWidget.vue'
import UploadAudioWidget from '../components/transcription/UploadAudioWidget.vue'

definePageMeta({
  layout: {
    name: 'app',
    props: { title: 'Dashboard' }
  }
})

const historyWidget = ref<InstanceType<typeof HistoryWidget> | null>(null)
const mobileView = ref<'library' | 'upload' | 'realtime'>('library')

function addToHistory(item: TranscriptionResponse) {
  void historyWidget.value?.add(item)
}

</script>

<template>
  <div class="grid gap-5 pb-20 lg:grid-cols-4 lg:pb-0">
    <div :class="mobileView === 'realtime' ? 'block' : 'hidden'" class="lg:col-span-2 lg:block">
      <RealtimeWidget @saved="addToHistory" />
    </div>
    <div :class="mobileView === 'upload' ? 'block' : 'hidden'" class="lg:col-span-2 lg:block">
      <UploadAudioWidget @saved="addToHistory" />
    </div>
    <div :class="mobileView === 'library' ? 'block' : 'hidden'" class="lg:col-span-4 lg:block">
      <HistoryWidget ref="historyWidget" @navigate="mobileView = $event" />
    </div>
  </div>
  <BottomNavigationBar v-model="mobileView" />
</template>
