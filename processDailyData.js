import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const MASTER_FILE = path.join(__dirname, 'data', '서울시 역사마스터 정보.json');
const USAGE_FILE = path.join(__dirname, 'data', '서울교통공사_역별 일별 시간대별 승하차인원 정보.json');
const EVENTS_FILE = path.join(__dirname, 'data', '서울시 문화행사 정보.json');
const HOLIDAY_FILE = path.join(__dirname, 'data', '한전케이피에스주식회사_휴일_20250630 (1).csv');
const LINE9_FILE = path.join(__dirname, 'data', 'line9_processed.json');

// New Output Directory for Partitioned Files
const OUTPUT_DIR = path.join(__dirname, 'public', 'daily_data');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('--- Starting Daily Data Partitioning (incl. Line 9) ---');

// Helper to clean station names
function cleanName(name) {
    if (!name) return '';
    return name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
}

// 1. Load Station Master
const masterRaw = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
const masterMap = {};
masterRaw.DATA.forEach(item => {
    const cleaned = cleanName(item.bldn_nm);
    if (!masterMap[cleaned]) {
        masterMap[cleaned] = {
            id: item.bldn_id,
            name: item.bldn_nm,
            line: item.route,
            x: parseFloat(item.lot),
            y: parseFloat(item.lat)
        };
    }
});

// 2. Load Line 9 Pre-processed data
const line9Data = JSON.parse(fs.readFileSync(LINE9_FILE, 'utf8'));

// 3. Load Cultural Events
const eventsRaw = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
const eventsByDate = {};
eventsRaw.DATA.forEach(ev => {
    if (!ev.date) return;
    const datePart = ev.date.split('~')[0].trim();
    if (!eventsByDate[datePart]) eventsByDate[datePart] = [];
    if (eventsByDate[datePart].length < 2) {
        eventsByDate[datePart].push({ title: ev.title, location: ev.guname, time: ev.pro_time || "All day" });
    }
});

// 4. Load Subway Usage
const usageRaw = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
const dailyData = {};

function getHourValue(row, h) {
    if (h < 6) return row['hr06_bfr'] / 6 || 0;
    if (h === 6) return row['hr06'] || 0;
    const key = `hr${String(h).padStart(2, '0')}`;
    return row[key] || 0;
}

usageRaw.DATA.forEach(row => {
    const date = row.mvmn_ymd;
    if (!date) return;
    
    if (!dailyData[date]) {
        dailyData[date] = {
            weather: generateWeather(date),
            events: eventsByDate[date] || [],
            stations: {}
        };
    }
    
    const stationName = cleanName(row.sttn);
    if (!dailyData[date].stations[stationName]) {
        const master = masterMap[stationName];
        if (!master) return;
        
        dailyData[date].stations[stationName] = {
            id: master.id, name: master.name, line: row.line || master.line,
            x: master.x, y: master.y,
            hourly_inflow: new Array(24).fill(0),
            hourly_outflow: new Array(24).fill(0),
            hourly_congestion: new Array(24).fill(0)
        };
    }
    
    const target = dailyData[date].stations[stationName];
    const isBoarding = row.gtnf_se.includes('감') || row.gtnf_se.includes('승');

    for (let h = 0; h < 24; h++) {
        const val = getHourValue(row, h);
        if (isBoarding) target.hourly_outflow[h] += val;
        else target.hourly_inflow[h] += val;
    }
});

// 5. Integrate Line 9 Data & Save Files Individually
console.log('Processing and saving daily partitions...');
const allDates = Object.keys(dailyData).sort();

allDates.forEach(date => {
    const year = date.substring(0, 4);
    const l9YearData = line9Data[year] || line9Data["2023"];
    
    const stationsObj = dailyData[date].stations;

    // Add Line 9
    for (const sName in l9YearData) {
        if (!stationsObj[sName]) {
            const master = masterMap[sName];
            if (!master) continue;
            const hourly_congestion = l9YearData[sName];
            const half = hourly_congestion.map(v => Math.round(v / 2));
            stationsObj[sName] = {
                id: master.id, name: master.name, line: "9호선",
                x: master.x, y: master.y,
                hourly_inflow: half, hourly_outflow: half,
                hourly_congestion: hourly_congestion
            };
        }
    }

    // Post-process calculations for this date
    const stationsList = Object.values(stationsObj);
    stationsList.forEach(s => {
        if (s.hourly_congestion.every(v => v === 0)) {
            s.hourly_congestion = s.hourly_inflow.map((v, i) => v + s.hourly_outflow[i]);
        }
        s.hourly_stay = s.hourly_inflow.map((v, i) => v - s.hourly_outflow[i]);
        const morningIn = s.hourly_inflow[7] + s.hourly_inflow[8] + s.hourly_inflow[9];
        const morningOut = s.hourly_outflow[7] + s.hourly_outflow[8] + s.hourly_outflow[9];
        if (morningIn > morningOut * 1.5) s.station_type = "Business";
        else if (morningOut > morningIn * 1.5) s.station_type = "Residential";
        else s.station_type = "Mixed";
    });

    // Similarity for this date only
    stationsList.forEach(sA => {
        const sims = stationsList
            .filter(sB => sA.id !== sB.id)
            .map(sB => {
                const cosine = calculateCosineSimilarity(sA.hourly_congestion, sB.hourly_congestion);
                const sumA = sA.hourly_congestion.reduce((a, b) => a + b, 0);
                const sumB = sB.hourly_congestion.reduce((a, b) => a + b, 0);
                const volumeRatio = Math.min(sumA, sumB) / Math.max(sumA, sumB || 1);
                return { name: sB.name, score: (cosine * 0.7) + (volumeRatio * 0.3) };
            });
        sims.sort((a, b) => b.score - a.score);
        sA.similar_stations = sims.slice(0, 5).map(item => ({ name: item.name, score: Math.min(99, Math.round(item.score * 100)) }));
    });

    // Save individual file
    const dateOutput = {
        weather: dailyData[date].weather,
        events: dailyData[date].events,
        stations: stationsList
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, `${date}.json`), JSON.stringify(dateOutput));
});

// Save a small manifest file with available dates
fs.writeFileSync(path.join(path.dirname(OUTPUT_DIR), 'date_manifest.json'), JSON.stringify(allDates));

// Utilities
function calculateCosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return (normA === 0 || normB === 0) ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function generateWeather(dateStr) {
    const date = new Date(dateStr);
    const temps = [-2, 1, 7, 13, 19, 23, 25, 26, 19, 12, 6, 0];
    const baseTemp = temps[date.getMonth()];
    const variance = (Math.sin(date.getDate()) * 5);
    const condition = ['Clear', 'Cloudy', 'Rainy', 'Sunny'][Math.abs(Math.floor(Math.sin(date.getDate() * 13) * 4))];
    return { temp: Math.round((baseTemp + variance) * 10) / 10, condition: condition };
}

console.log(`\nSuccessfully partitioned ${allDates.length} days into ${OUTPUT_DIR}`);
