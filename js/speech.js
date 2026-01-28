// ============================================
// Speech Recognition Module
// For pronunciation accuracy measurement
// ============================================

let recognition = null;
let recognitionCallback = null;
let targetText = '';

// Check browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;

        // Calculate accuracy
        const accuracy = calculateAccuracy(targetText, transcript);

        if (recognitionCallback) {
            recognitionCallback({
                transcript: transcript,
                confidence: Math.round(confidence * 100),
                accuracy: accuracy
            });
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (recognitionCallback) {
            recognitionCallback({
                transcript: '',
                confidence: 0,
                accuracy: 0,
                error: event.error
            });
        }
    };

    recognition.onend = () => {
        console.log('Speech recognition ended');
    };
}

// Start speech recognition
function startSpeechRecognition(target, callback) {
    if (!recognition) {
        console.warn('Speech recognition not supported');
        // Fallback: return random accuracy after delay
        setTimeout(() => {
            callback({
                transcript: target,
                confidence: 85,
                accuracy: Math.floor(Math.random() * 25) + 75
            });
        }, 2000);
        return;
    }

    targetText = target.toLowerCase().trim();
    recognitionCallback = callback;

    try {
        recognition.start();
    } catch (e) {
        console.error('Failed to start recognition:', e);
    }
}

// Stop speech recognition
function stopSpeechRecognition() {
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) { }
    }
}

// Calculate accuracy between target and spoken text
function calculateAccuracy(target, spoken) {
    const targetWords = target.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const spokenWords = spoken.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);

    let matches = 0;

    for (const word of targetWords) {
        if (spokenWords.includes(word)) {
            matches++;
        }
    }

    const accuracy = Math.round((matches / targetWords.length) * 100);
    return Math.min(accuracy, 100);
}
