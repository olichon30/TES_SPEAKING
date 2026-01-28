// ============================================
// Excel File Parser Module (using SheetJS)
// ============================================

// Load SheetJS library
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (window.XLSX) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load SheetJS'));
        document.head.appendChild(script);
    });
}

/**
 * Parse Excel file with specific structure:
 * - File Name -> Textbook Name
 * - Each Sheet -> Unit
 * - Cell A1 -> Unit Title (e.g., "Unit 1. My Family")
 * - Column A (from row 2) -> English Sentence
 * - Column B (from row 2) -> Korean Sentence
 */
async function parseExcelFile(file) {
    await loadSheetJS();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Textbook name from filename (remove extension)
                const textbookName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

                const parsedData = {
                    textbookName: textbookName,
                    units: []
                };

                // Iterate through all sheets
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length === 0) return;

                    // 1. Get Unit Title from A1 (First row, first column)
                    let unitTitle = sheetName; // Default to sheet name
                    if (jsonData[0] && jsonData[0][0]) {
                        unitTitle = jsonData[0][0].toString().trim();
                    }

                    // 2. Parse Sentences (starting from 2nd row)
                    const sentences = [];
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        // Check if row has at least English (Col A)
                        if (row[0]) {
                            sentences.push({
                                en: row[0].toString().trim(), // Col A: English
                                kr: row[1] ? row[1].toString().trim() : '', // Col B: Korean
                                order: i
                            });
                        }
                    }

                    if (sentences.length > 0) {
                        parsedData.units.push({
                            name: unitTitle,
                            sentences: sentences
                        });
                    }
                });

                resolve(parsedData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Handle Excel file upload
async function handleExcelUpload(inputElement, callback) {
    const file = inputElement.files[0];
    if (!file) return;

    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('Excel 파일만 업로드 가능합니다', 'error');
        return;
    }

    try {
        showLoading('교과서 데이터 분석 중...');
        const data = await parseExcelFile(file);
        hideLoading();

        if (data.units.length === 0) {
            showToast('유효한 데이터가 없습니다.', 'error');
            return;
        }

        console.log('Parsed Data:', data);
        showToast(`'${data.textbookName}'의 ${data.units.length}개 유닛을 불러왔습니다.`, 'success');

        if (callback) callback(data);
    } catch (error) {
        hideLoading();
        console.error('Excel parse error:', error);
        showToast('파일 분석에 실패했습니다', 'error');
    }
}
