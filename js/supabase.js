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

// Get all students (filtered by current academy)
async function getStudents() {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    let query = client
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

    const academyId = getCurrentAcademyId();
    if (academyId) {
        query = query.eq('academy_id', academyId);
    }

    const { data, error } = await query;
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

    const insertData = { name: safeName, grade: safeGrade };
    const academyId = getCurrentAcademyId();
    if (academyId) {
        insertData.academy_id = academyId;
    }

    const { data, error } = await client
        .from('students')
        .insert([insertData])
        .select()
        .single();

    if (error) {
        return { data: null, error: handleError(error, 'createStudent') };
    }

    return { data, error: null };
}

// Find student by name (filtered by current academy)
async function findStudent(name, grade = null) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    // Sanitize inputs
    const safeName = sanitizeInput(name);

    // Search by name, filtered by academy
    let query = client
        .from('students')
        .select('*')
        .eq('name', safeName)
        .order('created_at', { ascending: true })
        .limit(1);

    const academyId = getCurrentAcademyId();
    if (academyId) {
        query = query.eq('academy_id', academyId);
    }

    const { data: results, error } = await query;

    // Get first result (or null if empty)
    const data = results && results.length > 0 ? results[0] : null;

    // If found and grade provided, optionally update grade
    if (data && grade && data.grade !== grade) {
        const safeGrade = sanitizeInput(grade);
        await client
            .from('students')
            .update({ grade: safeGrade })
            .eq('id', data.id);
        data.grade = safeGrade;
    }

    return { data, error: data ? null : error };
}

// Find ALL students by name (for handling same-name cases)
async function findStudentsByName(name) {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const safeName = sanitizeInput(name);

    const { data, error } = await client
        .from('students')
        .select('*')
        .eq('name', safeName)
        .order('created_at', { ascending: true });

    return { data: data || [], error };
}

// ============================================
// Textbook Functions
// ============================================

// Get all textbooks (filtered by current academy)
async function getTextbooks() {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    let query = client
        .from('textbooks')
        .select('*')
        .order('created_at', { ascending: true });

    const academyId = getCurrentAcademyId();
    if (academyId) {
        query = query.eq('academy_id', academyId);
    }

    const { data, error } = await query;
    return { data, error };
}

// Create textbook
async function createTextbook(name, grade = null, icon = null) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    // Build insert object with only non-null values
    const insertData = { name };
    if (grade) insertData.grade = grade;
    if (icon) insertData.icon = icon;

    const academyId = getCurrentAcademyId();
    if (academyId) insertData.academy_id = academyId;

    const { data, error } = await client
        .from('textbooks')
        .insert([insertData])
        .select()
        .single();

    if (error) {
        console.error('Create textbook error:', error);
    }

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
        // Get textbook name (support both 'name' and 'textbookName')
        const textbookName = parsedData.name || parsedData.textbookName;
        if (!textbookName) {
            throw new Error('교재 이름이 없습니다');
        }

        // 1. Create textbook
        const { data: textbook, error: textbookError } = await createTextbook(textbookName);
        if (textbookError) throw textbookError;

        // 2. Handle units (can be object or array)
        const units = parsedData.units;
        console.log('📦 Units data:', typeof units, Array.isArray(units) ? `Array(${units.length})` : Object.keys(units || {}).length + ' keys');
        console.log('📦 Units sample:', JSON.stringify(units).slice(0, 200));

        if (Array.isArray(units)) {
            // Array format: [{name, sentences: []}]
            for (let i = 0; i < units.length; i++) {
                const unitData = units[i];
                const { data: unit, error: unitError } = await createUnit(textbook.id, unitData.name, i + 1);
                if (unitError) throw unitError;

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
        } else if (typeof units === 'object') {
            // Object format: { "Unit 1": [{en, kr}], "Unit 2": [...] }
            const unitNames = Object.keys(units);
            for (let i = 0; i < unitNames.length; i++) {
                const unitName = unitNames[i];
                const sentences = units[unitName];

                const { data: unit, error: unitError } = await createUnit(textbook.id, unitName, i + 1);
                if (unitError) throw unitError;

                if (sentences && sentences.length > 0) {
                    const sentencesToInsert = sentences.map((s, idx) => ({
                        unit_id: unit.id,
                        sentence_en: s.en,
                        sentence_kr: s.kr || '',
                        order_num: idx + 1
                    }));
                    const { error: sentenceError } = await insertSentences(sentencesToInsert);
                    if (sentenceError) throw sentenceError;
                }
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

// Get all recordings (for teacher, filtered by academy)
async function getAllRecordings() {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    let query = client
        .from('recordings')
        .select(`
            *,
            students (name, grade),
            problems (sentence_kr, sentence_en)
        `)
        .order('created_at', { ascending: false });

    const academyId = getCurrentAcademyId();
    if (academyId) {
        query = query.eq('academy_id', academyId);
    }

    const { data, error } = await query;
    return { data, error };
}

// Create new recording
async function createRecording(studentId, problemId, videoUrl) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const insertData = {
        student_id: studentId,
        problem_id: problemId,
        video_url: videoUrl,
        status: 'submitted',
        sticker_count: 0
    };

    const academyId = getCurrentAcademyId();
    if (academyId) insertData.academy_id = academyId;

    const { data, error } = await client
        .from('recordings')
        .insert([insertData])
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

// Get single recording by ID (for sharing)
async function getRecordingById(id) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    // 1. Get recording
    const { data: recording, error } = await client
        .from('recordings')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return { data: null, error };
    if (!recording) return { data: null, error: 'Recording not found' };

    // 2. Get student name
    let studentName = '학생';
    if (recording.student_id) {
        const { data: student } = await client
            .from('students')
            .select('name')
            .eq('id', recording.student_id)
            .single();

        if (student) studentName = student.name;
    }

    // Combine
    return { data: { ...recording, student_name: studentName }, error: null };
}

// Get problem by ID (with sample fallback)
async function getProblemById(id) {
    const client = await getSupabase();

    // 1. Try DB
    if (client) {
        try {
            const { data, error } = await client
                .from('problems')
                .select('*')
                .eq('id', id)
                .single();

            if (data) return { data, error: null };
        } catch (e) {
            // Ignore DB error, use fallback
        }
    }

    // 2. Fallback Sample Data
    const samples = [
        { id: '1', sentence_kr: '나는 학교에 갑니다.', sentence_en: 'I go to school.' },
        { id: '2', sentence_kr: '오늘 날씨가 좋습니다.', sentence_en: 'The weather is nice today.' },
        { id: '3', sentence_kr: '저는 영어를 공부합니다.', sentence_en: 'I study English.' }
    ];
    const found = samples.find(p => p.id == id); // loose equality for string/number

    if (found) return { data: found, error: null };
    return { data: null, error: 'Problem not found' };
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

// Upload video - Firebase Storage (primary) / Supabase Storage (fallback)
async function uploadVideo(file, studentId, studentName = '', unitTitle = '') {
    // Try Firebase Storage first (5GB free)
    if (typeof uploadVideoToFirebase === 'function') {
        console.log('📹 Using Firebase Storage');
        return await uploadVideoToFirebase(file, studentId, studentName, unitTitle);
    }

    // Fallback to Supabase Storage
    console.log('📹 Fallback: Using Supabase Storage');
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Storage not initialized' };

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const englishName = koreanToRoman(studentName) || 'Student';
    const unitMatch = unitTitle.match(/\d+/);
    const unitNum = unitMatch ? `U${unitMatch[0]}` : 'Rec';
    const fileName = `${studentId}/${englishName}_${unitNum}_${dateStr}.webm`;

    const { data, error } = await client
        .storage
        .from('recordings')
        .upload(fileName, file, {
            contentType: 'video/webm',
            upsert: false
        });

    if (error) return { data: null, error };

    const { data: urlData } = client
        .storage
        .from('recordings')
        .getPublicUrl(fileName);

    return { data: urlData.publicUrl, error: null };
}

// ============================================
// Teacher Auth Functions
// ============================================

// Teacher login with email/password
async function teacherLogin(email, password) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client.auth.signInWithPassword({
        email,
        password
    });

    return { data, error };
}

// Teacher login with Google OAuth
async function teacherLoginWithGoogle() {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/teacher/auth-callback.html'
        }
    });

    return { data, error };
}

// Teacher logout
async function teacherLogout() {
    const client = await getSupabase();
    if (!client) return { error: 'Supabase not initialized' };

    sessionStorage.removeItem('currentAcademy');
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
// Academy Functions
// ============================================

// Generate random academy code (6 chars)
function generateAcademyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Create new academy
async function createAcademy(name) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data: session } = await client.auth.getSession();
    if (!session?.session?.user) return { data: null, error: 'Not authenticated' };

    const userId = session.session.user.id;
    const code = generateAcademyCode();

    // Create academy
    const { data: academy, error: acError } = await client
        .from('academies')
        .insert([{ name: sanitizeInput(name), code, owner_id: userId }])
        .select()
        .single();

    if (acError) return { data: null, error: acError };

    // Add creator as owner in academy_teachers
    const { error: atError } = await client
        .from('academy_teachers')
        .insert([{ academy_id: academy.id, user_id: userId, role: 'owner' }]);

    if (atError) return { data: null, error: atError };

    return { data: academy, error: null };
}

// Join academy by code
async function joinAcademyByCode(code) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data: session } = await client.auth.getSession();
    if (!session?.session?.user) return { data: null, error: 'Not authenticated' };

    const userId = session.session.user.id;

    // Find academy by code
    const { data: academy, error: findError } = await client
        .from('academies')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .single();

    if (findError || !academy) return { data: null, error: '학원 코드를 찾을 수 없습니다' };

    // Check if already a member
    const { data: existing } = await client
        .from('academy_teachers')
        .select('id')
        .eq('academy_id', academy.id)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing) return { data: academy, error: null }; // Already a member

    // Add as teacher
    const { error: joinError } = await client
        .from('academy_teachers')
        .insert([{ academy_id: academy.id, user_id: userId, role: 'teacher' }]);

    if (joinError) return { data: null, error: joinError };

    return { data: academy, error: null };
}

// Get academies for current user
async function getMyAcademies() {
    const client = await getSupabase();
    if (!client) return { data: [], error: 'Supabase not initialized' };

    const { data: session } = await client.auth.getSession();
    if (!session?.session?.user) return { data: [], error: 'Not authenticated' };

    const userId = session.session.user.id;

    const { data, error } = await client
        .from('academy_teachers')
        .select('role, academies(*)')
        .eq('user_id', userId);

    if (error) return { data: [], error };

    // Flatten: [{role, academy: {...}}]
    const academies = (data || []).map(row => ({
        ...row.academies,
        role: row.role
    }));

    return { data: academies, error: null };
}

// Get academy by code (for student login)
async function getAcademyByCode(code) {
    const client = await getSupabase();
    if (!client) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await client
        .from('academies')
        .select('id, name, code')
        .eq('code', code.toUpperCase().trim())
        .single();

    return { data, error };
}

// Store/retrieve current academy in session
function setCurrentAcademy(academy) {
    sessionStorage.setItem('currentAcademy', JSON.stringify(academy));
}

function getCurrentAcademy() {
    const data = sessionStorage.getItem('currentAcademy');
    return data ? JSON.parse(data) : null;
}

function getCurrentAcademyId() {
    const academy = getCurrentAcademy();
    return academy ? academy.id : null;
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
