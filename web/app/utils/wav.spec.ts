import { describe, expect, it } from 'vitest'
import WavEncoder from 'wav-encoder'
import { createWavBlob } from './wav'

describe('audio WAV', () => {
  it('devuelve audio WAV con el tamaño codificado esperado', () => {
    const blob = createWavBlob([new Float32Array([-1, 0]), new Float32Array([1])], 48000)
    const encoded = WavEncoder.encode.sync({
      sampleRate: 48000,
      channelData: [new Float32Array([-1, 0, 1])]
    })

    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(encoded.byteLength)
  })
})
