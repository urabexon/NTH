import { AUDIO_FFT_SIZE, AUDIO_LOW_BAND_HZ, AUDIO_TEST_TONE_HZ } from '@/core/config';

import { bandEnergy } from './analysis';

export type AudioStatus = 'off' | 'requesting' | 'on' | 'denied' | 'unsupported';
export type AudioSource = 'microphone' | 'test-tone';

export class AudioInput {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private oscillator: OscillatorNode | null = null;
  private bins = new Uint8Array(AUDIO_FFT_SIZE / 2);
  private statusValue: AudioStatus = 'off';
  private readonly listeners = new Set<(status: AudioStatus) => void>();

  get status(): AudioStatus {
    return this.statusValue;
  }

  onStatus(listener: (status: AudioStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.statusValue);
    return () => this.listeners.delete(listener);
  }

  async start(source: AudioSource = 'microphone'): Promise<void> {
    if (this.statusValue === 'on' || this.statusValue === 'requesting') return;
    if (typeof AudioContext === 'undefined') {
      this.setStatus('unsupported');
      return;
    }
    this.setStatus('requesting');
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = AUDIO_FFT_SIZE;
    analyser.smoothingTimeConstant = 0.5;

    try {
      if (source === 'test-tone') {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = AUDIO_TEST_TONE_HZ;
        oscillator.connect(analyser);
        oscillator.start();
        this.oscillator = oscillator;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        context.createMediaStreamSource(stream).connect(analyser);
        this.stream = stream;
      }
    } catch {
      void context.close();
      this.setStatus('denied');
      return;
    }

    await context.resume();
    this.context = context;
    this.analyser = analyser;
    this.bins = new Uint8Array(analyser.frequencyBinCount);
    this.setStatus('on');
  }

  stop(): void {
    this.oscillator?.stop();
    this.oscillator = null;
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    void this.context?.close();
    this.context = null;
    this.analyser = null;
    this.setStatus('off');
  }

  lowBandEnergy(): number {
    if (!this.analyser || !this.context) return 0;
    this.analyser.getByteFrequencyData(this.bins);
    return bandEnergy(
      this.bins,
      this.context.sampleRate,
      this.analyser.fftSize,
      AUDIO_LOW_BAND_HZ[0],
      AUDIO_LOW_BAND_HZ[1],
    );
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  private setStatus(status: AudioStatus): void {
    this.statusValue = status;
    for (const listener of this.listeners) listener(status);
  }
}
