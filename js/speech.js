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
        // Return error - no fake results!
        callback({
            transcript: '',
            confidence: 0,
            accuracy: 0,
            error: 'not-supported',
            errorMessage: '음성인식이 지원되지 않습니다. Chrome 브라우저를 사용해주세요.'
        });
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

    // Count matching words (in correct position order)
    let matches = 0;
    let targetIndex = 0;

    for (const spokenWord of spokenWords) {
        // Find this word in remaining target words
        for (let i = targetIndex; i < targetWords.length; i++) {
            if (targetWords[i] === spokenWord) {
                matches++;
                targetIndex = i + 1;
                break;
            }
        }
    }

    // Calculate penalty for extra words
    const extraWords = Math.max(0, spokenWords.length - targetWords.length);
    const extraPenalty = extraWords * 0.15; // 15% penalty per extra word

    // Calculate penalty for missing words
    const missingWords = targetWords.length - matches;
    const missingPenalty = missingWords / targetWords.length;

    // Final accuracy
    let accuracy = (matches / targetWords.length) - extraPenalty;
    accuracy = Math.round(accuracy * 100);
    accuracy = Math.max(0, Math.min(accuracy, 100));

    return accuracy;
}
