/**
 * Audio Player Utilities for VC Voice Interruptions
 * Uses browser Web Speech API for text-to-speech
 */

export interface TTSConfig {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

export class VCAudioPlayer {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  /**
   * Play VC interruption with aggressive, authoritative voice
   */
  playVCInterruption(
    text: string,
    config: TTSConfig = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure voice for aggressive VC personality
      utterance.rate = config.rate ?? 1.3; // Faster for assertive VC
      utterance.pitch = config.pitch ?? 0.85; // Lower pitch for authority
      utterance.volume = config.volume ?? 1.0;

      // Try to find a male voice if available
      if (!config.voice) {
        const voices = this.synthesis.getVoices();
        const maleVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Male") ||
              v.name.includes("David") ||
              v.name.includes("Daniel") ||
              v.name.includes("Google UK English Male"))
        );
        if (maleVoice) {
          utterance.voice = maleVoice;
        }
      } else {
        utterance.voice = config.voice;
      }

      // Event handlers
      utterance.onstart = () => {
        console.log("🎤 VC interruption audio started");
        this.onStartCallback?.();
      };

      utterance.onend = () => {
        console.log("🎤 VC interruption audio ended");
        this.currentUtterance = null;
        this.onEndCallback?.();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error("❌ TTS error:", event);
        const error = new Error(`TTS error: ${event.error}`);
        this.onErrorCallback?.(error);
        reject(error);
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop any ongoing speech
   */
  stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Check if TTS is currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  /**
   * Set callback for when speech starts
   */
  onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  /**
   * Set callback for when speech ends
   */
  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  /**
   * Set callback for when speech errors
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Pause ongoing speech
   */
  pause(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }
}

/**
 * Helper to convert blob to base64 for transmission
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
