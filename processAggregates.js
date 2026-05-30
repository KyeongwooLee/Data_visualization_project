import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, 'public', 'daily_data');
const AGGREGATE_FILE = path.join(__dirname, 'public', 'station_aggregates.json');

console.log('--- Generating Station Aggregates (Temperature Correlation) ---');

const manifestPath = path.join(__dirname, 'public', 'date_manifest.json');
if (!fs.existsSync(manifestPath)) {
    console.error("Manifest not found. Please run processDailyData.js first.");
    process.exit(1);
}

const dates = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const aggregates = {}; // { stationName: [ { temp: 12, congestion: 50000 }, ... ] }

dates.forEach(date => {
    const filePath = path.join(OUTPUT_DIR, `${date}.json`);
    if (!fs.existsSync(filePath)) return;

    const dayData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const temp = dayData.weather?.temp;
    if (temp === undefined) return;

    dayData.stations.forEach(station => {
        if (!aggregates[station.name]) {
            aggregates[station.name] = [];
        }
        
        // Sum total daily congestion for this station
        const dailyTotal = station.hourly_congestion.reduce((sum, val) => sum + val, 0);
        
        // We only want a representative sample to keep file size small (e.g. max 100 points per station)
        // For simplicity, we just push all data points for now, it's roughly 700 points per station.
        aggregates[station.name].push({
            temp: temp,
            congestion: dailyTotal
        });
    });
});

console.log('Sorting and downsampling points to reduce file size...');
// Downsample to max 50 points per station evenly distributed by temperature to keep frontend fast
const finalAggregates = {};
for (const name in aggregates) {
    const points = aggregates[name];
    points.sort((a, b) => a.temp - b.temp); // Sort by temperature
    
    const sampled = [];
    const step = Math.max(1, Math.floor(points.length / 50));
    for (let i = 0; i < points.length; i += step) {
        sampled.push(points[i]);
    }
    finalAggregates[name] = sampled;
}

fs.writeFileSync(AGGREGATE_FILE, JSON.stringify(finalAggregates));
console.log(`Successfully generated aggregates at ${AGGREGATE_FILE}`);
