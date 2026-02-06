// ============================================
// Speech Recognition Module - Minimal Version
// ============================================

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

// Initialize
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    console.log('✅ Speech recognition ready');
}

// Calculate accuracy
function calculateAccuracy(target, spoken) {
    if (!target || !spoken) return 0;
    const targetWords = target.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const spokenWords = spoken.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    let matches = 0;
    targetWords.forEach((word, idx) => {
        if (spokenWords[idx] === word) matches++;
    });
    return Math.round((matches / targetWords.length) * 100);
}

// Start speech recognition
function startSpeechRecognition(targetText, callback) {
    if (!recognition) {
        callback({ error: 'not-supported', errorMessage: '음성인식이 지원되지 않습니다.' });
        return;
    }

    // Set up handlers fresh each time
    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        const accuracy = calculateAccuracy(targetText, transcript);

        console.log('🎯 Result:', transcript);
        callback({
            transcript: transcript,
            confidence: Math.round(confidence * 100),
            accuracy: accuracy
        });
    };

    recognition.onerror = function (event) {
        console.error('❌ Error:', event.error);
        let msg = '음성 인식 오류';
        if (event.error === 'no-speech') msg = '음성이 감지되지 않았습니다.';
        if (event.error === 'not-allowed') msg = '마이크 권한이 필요합니다.';
        if (event.error === 'network') msg = '네트워크 오류입니다.';

        callback({ error: event.error, errorMessage: msg });
    };

    recognition.onend = function () {
        console.log('🔚 Recognition ended');
    };

    try {
        recognition.start();
        console.log('🎤 Started listening...');
    } catch (e) {
        console.error('Start failed:', e);
        callback({ error: 'start-failed', errorMessage: '음성 인식 시작 실패' });
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

// Info for UI
function getSpeechRecognitionInfo() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return {
        supported: !!recognition,
        recommendation: isIOS && !isSafari ? 'iOS에서는 Safari를 사용하세요.' : null
    };
}
