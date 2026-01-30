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
        // 1순위: 선호하는 영어 음성 (품질 좋음)
        const preferred = [
            'Google US English',
            'Google UK English Female',
            'Google UK English Male',
            'Microsoft Zira',
            'Microsoft David',
            'Samantha',
            'Alex',
            'Karen',
            'Daniel'
        ];

        for (const name of preferred) {
            const voice = this.voices.find(v => v.name.includes(name));
            if (voice) return voice;
        }

        // 2순위: en-US 또는 en-GB 음성
        const usVoice = this.voices.find(v => v.lang === 'en-US');
        if (usVoice) return usVoice;

        const gbVoice = this.voices.find(v => v.lang === 'en-GB');
        if (gbVoice) return gbVoice;

        // 3순위: en으로 시작하는 아무 음성
        const anyEnglish = this.voices.find(v => v.lang.startsWith('en'));
        if (anyEnglish) return anyEnglish;

        // 4순위: 없으면 null 반환 (speak에서 lang 강제 설정)
        console.warn('⚠️ No English voice found, will use lang attribute');
        return null;
    }

    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            this.stop();
            const utterance = new SpeechSynthesisUtterance(text);

            // 영어 음성 설정
            const englishVoice = options.voice || this.getEnglishVoice();
            if (englishVoice) {
                utterance.voice = englishVoice;
            }

            // 음성이 없어도 영어로 읽도록 lang 강제 설정
            utterance.lang = 'en-US';

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
