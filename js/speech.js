// ============================================
// Speech Recognition Module
// Simple, stable implementation
// ============================================

let recognition = null;
let recognitionCallback = null;
let targetText = '';

// Device/Browser Detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);

// Check browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Initialize recognition
if (SpeechRecognition) {
    try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            console.log('🎯 onresult fired!', event.results);
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            console.log('📝 Transcript:', transcript, 'Confidence:', confidence);

            // Calculate accuracy
            const accuracy = calculateAccuracy(targetText, transcript);

            if (recognitionCallback) {
                recognitionCallback({
                    transcript: transcript,
                    confidence: Math.round(confidence * 100),
                    accuracy: accuracy
                });
                recognitionCallback = null; // Clear callback after use
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);

            let errorMessage = '음성 인식 오류가 발생했습니다.';

            switch (event.error) {
                case 'not-allowed':
                case 'permission-denied':
                    errorMessage = '마이크 권한이 필요합니다. 설정에서 마이크를 허용해주세요.';
                    break;
                case 'no-speech':
                    errorMessage = '음성이 감지되지 않았습니다. 다시 시도해주세요.';
                    break;
                case 'network':
                    errorMessage = '네트워크 오류입니다. 인터넷 연결을 확인해주세요.';
                    break;
                case 'audio-capture':
                    errorMessage = '마이크를 찾을 수 없습니다.';
                    if (isIOS && !isSafari) {
                        errorMessage += ' iOS에서는 Safari 브라우저를 사용해주세요.';
                    }
                    break;
                case 'aborted':
                    errorMessage = '음성 인식이 취소되었습니다.';
                    break;
            }

            if (recognitionCallback) {
                recognitionCallback({
                    transcript: '',
                    confidence: 0,
                    accuracy: 0,
                    error: event.error,
                    errorMessage: errorMessage
                });
                recognitionCallback = null;
            }
        };

        recognition.onend = () => {
            console.log('🔚 Speech recognition ended');
            // CRITICAL: If ended without result (no onresult called), notify callback
            // This prevents UI from freezing when recognition ends silently
            if (recognitionCallback) {
                console.warn('⚠️ Recognition ended without result - calling callback with no-speech');
                recognitionCallback({
                    transcript: '',
                    confidence: 0,
                    accuracy: 0,
                    error: 'no-speech',
                    errorMessage: '음성이 감지되지 않았습니다. 다시 시도해주세요.'
                });
                recognitionCallback = null;
            }
        };

        console.log('✅ Speech recognition initialized');
    } catch (e) {
        console.error('Failed to initialize speech recognition:', e);
        recognition = null;
    }
}

// Start speech recognition
async function startSpeechRecognition(target, callback, options = {}) {
    // Check if not supported
    if (!recognition) {
        let errorMessage = '음성인식이 지원되지 않는 브라우저입니다.';

        if (isIOS) {
            errorMessage = 'iOS에서는 Safari 브라우저를 사용해주세요.';
        } else if (isAndroid) {
            errorMessage = 'Chrome 브라우저에서 열어주세요.';
        } else {
            errorMessage = 'Chrome 또는 Edge 브라우저를 사용해주세요.';
        }

        callback({
            transcript: '',
            confidence: 0,
            accuracy: 0,
            error: 'not-supported',
            errorMessage: errorMessage
        });
        return;
    }

    targetText = target.toLowerCase().trim();
    recognitionCallback = callback;

    try {
        recognition.start();
        console.log('🎤 Speech recognition started');
    } catch (e) {
        console.error('Failed to start recognition:', e);

        // Try to abort and restart if already running
        try {
            recognition.abort();
            setTimeout(() => {
                recognition.start();
                console.log('🎤 Speech recognition restarted');
            }, 100);
        } catch (e2) {
            callback({
                transcript: '',
                confidence: 0,
                accuracy: 0,
                error: 'start-failed',
                errorMessage: '음성 인식을 시작할 수 없습니다. 페이지를 새로고침해주세요.'
            });
        }
    }
}

// Stop speech recognition
function stopSpeechRecognition() {
    if (recognition) {
        try {
            recognition.stop();
            console.log('🛑 Speech recognition stopped');
        } catch (e) {
            console.warn('Recognition stop error:', e);
        }
    }
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

// Get speech recognition info for UI
function getSpeechRecognitionInfo() {
    return {
        supported: !!recognition,
        isIOS: isIOS,
        isAndroid: isAndroid,
        isSafari: isSafari,
        recommendation: isIOS && !isSafari ? 'iOS에서는 Safari를 사용하세요.' : null
    };
}
