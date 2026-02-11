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

// Number word mappings (both directions)
const numberToWord = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
    '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
    '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
    '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
    '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
    '80': 'eighty', '90': 'ninety', '100': 'hundred'
};
const wordToNumber = Object.fromEntries(Object.entries(numberToWord).map(([k, v]) => [v, k]));

// Normalize a word: strip punctuation, convert numbers to words
function normalizeWord(word) {
    // Remove all punctuation (commas, periods, quotes, etc.)
    word = word.replace(/[^a-z0-9]/g, '');
    // If it's a number, convert to word
    if (numberToWord[word]) return numberToWord[word];
    // If it's a word for a number, convert to the word form (already is)
    return word;
}

// Calculate accuracy between target and spoken text
function calculateAccuracy(target, spoken) {
    const targetWords = target.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
        .map(normalizeWord).filter(w => w.length > 0);
    const spokenWords = spoken.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
        .map(normalizeWord).filter(w => w.length > 0);

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
