import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const MASTER_FILE = path.join(__dirname, 'data', '서울시 역사마스터 정보.json');
const USAGE_FILE = path.join(__dirname, 'data', '서울시 지하철 호선별 역별 시간대별 승하차 인원 정보.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'subway_data.json');

console.log('Loading data...');

// Helper to clean station names
function cleanName(name) {
    if (!name) return '';
    // Remove anything in parentheses and trailing '역'
    return name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
}

// 1. Load Master Data
const masterRaw = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
const masterData = {};
masterRaw.DATA.forEach(item => {
    const name = cleanName(item.bldn_nm);
    if (!masterData[name]) {
        masterData[name] = {
            name: item.bldn_nm, // Original name
            lat: parseFloat(item.lat),
            lot: parseFloat(item.lot)
        };
    }
});

console.log(`Loaded ${Object.keys(masterData).length} stations from master data.`);

// 2. Load and Aggregate Usage Data
const usageRaw = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
const aggregatedUsage = {};

// Filter for latest month to get current patterns
const LATEST_MONTH = '202604'; 
const usageData = usageRaw.DATA.filter(row => row.use_mm === LATEST_MONTH);

usageData.forEach(row => {
    const name = cleanName(row.sttn);
    if (!aggregatedUsage[name]) {
        aggregatedUsage[name] = {
            inflow: new Array(24).fill(0),
            outflow: new Array(24).fill(0)
        };
    }

    for (let h = 0; h < 24; h++) {
        const onKey = `hr_${h}_get_on_nope`;
        const offKey = `hr_${h}_get_off_nope`;
        aggregatedUsage[name].outflow[h] += (row[onKey] || 0);
        aggregatedUsage[name].inflow[h] += (row[offKey] || 0);
    }
});

console.log(`Aggregated usage data for ${Object.keys(aggregatedUsage).length} stations.`);

// 3. Merge and Process
const finalData = [];
let idCounter = 1;

for (const name in aggregatedUsage) {
    const master = masterData[name];
    if (!master) continue; // Skip if no coordinate data

    const usage = aggregatedUsage[name];
    const hourly_inflow = usage.inflow;
    const hourly_outflow = usage.outflow;
    const hourly_congestion = new Array(24).fill(0);
    const hourly_stay = new Array(24).fill(0);

    for (let h = 0; h < 24; h++) {
        hourly_congestion[h] = hourly_inflow[h] + hourly_outflow[h];
        hourly_stay[h] = hourly_inflow[h] - hourly_outflow[h];
    }

    // Station Type Classification (Morning Peak 07-09)
    const morningInflow = hourly_inflow[7] + hourly_inflow[8];
    const morningOutflow = hourly_outflow[7] + hourly_outflow[8];
    
    let station_type = 'Mixed';
    if (morningInflow > morningOutflow * 1.5) {
        station_type = 'Business';
    } else if (morningOutflow > morningInflow * 1.5) {
        station_type = 'Residential';
    }

    finalData.push({
        id: String(idCounter++),
        name: master.name,
        x: master.lot,
        y: master.lat,
        station_type,
        hourly_congestion,
        hourly_stay,
        hourly_inflow,
        hourly_outflow
    });
}

console.log(`Merged ${finalData.length} stations.`);

// 4. Calculate Station Similarity (Pattern-based Euclidean Distance)
console.log('Calculating similarity...');
finalData.forEach(stationA => {
    // Normalize A's congestion vector for pattern matching (optional but often better)
    // However, the prompt asks for hourly_congestion vector directly.
    // We will stick to the raw vector but use a more standard score.
    const distances = finalData
        .filter(stationB => stationA.id !== stationB.id)
        .map(stationB => {
            let sumSq = 0;
            for (let i = 0; i < 24; i++) {
                const diff = stationA.hourly_congestion[i] - stationB.hourly_congestion[i];
                sumSq += diff * diff;
            }
            const distance = Math.sqrt(sumSq);
            return { name: stationB.name, distance };
        });

    distances.sort((a, b) => a.distance - b.distance);

    // Simple normalization for score: 100 - (dist / scale)
    // Using the 95th percentile distance as a scale to avoid outliers ruining the score range
    const sortedDistances = [...distances].map(d => d.distance).sort((a, b) => a - b);
    const scale = sortedDistances[Math.floor(sortedDistances.length * 0.95)] || 1;

    stationA.similar_stations = distances.slice(0, 5).map(d => ({
        name: d.name,
        score: Math.max(0, Math.min(99, Math.round(100 * (1 - d.distance / scale))))
    }));
});

// 5. Write to File
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
console.log(`Successfully saved to ${OUTPUT_FILE}`);
