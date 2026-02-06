// ============================================
// Speech Recognition Module
// For pronunciation accuracy measurement
// Enhanced iOS/Chrome compatibility
// ============================================

let recognition = null;
let recognitionCallback = null;
let targetText = '';

// Device/Browser Detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
const isMobile = isIOS || isAndroid;

// On iOS, only Safari properly supports Web Speech API
// iOS Chrome uses WebKit but has restrictions
const hasGoodSpeechSupport = (isIOS && isSafari) || (!isIOS && isChrome) || (!isIOS && !isAndroid);

// Check browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Initialize recognition
if (SpeechRecognition) {
    try {
        recognition = new SpeechRecognition();
        // Android: continuous = true to prevent premature timeouts
        recognition.continuous = isAndroid;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            // In continuous mode, results are an array. Get the latest one.
            const lastResultIndex = event.results.length - 1;
            const transcript = event.results[lastResultIndex][0].transcript;
            const confidence = event.results[lastResultIndex][0].confidence;

            // IGNORE premature results (less than 500ms)
            // This prevents "ding" sounds or immediate glitches from being treated as speech
            if (activeRequest && (Date.now() - activeRequest.startTime) < 500 && transcript.length < 2) {
                console.warn('⚠️ Premature result ignored:', transcript);
                return;
            }

            if (activeRequest) activeRequest.hasResult = true;

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
            if (activeRequest) activeRequest.hasResult = true; // Treated as handled

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
                    // If aborted quickly, it might be the conflict retry logic or app backgrounding
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
            }
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            // If ended WITHOUT result and WITHOUT error (Silent close)
            // This happens on some Androids if mic is pre-empted or silence timeout
            if (activeRequest && !activeRequest.hasResult) {
                console.warn('⚠️ Ended without result/error (Silent Close)');

                // If it was very short (< 1s), treat as aborted/conflict
                if ((Date.now() - activeRequest.startTime) < 1000) {
                    if (recognitionCallback) {
                        recognitionCallback({
                            transcript: '',
                            confidence: 0,
                            accuracy: 0,
                            error: 'aborted', // Treat as aborted so UI resets
                            errorMessage: '음성 인식이 중단되었습니다 (다른 앱 사용 등).'
                        });
                    }
                }
                // Otherwise likely silence timeout or normal stop
                // We should probably treat it as no-speech if we expected input
                else {
                    if (recognitionCallback) {
                        recognitionCallback({
                            transcript: '',
                            confidence: 0,
                            accuracy: 0,
                            error: 'no-speech',
                            errorMessage: '음성이 감지되지 않았습니다.'
                        });
                    }
                }
            }
            activeRequest = null;
        };

        console.log('✅ Speech recognition initialized', { isIOS, isSafari, hasGoodSpeechSupport });
    } catch (e) {
        console.error('Failed to initialize speech recognition:', e);
        recognition = null;
    }
}

// Track active request state
let activeRequest = null;

// Start speech recognition
async function startSpeechRecognition(target, callback, options = {}) {
    // CRITICAL: Abort any previous session before starting new one
    // This fixes iOS Safari issue where second sentence fails
    if (recognition) {
        try {
            recognition.abort();
            console.log('🔄 Aborted previous recognition session');
        } catch (e) {
            // Ignore abort errors
        }
    }

    // Clear previous active request state
    activeRequest = null;

    // Check if not supported at all
    if (!recognition) {
        let errorMessage = '음성인식이 지원되지 않는 브라우저입니다.';

        if (isIOS) {
            errorMessage = 'iOS에서는 Safari 브라우저를 사용해주세요. (설정 > Safari에서 열기)';
        } else if (isAndroid) {
            errorMessage = 'Chrome 브라우저에서 열어주세요.';
        } else {
            errorMessage = 'Chrome 또는 Edge 브라우저를 사용해주세요.';
        }

        console.warn('Speech recognition not supported');
        callback({
            transcript: '',
            confidence: 0,
            accuracy: 0,
            error: 'not-supported',
            errorMessage: errorMessage
        });
        return;
    }

    // Reset active request state for new session
    activeRequest = {
        startTime: Date.now(),
        hasResult: false
    };

    // Request microphone permission FIRST (important for mobile devices!)
    // BUT allow skipping if the caller already handled it (e.g., visualizer running)
    if (!options.skipPermissionCheck) {
        try {
            console.log('🎤 Requesting microphone permission...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately - we just needed permission
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Microphone permission granted');
        } catch (micError) {
            console.error('Microphone permission error:', micError);

            let errorMessage = '마이크 권한이 필요합니다.';

            if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
                errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.';
            } else if (micError.name === 'NotFoundError') {
                errorMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
            } else if (micError.name === 'NotReadableError') {
                errorMessage = '마이크가 다른 앱에서 사용 중입니다.';
            }

            if (isIOS && !isSafari) {
                errorMessage += ' (iOS는 Safari 사용 권장)';
            }

            callback({
                transcript: '',
                confidence: 0,
                accuracy: 0,
                error: 'mic-permission',
                errorMessage: errorMessage
            });
            return;
        }
    } else {
        console.log('🎤 Skipping explicit permission check (caller handled it)');
    }

    // Warn about iOS Chrome limitations
    if (isIOS && !isSafari) {
        console.warn('⚠️ iOS Chrome has limited speech recognition support');
    }

    targetText = target.toLowerCase().trim();
    recognitionCallback = callback;

    try {
        recognition.start();
        console.log('🎤 Speech recognition started for:', targetText.substring(0, 30) + '...');
    } catch (e) {
        console.error('Failed to start recognition:', e);

        let errorMessage = '음성 인식을 시작할 수 없습니다.';
        if (isIOS && !isSafari) {
            errorMessage = 'iOS Chrome에서는 음성 인식이 제한됩니다. Safari를 사용해주세요.';
        } else if (e.message && e.message.includes('already started')) {
            errorMessage = '음성 인식이 이미 실행 중입니다. 잠시 후 다시 시도해주세요.';
        }

        callback({
            transcript: '',
            confidence: 0,
            accuracy: 0,
            error: 'start-failed',
            errorMessage: errorMessage
        });
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

// Check if speech recognition is available
function isSpeechRecognitionAvailable() {
    return !!recognition;
}

// Get speech recognition status info
function getSpeechRecognitionInfo() {
    return {
        available: !!recognition,
        isIOS: isIOS,
        isSafari: isSafari,
        hasGoodSupport: hasGoodSpeechSupport,
        recommendation: isIOS && !isSafari ? 'Safari 브라우저를 사용해주세요' : null
    };
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
