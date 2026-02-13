-- ============================================
-- TES Speaking: Multi-Tenant Migration
-- 학원 프랜차이즈 구조를 위한 DB 스키마 변경
-- ============================================

-- 1. 학원(Academy) 테이블 생성
CREATE TABLE IF NOT EXISTS academies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. 학원-선생님 연결 테이블 생성
CREATE TABLE IF NOT EXISTS academy_teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'teacher' CHECK (role IN ('owner', 'teacher')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(academy_id, user_id)
);

-- 3. 기존 테이블에 academy_id 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id);
ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id);
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id);

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_students_academy ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_academy ON textbooks(academy_id);
CREATE INDEX IF NOT EXISTS idx_recordings_academy ON recordings(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_teachers_user ON academy_teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_academies_code ON academies(code);

-- 5. RLS 활성화
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_teachers ENABLE ROW LEVEL SECURITY;

-- 6. academies RLS 정책
CREATE POLICY "누구나 코드로 학원 조회 가능" ON academies
    FOR SELECT USING (true);

CREATE POLICY "인증된 사용자만 학원 생성 가능" ON academies
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 7. academy_teachers RLS 정책
CREATE POLICY "자신의 학원 멤버십 조회" ON academy_teachers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "인증된 사용자가 참여 가능" ON academy_teachers
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 8. students 테이블 RLS 정책 (학원별 격리)
-- 기존 정책이 있다면 먼저 삭제 후 생성
-- DROP POLICY IF EXISTS "기존정책이름" ON students;

CREATE POLICY "학원별 학생 조회" ON students
    FOR SELECT USING (
        academy_id IS NULL 
        OR academy_id IN (
            SELECT academy_id FROM academy_teachers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "학원별 학생 생성" ON students
    FOR INSERT WITH CHECK (true);

-- 9. textbooks 테이블 RLS 정책
CREATE POLICY "학원별 교재 조회" ON textbooks
    FOR SELECT USING (
        academy_id IS NULL 
        OR academy_id IN (
            SELECT academy_id FROM academy_teachers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "학원별 교재 생성" ON textbooks
    FOR INSERT WITH CHECK (true);

-- 10. recordings 테이블 RLS 정책
CREATE POLICY "학원별 녹화 조회" ON recordings
    FOR SELECT USING (
        academy_id IS NULL 
        OR academy_id IN (
            SELECT academy_id FROM academy_teachers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "학원별 녹화 생성" ON recordings
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 아래는 기존 TES 학원 데이터 마이그레이션용
-- (학원 생성 후 academy_id를 알게 되면 실행)
-- ============================================
-- UPDATE students SET academy_id = '생성된_학원_UUID' WHERE academy_id IS NULL;
-- UPDATE textbooks SET academy_id = '생성된_학원_UUID' WHERE academy_id IS NULL;
-- UPDATE recordings SET academy_id = '생성된_학원_UUID' WHERE academy_id IS NULL;
