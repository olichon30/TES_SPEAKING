// ============================================
// Supabase Configuration
// ============================================

// Supabase project credentials
const SUPABASE_URL = 'https://pujiailalhhytbxvsrxj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1amlhaWxhbGhoeXRieHZzcnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzQ0MDcsImV4cCI6MjA4NDU1MDQwN30.Xvg5hXg_dINFkps4yoSJ0LEIxDLXMhDPSOVheIPpgHk';

// Initialize Supabase client
let supabaseClient = null;

// Load Supabase from CDN
function loadSupabase() {
    return new Promise((resolve, reject) => {
        if (window.supabase) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Supabase'));
        document.head.appendChild(script);
    });
}

// Initialize Supabase client
async function initSupabase() {
    try {
        await loadSupabase();

        if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
            console.warn('⚠️ Supabase not configured. Please update SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase.js');
            return null;
        }

        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized successfully');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return null;
    }
}

// Get Supabase client (ensures initialization)
async function getSupabase() {
    if (!supabaseClient) {
        await initSupabase();
    }
    return supabaseClient;
}

// ============================================
// Security & Input Validation
// ============================================

// Sanitize user input - removes XSS attack vectors
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .trim()
        .replace(/[<>'"&]/g, '') // Remove dangerous characters
        .slice(0, 100); // Limit length
}

// Sanitize for HTML display - escapes HTML entities
function sanitizeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Enhanced error handler with user-friendly messages
function handleError(error, context = '') {
    console.error(`❌ Error${context ? ` in ${context}` : ''}:`, error);

    // Map technical errors to user-friendly messages
    const errorMessages = {
        'Failed to fetch': '네트워크 연결을 확인해주세요',
        'PGRST116': '데이터를 찾을 수 없습니다',
        'PGRST301': '권한이 없습니다. 다시 로그인해주세요',
        '23505': '이미 등록된 정보입니다',
        '42501': '접근 권한이 없습니다',
        'NetworkError': '인터넷 연결을 확인해주세요',
        'TypeError': '잘못된 데이터 형식입니다'
    };

    const errorStr = error?.message || error?.code || String(error);

    for (const [key, msg] of Object.entries(errorMessages)) {
        if (errorStr.includes(key)) {
            return msg;
        }
    }

    return '오류가 발생했습니다. 다시 시도해주세요';
}

// ============================================
// Student Functions
// ============================================

// Get all students
async function getStudents() {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

    return { data, error };
}

// Get student by ID
async function getStudentById(id) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

    return { data, error };
}

// Create new student
async function createStudent(name, grade) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    // Sanitize inputs
    const safeName = sanitizeInput(name);
    const safeGrade = sanitizeInput(grade);

    if (!safeName || safeName.length < 1) {
        return { data: null, error: '이름을 입력해주세요' };
    }

    const { data, error } = await client
        .from('students')
        .insert([{ name: safeName, grade: safeGrade }])
        .select()
        .single();

    if (error) {
        return { data: null, error: handleError(error, 'createStudent') };
    }

    return { data, error: null };
}

// Find student by name and grade
async function findStudent(name, grade) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    // Sanitize inputs
    const safeName = sanitizeInput(name);
    const safeGrade = sanitizeInput(grade);

    const { data, error } = await client
        .from('students')
        .select('*')
        .eq('name', safeName)
        .eq('grade', safeGrade)
        .single();

    return { data, error };
}

// ============================================
// Textbook Functions
// ============================================

// Get all textbooks
async function getTextbooks() {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('textbooks')
        .select('*')
        .order('created_at', { ascending: true });

    return { data, error };
}

// Create textbook
async function createTextbook(name, grade = null, icon = '📚') {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('textbooks')
        .insert([{ name, grade, icon }])
        .select()
        .single();

    return { data, error };
}

// ============================================
// Unit Functions
// ============================================

// Get units by textbook
async function getUnitsByTextbook(textbookId) {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('units')
        .select('*')
        .eq('textbook_id', textbookId)
        .order('order_num', { ascending: true });

    return { data, error };
}

// Create unit
async function createUnit(textbookId, name, orderNum = 0) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('units')
        .insert([{ textbook_id: textbookId, name, order_num: orderNum }])
        .select()
        .single();

    return { data, error };
}

// ============================================
// Sentence Functions
// ============================================

// Get sentences by unit
async function getSentencesByUnit(unitId) {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('sentences')
        .select('*')
        .eq('unit_id', unitId)
        .order('order_num', { ascending: true });

    return { data, error };
}

// Create sentence
async function createSentence(unitId, sentenceEn, sentenceKr, orderNum = 0) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('sentences')
        .insert([{ unit_id: unitId, sentence_en: sentenceEn, sentence_kr: sentenceKr, order_num: orderNum }])
        .select()
        .single();

    return { data, error };
}

// Batch insert sentences
async function insertSentences(sentences) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('sentences')
        .insert(sentences)
        .select();

    return { data, error };
}

// ============================================
// Excel Import Function (Batch Insert)
// ============================================

// Import textbook with units and sentences from parsed Excel data
async function importTextbookData(parsedData) {
    const client = await getSupabase();
    if (!client) return { success: false, error: 'Supabase not initialized' };

    try {
        // 1. Create textbook
        const { data: textbook, error: textbookError } = await createTextbook(parsedData.textbookName);
        if (textbookError) throw textbookError;

        // 2. Create units and sentences
        for (let i = 0; i < parsedData.units.length; i++) {
            const unitData = parsedData.units[i];

            // Create unit
            const { data: unit, error: unitError } = await createUnit(textbook.id, unitData.name, i + 1);
            if (unitError) throw unitError;

            // Create sentences for this unit
            if (unitData.sentences && unitData.sentences.length > 0) {
                const sentencesToInsert = unitData.sentences.map((s, idx) => ({
                    unit_id: unit.id,
                    sentence_en: s.en,
                    sentence_kr: s.kr || '',
                    order_num: idx + 1
                }));

                const { error: sentenceError } = await insertSentences(sentencesToInsert);
                if (sentenceError) throw sentenceError;
            }
        }

        return { success: true, textbook };
    } catch (error) {
        console.error('Import error:', error);
        return { success: false, error };
    }
}

// ============================================
// Recording Functions
// ============================================

// Get recordings for a student
async function getStudentRecordings(studentId) {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('recordings')
        .select(`
            *,
            problems (sentence_kr, sentence_en)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    return { data, error };
}

// Get all recordings (for teacher)
async function getAllRecordings() {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('recordings')
        .select(`
            *,
            students (name, grade),
            problems (sentence_kr, sentence_en)
        `)
        .order('created_at', { ascending: false });

    return { data, error };
}

// Create new recording
async function createRecording(studentId, problemId, videoUrl) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('recordings')
        .insert([{
            student_id: studentId,
            problem_id: problemId,
            video_url: videoUrl,
            status: 'submitted',
            sticker_count: 0
        }])
        .select()
        .single();

    return { data, error };
}

// Update recording with feedback
async function updateRecordingFeedback(recordingId, feedback, stickerCount) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('recordings')
        .update({
            feedback,
            sticker_count: stickerCount,
            status: 'reviewed'
        })
        .eq('id', recordingId)
        .select()
        .single();

    return { data, error };
}

// ============================================
// Storage Functions
// ============================================

// Korean to Romanization converter
function koreanToRoman(korean) {
    const initials = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
    const medials = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
    const finals = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'm', 'p', 'p', 's', 's', 'ng', 't', 't', 't', 't', 't', 'p', 't'];

    let result = '';

    for (let i = 0; i < korean.length; i++) {
        const code = korean.charCodeAt(i);

        // Check if it's a Korean syllable (가-힣: 0xAC00-0xD7A3)
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const syllableIndex = code - 0xAC00;
            const initialIndex = Math.floor(syllableIndex / 588);
            const medialIndex = Math.floor((syllableIndex % 588) / 28);
            const finalIndex = syllableIndex % 28;

            result += initials[initialIndex] + medials[medialIndex] + finals[finalIndex];
        } else if (/[a-zA-Z0-9]/.test(korean[i])) {
            result += korean[i];
        }
    }

    // Capitalize first letter of each word part
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// Upload video to Supabase Storage
async function uploadVideo(file, studentId, studentName = '', unitTitle = '') {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    // Create filename: EnglishName_Unit_date.webm
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    // Convert Korean name to Romanized English
    const englishName = koreanToRoman(studentName) || 'Student';

    // Extract unit number if possible (e.g., "Unit 1" -> "U1")
    const unitMatch = unitTitle.match(/\d+/);
    const unitNum = unitMatch ? `U${unitMatch[0]}` : 'Rec';

    const fileName = `${studentId}/${englishName}_${unitNum}_${dateStr}.webm`;

    console.log('📹 Upload:', { studentName, englishName, unitNum, fileName });

    const { data, error } = await client
        .storage
        .from('recordings')
        .upload(fileName, file, {
            contentType: 'video/webm',
            upsert: false
        });

    if (error) return { data: null, error };

    // Get public URL
    const { data: urlData } = client
        .storage
        .from('recordings')
        .getPublicUrl(fileName);

    return { data: urlData.publicUrl, error: null };
}

// ============================================
// Teacher Auth Functions
// ============================================

// Teacher login
async function teacherLogin(email, password) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client.auth.signInWithPassword({
        email,
        password
    });

    return { data, error };
}

// Teacher logout
async function teacherLogout() {
    const client = await getSupabase();
    if (!client) return { error: 'Supabase not initialized' };

    const { error } = await client.auth.signOut();
    return { error };
}

// Get current teacher session
async function getTeacherSession() {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client.auth.getSession();
    return { data: data?.session, error };
}

// ============================================
// Utility Functions
// ============================================

// Show toast notification
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show loading overlay
function showLoading(message = '로딩 중...') {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(overlay);
    }
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
}

// Store student info in session
function setCurrentStudent(student) {
    sessionStorage.setItem('currentStudent', JSON.stringify(student));
}

// Get current student from session
function getCurrentStudent() {
    const student = sessionStorage.getItem('currentStudent');
    return student ? JSON.parse(student) : null;
}

// Clear student session
function clearCurrentStudent() {
    sessionStorage.removeItem('currentStudent');
}

// Initialize Supabase on page load
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});
