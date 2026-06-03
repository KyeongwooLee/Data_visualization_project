import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to clean station names
function cleanName(name) {
    if (!name) return '';
    return name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
}

function processLine9Excel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const result = {};

    workbook.SheetNames.forEach(sheetName => {
        // We only care about Weekday (평일) for general patterns if we have to pick.
        // Or we can average them. Let's look for "평일" sheets first.
        if (!sheetName.includes('평일')) return;

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find header row (usually row 1)
        const headerRow = data[1];
        if (!headerRow || headerRow[0] !== '구분') return;

        // Map time slots to 24h indices
        // Header example: '05:30~05:59', '06:00~06:29'
        const timeMap = [];
        for (let j = 1; j < headerRow.length; j++) {
            const timeStr = headerRow[j];
            if (typeof timeStr !== 'string') continue;
            const hour = parseInt(timeStr.split(':')[0]);
            timeMap[j] = hour;
        }

        // Process station rows
        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            const stationName = cleanName(row[0]);
            if (!stationName) continue;

            if (!result[stationName]) {
                result[stationName] = new Array(24).fill(0);
                result[stationName].count = new Array(24).fill(0);
            }

            for (let j = 1; j < row.length; j++) {
                const hour = timeMap[j];
                const value = parseFloat(row[j]);
                if (hour !== undefined && !isNaN(value)) {
                    // Line 9 data is "Congestion %" (혼잡도). 
                    // We need to convert this to an "Estimated Population" value 
                    // to keep it consistent with other lines.
                    // Typical subway capacity is ~160 people per car * 6 cars = ~960 people.
                    // Let's use a scale factor: 1% = 10 people (Rough estimate).
                    const estimatedPop = value * 10; 
                    result[stationName][hour] += estimatedPop;
                    result[stationName].count[hour] += 1;
                }
            }
        }
    });

    // Average the values if multiple sheets (e.g. Up/Down lines)
    for (const name in result) {
        for (let h = 0; h < 24; h++) {
            if (result[name].count[h] > 0) {
                result[name][h] = Math.round(result[name][h] / result[name].count[h]);
            }
        }
        delete result[name].count;
    }

    return result;
}

const line9_2023 = processLine9Excel(path.join(__dirname, 'data', '2023년 9호선 역별 시간별 혼잡도 자료.xlsx'));
const line9_2024 = processLine9Excel(path.join(__dirname, 'data', '2024년 9호선 역별 시간별 혼잡도 자료.xlsx'));

fs.writeFileSync(path.join(__dirname, 'data', 'line9_processed.json'), JSON.stringify({
    "2023": line9_2023,
    "2024": line9_2024
}, null, 2));

console.log('Successfully processed Line 9 Excel data.');
