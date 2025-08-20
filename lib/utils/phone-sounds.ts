// Phone sound utilities for DTMF tones and ringtones

class PhoneSounds {
  private audioContext: AudioContext | null = null;
  private isRinging = false;
  private ringInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Play DTMF tone for a digit
  playDTMF(digit: string) {
    if (!this.audioContext) return;

    // DTMF frequency pairs
    const frequencies: Record<string, [number, number]> = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '*': [941, 1209],
      '0': [941, 1336],
      '#': [941, 1477],
      '+': [941, 1633] // Use 'D' tone for +
    };

    const freqs = frequencies[digit];
    if (!freqs) return;

    const [freq1, freq2] = freqs;
    const duration = 200; // milliseconds
    const currentTime = this.audioContext.currentTime;

    // Create oscillators for both frequencies
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Set frequencies
    osc1.frequency.value = freq1;
    osc2.frequency.value = freq2;

    // Set volume
    gainNode.gain.value = 0.1;
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration / 1000);

    // Connect nodes
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Play the tone
    osc1.start(currentTime);
    osc2.start(currentTime);
    osc1.stop(currentTime + duration / 1000);
    osc2.stop(currentTime + duration / 1000);
  }

  // Play ringtone pattern
  startRingtone(type: 'outgoing' | 'incoming' = 'outgoing') {
    if (!this.audioContext || this.isRinging) return;

    this.isRinging = true;

    if (type === 'outgoing') {
      // US ringtone: 440Hz + 480Hz, 2s on, 4s off
      this.playRingPattern([440, 480], 2000, 4000);
    } else {
      // Incoming call: more urgent pattern, 1s on, 1s off
      this.playRingPattern([440, 480], 1000, 1000);
    }
  }

  private playRingPattern(frequencies: [number, number], onDuration: number, offDuration: number) {
    if (!this.audioContext) return;

    const playTone = () => {
      if (!this.isRinging || !this.audioContext) return;

      const currentTime = this.audioContext.currentTime;
      const [freq1, freq2] = frequencies;

      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      osc1.frequency.value = freq1;
      osc2.frequency.value = freq2;

      // Fade in and out for smoother sound
      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(0.05, currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.05, currentTime + onDuration / 1000 - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + onDuration / 1000);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      osc1.start(currentTime);
      osc2.start(currentTime);
      osc1.stop(currentTime + onDuration / 1000);
      osc2.stop(currentTime + onDuration / 1000);
    };

    // Play immediately
    playTone();

    // Set up interval for repeating pattern
    this.ringInterval = setInterval(() => {
      playTone();
    }, onDuration + offDuration);
  }

  // Stop ringtone
  stopRingtone() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Play call connected sound
  playConnected() {
    if (!this.audioContext) return;

    const currentTime = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.frequency.value = 1000;
    gainNode.gain.value = 0.1;
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.start(currentTime);
    osc.stop(currentTime + 0.1);
  }

  // Play call ended sound
  playDisconnected() {
    if (!this.audioContext) return;

    const currentTime = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.frequency.value = 500;
    gainNode.gain.value = 0.1;
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.start(currentTime);
    osc.stop(currentTime + 0.2);
  }
}

// Export singleton instance
export const phoneSounds = new PhoneSounds();