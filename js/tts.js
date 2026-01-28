// ============================================
// Text-to-Speech (TTS) Module
// ============================================

class TTSManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.isPlaying = false;
        this.loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
    }

    getEnglishVoice() {
        const preferred = ['Google US English', 'Microsoft Zira', 'Samantha'];
        for (const name of preferred) {
            const voice = this.voices.find(v => v.name.includes(name));
            if (voice) return voice;
        }
        return this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
    }

    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            this.stop();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = options.voice || this.getEnglishVoice();
            utterance.rate = options.rate || 0.9;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;

            utterance.onstart = () => { this.isPlaying = true; };
            utterance.onend = () => { this.isPlaying = false; resolve(); };
            utterance.onerror = (e) => { this.isPlaying = false; reject(e); };

            this.synth.speak(utterance);
        });
    }

    stop() {
        this.synth?.cancel();
        this.isPlaying = false;
    }

    isSpeaking() { return this.isPlaying; }
}

const tts = new TTSManager();

async function speakWithFeedback(text, button) {
    if (!text) return;
    const original = button?.innerHTML;
    if (button) {
        button.disabled = true;
        button.innerHTML = '🔊 재생 중...';
    }
    try {
        await tts.speak(text, { rate: 0.85 });
    } catch (e) {
        console.error('TTS Error:', e);
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = original;
        }
    }
}
