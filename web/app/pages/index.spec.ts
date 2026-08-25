import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const realtime = vi.hoisted(() => ({
  clientListener: undefined as ((event: { data: unknown }) => void) | undefined,
  recorderListener: undefined as ((event: { data: Float32Array }) => void) | undefined,
  start: vi.fn(),
  stop: vi.fn(),
  sendAudio: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  closeAudio: vi.fn()
}))

vi.mock('@speechmatics/real-time-client', () => ({
  RealtimeClient: class {
    start = realtime.start
    stopRecognition = realtime.stop
    sendAudio = realtime.sendAudio
    addEventListener(_: string, listener: typeof realtime.clientListener) {
      realtime.clientListener = listener
    }
  }
}))
vi.mock('@speechmatics/browser-audio-input', () => ({
  PCMRecorder: class {
    startRecording = realtime.startRecording
    stopRecording = realtime.stopRecording
    addEventListener(_: string, listener: typeof realtime.recorderListener) {
      realtime.recorderListener = listener
    }
  }
}))
vi.mock('@speechmatics/browser-audio-input/pcm-audio-worklet.min.js?url', () => ({ default: '/worklet.js' }))

import IndexPage from './index.vue'

const post = vi.fn()
const get = vi.fn()

describe('página de transcripción', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useApi', () => ({
      get,
      post,
      url: (path: string) => `/api${path}`
    }))
    vi.stubGlobal('useToast', () => ({ success: vi.fn(), error: vi.fn() }))
    vi.stubGlobal('AudioContext', class {
      sampleRate = 48000
      close = realtime.closeAudio
    })
    realtime.start.mockResolvedValue({})
    realtime.stop.mockResolvedValue({})
    realtime.startRecording.mockResolvedValue(undefined)
    realtime.closeAudio.mockResolvedValue(undefined)
    get.mockResolvedValue({ items: [] })
  })

  it('rechaza un archivo que no sea de audio antes de llamar a la API', async () => {
    const wrapper = mount(IndexPage)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['text'], 'notes.txt', { type: 'text/plain' })] })

    await input.trigger('change')

    expect(wrapper.text()).toContain('Selecciona un archivo de audio.')
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(submit.classes()).toContain('disabled:cursor-not-allowed')
    expect(post).not.toHaveBeenCalled()
  })

  it('muestra diez filas skeleton mientras carga la biblioteca', async () => {
    let resolveHistory!: (value: { items: [] }) => void
    get.mockReturnValue(new Promise(resolve => resolveHistory = resolve))
    const wrapper = mount(IndexPage)
    const library = wrapper.findAll('section').find(section => section.text().includes('Biblioteca'))!

    expect(library.findAll('li.animate-pulse')).toHaveLength(10)

    resolveHistory({ items: [] })
    await flushPromises()
    expect(library.findAll('li.animate-pulse')).toHaveLength(0)
  })

  it('cambia el panel móvil sin desmontar los widgets', async () => {
    const wrapper = mount(IndexPage)
    const sections = wrapper.findAll('section')
    const realtime = sections.find(section => section.text().includes('En directo'))!
    const library = sections.find(section => section.text().includes('Biblioteca'))!

    expect(library.element.parentElement?.classList).not.toContain('hidden')
    expect(realtime.element.parentElement?.classList).toContain('hidden')

    await wrapper.findAll('nav button').find(button => button.text().includes('En directo'))!.trigger('click')

    expect(library.element.parentElement?.classList).toContain('hidden')
    expect(realtime.element.parentElement?.classList).not.toContain('hidden')
    expect(wrapper.findAll('section')).toHaveLength(3)
  })

  it('enlaza el estado vacío con las acciones móviles', async () => {
    const wrapper = mount(IndexPage)
    await flushPromises()
    const sections = wrapper.findAll('section')
    const library = sections.find(section => section.text().includes('Biblioteca'))!
    const upload = sections.find(section => section.text().includes('Archivo'))!
    const realtime = sections.find(section => section.text().includes('En directo'))!

    expect(library.text()).toContain('No hay transcripciones')
    await library.findAll('button').find(button => button.text().includes('Sube un archivo'))!.trigger('click')
    expect(upload.element.parentElement?.classList).not.toContain('hidden')

    await wrapper.findAll('nav button').find(button => button.text().includes('Biblioteca'))!.trigger('click')
    await library.findAll('button').find(button => button.text().includes('graba una transcripción'))!.trigger('click')
    expect(realtime.element.parentElement?.classList).not.toContain('hidden')
  })

  it('muestra el progreso local y solo añade la transcripción al completarse', async () => {
    vi.useFakeTimers()
    post.mockImplementation((path: string) => {
      if (path === '/transcriptions/upload') return { id: 'id-1', url: 'https://s3.example', fields: {} }
      if (path.endsWith('/start')) return { jobId: 'job-id' }
      return { id: 'id-1', name: 'audio.mp3', text: 'Hola mundo.', createdAt: 'now' }
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const wrapper = mount(IndexPage)
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' })] })

    await input.trigger('change')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Transcribiendo el audio')
    expect(wrapper.get('button[type="submit"]').classes()).toContain('disabled:cursor-wait')

    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(wrapper.text()).toContain('Transcripción completada')
    expect(wrapper.text()).toContain('audio.mp3')
    expect(post).toHaveBeenCalledWith('/transcriptions/id-1/status', {
      name: 'audio.mp3',
      contentType: 'audio/mpeg',
      size: 5,
      jobId: 'job-id'
    })
    vi.useRealTimers()
  })

  it('abre el audio y el texto de una transcripción en un diálogo', async () => {
    const completed = {
      id: 'id-1',
      name: 'reunión.m4a',
      createdAt: '2026-08-26T10:00:00.000Z'
    }
    get.mockImplementation((path: string) => path === '/transcriptions'
      ? { items: [completed] }
      : { ...completed, text: 'Contenido de la reunión.' })

    const wrapper = mount(IndexPage)
    await flushPromises()
    const library = wrapper.findAll('section').find(section => section.text().includes('Biblioteca'))!
    expect(wrapper.text()).toContain('reunión.m4a')
    expect(wrapper.get('a[href="/api/transcriptions/id-1/audio?download=1"]').text()).toContain('Descargar audio')
    expect(wrapper.get('a[href="/api/transcriptions/id-1/transcript"]').text()).toContain('Descargar TXT')

    await library.get('button').trigger('click')
    await flushPromises()
    expect((wrapper.get('dialog').element as HTMLDialogElement).open).toBe(true)
    expect(wrapper.get('audio').attributes('src')).toBe('/api/transcriptions/id-1/audio')
    expect(wrapper.text()).toContain('Contenido de la reunión.')

    await wrapper.get('dialog').trigger('click')
    expect((wrapper.get('dialog').element as HTMLDialogElement).open).toBe(false)

    await library.get('button').trigger('click')
    await flushPromises()
    await wrapper.get('dialog button').trigger('click')
    expect((wrapper.get('dialog').element as HTMLDialogElement).open).toBe(false)
  })

  it('pagina la biblioteca de diez en diez', async () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `id-${index + 1}`,
      name: `audio-${index + 1}.mp3`,
      createdAt: new Date(2026, 7, 26, 12, 0, -index).toISOString()
    }))
    get.mockImplementation((path: string) => path === '/transcriptions'
      ? { items: items.slice(0, 10), nextCursor: 'cursor-1' }
      : { items: items.slice(10) })

    const wrapper = mount(IndexPage)
    await flushPromises()
    const library = wrapper.findAll('section').find(section => section.text().includes('Biblioteca'))!

    expect(library.findAll('ul > li')).toHaveLength(10)
    expect(library.text()).toContain('Página 1')
    expect(library.text()).not.toContain('audio-11.mp3')

    await library.findAll('button').find(button => button.text() === 'Siguiente')!.trigger('click')
    await flushPromises()

    expect(library.findAll('ul > li')).toHaveLength(2)
    expect(library.text()).toContain('Página 2')
    expect(library.text()).toContain('audio-11.mp3')
    expect(get).toHaveBeenCalledWith('/transcriptions?cursor=cursor-1')

    await library.findAll('button').find(button => button.text() === 'Anterior')!.trigger('click')
    await flushPromises()
    expect(library.findAll('ul > li')).toHaveLength(10)
    expect(get).toHaveBeenLastCalledWith('/transcriptions')
  })

  it('graba, muestra parciales y guarda el texto final en la biblioteca', async () => {
    post.mockImplementation((path: string) => {
      if (path.endsWith('/realtime-token')) return {
          token: 'temporary-jwt',
          url: 'wss://eu.rt.speechmatics.com/v2',
          language: 'es'
        }
      if (path === '/transcriptions/upload') return {
        id: 'live-id',
        url: 'https://s3.example',
        fields: {}
      }
      return {
          id: 'live-id',
          name: 'Grabación en directo.wav',
          text: 'Hola en directo.',
          createdAt: '2026-08-26T10:00:00.000Z'
        }
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const wrapper = mount(IndexPage)
    await flushPromises()
    const realtimeSection = wrapper.findAll('section').find(section => section.text().includes('En directo'))!

    await realtimeSection.get('button').trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('/transcriptions/realtime-token')
    expect(realtime.start).toHaveBeenCalledWith('temporary-jwt', expect.objectContaining({
      transcription_config: expect.objectContaining({ language: 'es', enable_partials: true })
    }))
    realtime.recorderListener?.({ data: new Float32Array([0, 0.5, -0.5]) })

    realtime.clientListener?.({
      data: { message: 'AddPartialTranscript', metadata: { transcript: 'Hola en directo' } }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Hola en directo')

    realtime.clientListener?.({
      data: { message: 'AddTranscript', metadata: { transcript: 'Hola en directo.' } }
    })

    await realtimeSection.get('button').trigger('click')
    await flushPromises()
    expect(realtime.stop).toHaveBeenCalled()
    expect(post).toHaveBeenCalledWith('/transcriptions/upload', expect.objectContaining({
      name: 'Grabación en directo.wav',
      contentType: 'audio/wav'
    }))
    expect(post).toHaveBeenCalledWith('/transcriptions/live-id/realtime', {
      text: 'Hola en directo.',
      name: 'Grabación en directo.wav',
      contentType: 'audio/wav',
      size: 50
    })
    expect(wrapper.text()).toContain('Grabación en directo.wav')
  })

})
