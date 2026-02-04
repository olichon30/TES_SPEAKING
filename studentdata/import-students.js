// Import students to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://pujiailalhhytbxvsrxj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1amlhaWxhbGhoeXRieHZzcnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzQ0MDcsImV4cCI6MjA4NDU1MDQwN30.Xvg5hXg_dINFkps4yoSJ0LEIxDLXMhDPSOVheIPpgHk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importStudents() {
    const students = JSON.parse(fs.readFileSync('studentdata/students.json', 'utf-8'));

    console.log(`Importing ${students.length} students...`);

    let imported = 0;
    let skipped = 0;

    for (const student of students) {
        const name = student['이름'];
        const className = student['클래스'];

        // Check if student already exists
        const { data: existing } = await supabase
            .from('students')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            console.log(`⏭️ Skipped (already exists): ${name}`);
            skipped++;
            continue;
        }

        // Insert new student
        const { data, error } = await supabase
            .from('students')
            .insert([{ name, grade: className }])
            .select()
            .single();

        if (error) {
            console.error(`❌ Error inserting ${name}:`, error.message);
        } else {
            console.log(`✅ Imported: ${name} (${className})`);
            imported++;
        }
    }

    console.log(`\n=== Import Complete ===`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${students.length}`);
}

importStudents().catch(console.error);
