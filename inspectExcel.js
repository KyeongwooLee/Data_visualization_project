import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
    path.join(__dirname, 'data', '2023년 9호선 역별 시간별 혼잡도 자료.xlsx'),
    path.join(__dirname, 'data', '2024년 9호선 역별 시간별 혼잡도 자료.xlsx')
];

files.forEach(file => {
    console.log(`\n--- Inspecting: ${path.basename(file)} ---`);
    try {
        const workbook = XLSX.readFile(file);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`Sheet Name: ${sheetName}`);
        console.log('Top 5 rows:');
        data.slice(0, 5).forEach((row, i) => console.log(`Row ${i}:`, row));
    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});
