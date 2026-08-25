import WavEncoder from 'wav-encoder'

export function createWavBlob(chunks: Float32Array[], sampleRate: number) {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const samples = new Float32Array(sampleCount)
  let offset = 0
  for (const chunk of chunks) {
    samples.set(chunk, offset)
    offset += chunk.length
  }

  const wav = WavEncoder.encode.sync({ sampleRate, channelData: [samples] })
  return new Blob([wav], { type: 'audio/wav' })
}
