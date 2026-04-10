
let _audioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (!_audioContext) {
    try {
      _audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    } catch (e) {
      console.error("Failed to create AudioContext:", e);
    }
  }
  return _audioContext as AudioContext;
};

// For backward compatibility in exports
export const audioContext = getAudioContext();

export class AudioStreamer {
  public isPlaying = false;
  private audioQueue: AudioBuffer[] = [];
  private nextStartTime = 0;

  constructor(private context: AudioContext) {}

  async addPCM16(chunk: Uint8Array) {
    if (!this.context) return;
    
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer);

    for (let i = 0; i < chunk.length / 2; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32Array[i] = int16 / 32768;
    }

    const audioBuffer = this.context.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    this.audioQueue.push(audioBuffer);
    this.scheduleNextBuffer();
  }

  private scheduleNextBuffer() {
    if (this.audioQueue.length === 0 || !this.context) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift();
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    if (this.nextStartTime < this.context.currentTime) {
      this.nextStartTime = this.context.currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    source.onended = () => {
      this.scheduleNextBuffer();
    };
  }

  stop() {
    this.isPlaying = false;
    this.audioQueue = [];
    this.nextStartTime = 0;
  }
}

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private context: AudioContext | null = null;

  constructor(private onData: (base64: string) => void) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });
    
    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
      }
      
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      this.onData(base64);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.context.destination);
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
  }
}
