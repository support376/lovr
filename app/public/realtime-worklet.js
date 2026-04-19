/**
 * LuvOS realtime STT worklet — realtime/extracted-stt/web/worklet.js 에서 포팅.
 * 16kHz mono PCM (LINEAR16), 640 샘플(=40ms) 프레임.
 */
class PCMSender extends AudioWorkletProcessor {
  constructor() {
    super()
    this.frameSize = 640
    this.buffer = new Int16Array(this.frameSize)
    this.bufferIdx = 0
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true
    const channel = input[0]
    if (!channel) return true

    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]))
      this.buffer[this.bufferIdx++] = s < 0 ? s * 0x8000 : s * 0x7fff
      if (this.bufferIdx >= this.frameSize) {
        this.port.postMessage(this.buffer.buffer.slice(0))
        this.bufferIdx = 0
      }
    }
    return true
  }
}

registerProcessor('pcm-sender', PCMSender)
