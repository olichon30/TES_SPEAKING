// ============================================
// Firebase Storage Configuration
// 녹화 영상 파일 저장 전용
// ============================================

// Firebase SDK (CDN import via module)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ⚠️ Firebase Console에서 복사한 설정으로 교체하세요!
const firebaseConfig = {
    apiKey: "AIzaSyAT9Moy5ws-9Ie-NNbLhLQvEZ9Vlg3vDYM",
    authDomain: "tesenglish403.firebaseapp.com",
    projectId: "tesenglish403",
    storageBucket: "tesenglish403.firebasestorage.app",
    messagingSenderId: "623968886289",
    appId: "1:623968886289:web:866ad9348b90b4fed81bb0",
    measurementId: "G-SSVP74M2M9"
};

// Initialize Firebase
let firebaseApp = null;
let storage = null;

function initFirebase() {
    if (firebaseApp) return storage;
    try {
        firebaseApp = initializeApp(firebaseConfig);
        storage = getStorage(firebaseApp);
        console.log('🔥 Firebase Storage initialized');
        return storage;
    } catch (err) {
        console.error('Firebase init error:', err);
        return null;
    }
}

// Upload video to Firebase Storage
async function uploadVideoToFirebase(file, studentId, studentName = '', unitTitle = '') {
    const store = initFirebase();
    if (!store) return { data: null, error: 'Firebase not initialized' };

    // Create filename: EnglishName_Unit_date.webm
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    // Convert Korean name to Romanized English (uses function from supabase.js)
    const englishName = (typeof koreanToRoman === 'function') ? koreanToRoman(studentName) : 'Student';

    // Extract unit number
    const unitMatch = unitTitle.match(/\d+/);
    const unitNum = unitMatch ? `U${unitMatch[0]}` : 'Rec';

    const filePath = `recordings/${studentId}/${englishName}_${unitNum}_${dateStr}.webm`;

    console.log('🔥 Firebase Upload:', { studentName, englishName, unitNum, filePath });

    try {
        const storageRef = ref(store, filePath);
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: 'video/webm'
        });

        // Get download URL
        const downloadUrl = await getDownloadURL(snapshot.ref);

        return { data: downloadUrl, error: null };
    } catch (err) {
        console.error('Firebase upload error:', err);
        return { data: null, error: err.message };
    }
}

// Delete video from Firebase Storage
async function deleteVideoFromFirebase(videoUrl) {
    const store = initFirebase();
    if (!store) return { error: 'Firebase not initialized' };

    try {
        // Extract path from URL
        const url = new URL(videoUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
        if (!pathMatch) return { error: 'Invalid Firebase URL' };

        const filePath = decodeURIComponent(pathMatch[1]);
        const storageRef = ref(store, filePath);
        await deleteObject(storageRef);

        return { error: null };
    } catch (err) {
        console.error('Firebase delete error:', err);
        return { error: err.message };
    }
}

// Make functions globally accessible
window.uploadVideoToFirebase = uploadVideoToFirebase;
window.deleteVideoFromFirebase = deleteVideoFromFirebase;
window.initFirebase = initFirebase;
