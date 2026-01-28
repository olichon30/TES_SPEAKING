// ============================================
// Screen + Audio Recorder Module
// ============================================

class RecorderManager {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
    }

    async startRecording(onTimeUpdate) {
        try {
            // Get screen + audio
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' },
                audio: true
            });

            // Get microphone
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            // Combine streams
            const tracks = [
                ...displayStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
            ];
            this.stream = new MediaStream(tracks);

            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startTime = Date.now();

            // Timer
            if (onTimeUpdate) {
                this.timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                    onTimeUpdate(this.formatTime(elapsed));
                }, 1000);
            }

            return true;
        } catch (error) {
            console.error('Recording error:', error);
            throw error;
        }
    }

    async startCameraRecording(onTimeUpdate) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startTime = Date.now();

            if (onTimeUpdate) {
                this.timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                    onTimeUpdate(this.formatTime(elapsed));
                }, 1000);
            }

            return this.stream;
        } catch (error) {
            console.error('Camera error:', error);
            throw error;
        }
    }

    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) { resolve(null); return; }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.cleanup();
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    cleanup() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.isRecording = false;
        this.stream = null;
        this.mediaRecorder = null;
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
}

const recorder = new RecorderManager();
