import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const dailyDir = path.join(publicDir, 'daily_data');
const hours = Array.from({ length: 24 }, (_, hour) => hour);

const cleanStationName = (name = '') => name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();

const parseNumber = (value) => {
    if (value === undefined || value === null) return 0;
    const parsed = Number(String(value).trim());
    return Number.isFinite(parsed) ? parsed : 0;
};

const parseCsvLine = (line) => {
    const cells = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && quoted && next === '"') {
            cell += '"';
            i += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === ',' && !quoted) {
            cells.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }

    cells.push(cell.trim());
    return cells;
};

const createDryHour = () => ({
    rainMm: 0,
    snowCm: 0,
    newSnowCm: 0,
    phenomenonCode: '',
    weatherImpact: 'Dry',
});

const createDryDay = () => hours.map(() => createDryHour());

const getWeatherImpact = ({ rainMm, snowCm, newSnowCm, phenomenonCode }) => {
    const code = String(phenomenonCode || '');
    const snowCode = ['05', '06', '08', '09', '10', '12', '13', '14', '19', '20', '21', '22'].some((needle) => code.includes(needle));
    const rainCode = ['01', '02', '03', '04', '07', '11', '15', '16', '18'].some((needle) => code.includes(needle));

    if (newSnowCm >= 1 || snowCm >= 1) return 'Snow Accumulation';
    if (newSnowCm > 0 || snowCm > 0 || snowCode) return 'Snow';
    if (rainMm >= 10) return 'Heavy Rain';
    if (rainMm > 0 || rainCode) return 'Rain';
    return 'Dry';
};

async function parseWeatherCsv(fileName, weatherEvents) {
    const buffer = await readFile(path.join(publicDir, fileName));
    const text = new TextDecoder('euc-kr').decode(buffer);
    const lines = text.split(/\r?\n/).filter(Boolean);
    lines.shift();

    for (const line of lines) {
        const cells = parseCsvLine(line);
        const dateTime = cells[2];
        if (!dateTime) continue;

        const [date, rawTime] = dateTime.split(/\s+/);
        const hour = Number((rawTime || '0').slice(0, 2));
        if (!date || !Number.isInteger(hour) || hour < 0 || hour > 23) continue;

        if (!weatherEvents[date]) weatherEvents[date] = createDryDay();

        const rainMm = parseNumber(cells[3]);
        const snowCm = parseNumber(cells[5]);
        const newSnowCm = parseNumber(cells[6]);
        const phenomenonCode = String(cells[7] || '').trim();
        const merged = {
            rainMm: Math.max(weatherEvents[date][hour].rainMm, rainMm),
            snowCm: Math.max(weatherEvents[date][hour].snowCm, snowCm),
            newSnowCm: Math.max(weatherEvents[date][hour].newSnowCm, newSnowCm),
            phenomenonCode: phenomenonCode || weatherEvents[date][hour].phenomenonCode,
        };

        weatherEvents[date][hour] = {
            ...merged,
            weatherImpact: getWeatherImpact(merged),
        };
    }
}

const createStationStat = (station) => ({
    name: station.name,
    cleanName: cleanStationName(station.name),
    days: 0,
    typeCounts: {},
    lines: new Set(),
    congestion: Array(24).fill(0),
    inflow: Array(24).fill(0),
    outflow: Array(24).fill(0),
});

const sumRange = (values, start, endExclusive) => {
    let total = 0;
    for (let hour = start; hour < endExclusive; hour += 1) total += values[hour] || 0;
    return total;
};

const classifyStation = (stat, averageCongestion, averageInflow, averageOutflow) => {
    const total = averageCongestion.reduce((sum, value) => sum + value, 0) || 1;
    const peakHour = averageCongestion.indexOf(Math.max(...averageCongestion));
    const nightShare = sumRange(averageCongestion, 18, 24) / total;
    const eveningAverage = sumRange(averageCongestion, 18, 24) / 6;
    const afternoonAverage = sumRange(averageCongestion, 12, 18) / 6;

    if (nightShare >= 0.35 && peakHour >= 18 && eveningAverage > afternoonAverage) {
        return { stationType: 'Commercial Night', peakHour, nightShare, eveningLift: eveningAverage / (afternoonAverage || 1) };
    }

    const fallbackType = Object.entries(stat.typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (fallbackType) return { stationType: fallbackType, peakHour, nightShare, eveningLift: eveningAverage / (afternoonAverage || 1) };

    const morningInflow = sumRange(averageInflow, 7, 10);
    const morningOutflow = sumRange(averageOutflow, 7, 10);
    if (morningInflow > morningOutflow * 1.1) return { stationType: 'Business', peakHour, nightShare, eveningLift: eveningAverage / (afternoonAverage || 1) };
    if (morningOutflow > morningInflow * 1.1) return { stationType: 'Residential', peakHour, nightShare, eveningLift: eveningAverage / (afternoonAverage || 1) };
    return { stationType: 'Mixed', peakHour, nightShare, eveningLift: eveningAverage / (afternoonAverage || 1) };
};

const stationTypeLabel = {
    Business: 'Morning Inflow',
    Residential: 'Morning Outflow',
    Mixed: 'Mixed Flow',
    'Commercial Night': 'Commercial Night',
};

async function buildStationProfiles(manifest) {
    const stats = new Map();

    for (const date of manifest) {
        const dayPath = path.join(dailyDir, `${date}.json`);
        const day = JSON.parse(await readFile(dayPath, 'utf8'));

        for (const station of day.stations || []) {
            const key = station.name;
            if (!stats.has(key)) stats.set(key, createStationStat(station));
            const stat = stats.get(key);

            stat.days += 1;
            if (station.station_type) stat.typeCounts[station.station_type] = (stat.typeCounts[station.station_type] || 0) + 1;
            (station.lines || []).forEach((line) => stat.lines.add(line));

            hours.forEach((hour) => {
                stat.congestion[hour] += station.hourly_congestion?.[hour] || 0;
                stat.inflow[hour] += station.hourly_inflow?.[hour] || 0;
                stat.outflow[hour] += station.hourly_outflow?.[hour] || 0;
            });
        }
    }

    const profiles = {};
    const byCleanName = {};

    for (const [name, stat] of stats.entries()) {
        const divisor = stat.days || 1;
        const averageCongestion = stat.congestion.map((value) => Math.round(value / divisor));
        const averageInflow = stat.inflow.map((value) => Math.round(value / divisor));
        const averageOutflow = stat.outflow.map((value) => Math.round(value / divisor));
        const { stationType, peakHour, nightShare, eveningLift } = classifyStation(stat, averageCongestion, averageInflow, averageOutflow);
        const quietHours = averageCongestion
            .map((value, hour) => ({ hour, value }))
            .filter(({ hour }) => hour >= 10 && hour <= 22)
            .sort((a, b) => a.value - b.value)
            .slice(0, 3)
            .map(({ hour }) => hour);

        const profile = {
            name,
            cleanName: stat.cleanName,
            lines: Array.from(stat.lines),
            days: stat.days,
            stationType,
            typeLabel: stationTypeLabel[stationType] || 'Mixed Flow',
            peakHour,
            nightShare: Number(nightShare.toFixed(3)),
            eveningLift: Number(eveningLift.toFixed(3)),
            averageDailyLoad: Math.round(averageCongestion.reduce((sum, value) => sum + value, 0)),
            averageCongestion,
            averageInflow,
            averageOutflow,
            quietHours,
        };

        profiles[name] = profile;
        byCleanName[stat.cleanName] = profile;
    }

    return { profiles, byCleanName };
}

const buildCityDataAreaMap = () => ({
    강남: { area: '강남역', label: 'Gangnam Station' },
    서울: { area: '서울역', label: 'Seoul Station' },
    서울역: { area: '서울역', label: 'Seoul Station' },
    홍대입구: { area: '홍대 관광특구', label: 'Hongdae' },
    합정: { area: '홍대 관광특구', label: 'Hongdae' },
    상수: { area: '홍대 관광특구', label: 'Hongdae' },
    이태원: { area: '이태원 관광특구', label: 'Itaewon' },
    한강진: { area: '이태원 관광특구', label: 'Itaewon' },
    녹사평: { area: '이태원 관광특구', label: 'Itaewon' },
    잠실: { area: '잠실 관광특구', label: 'Jamsil' },
    '잠실(송파구청)': { area: '잠실 관광특구', label: 'Jamsil' },
    종합운동장: { area: '잠실종합운동장', label: 'Jamsil Sports Complex' },
    명동: { area: '명동 관광특구', label: 'Myeong-dong' },
    을지로입구: { area: '명동 관광특구', label: 'Myeong-dong' },
    신촌: { area: '신촌·이대역 일대', label: 'Sinchon' },
    이대: { area: '신촌·이대역 일대', label: 'Sinchon' },
    건대입구: { area: '건대입구역', label: 'Konkuk Univ.' },
    사당: { area: '사당역', label: 'Sadang Station' },
    고속터미널: { area: '고속터미널역', label: 'Express Bus Terminal' },
    신림: { area: '신림역', label: 'Sillim Station' },
    여의도: { area: '여의도', label: 'Yeouido' },
    여의나루: { area: '여의도한강공원', label: 'Yeouido Hangang Park' },
    광화문: { area: '광화문·덕수궁', label: 'Gwanghwamun' },
    시청: { area: '광화문·덕수궁', label: 'Gwanghwamun' },
    종로3가: { area: '종로·청계 관광특구', label: 'Jongno' },
    종각: { area: '종로·청계 관광특구', label: 'Jongno' },
    동대문: { area: '동대문 관광특구', label: 'Dongdaemun' },
    동대문역사문화공원: { area: '동대문 관광특구', label: 'Dongdaemun' },
    왕십리: { area: '왕십리역', label: 'Wangsimni Station' },
});

const summarizeWeather = (weatherEvents) => {
    const summary = {
        dates: Object.keys(weatherEvents).length,
        rainHours: 0,
        heavyRainHours: 0,
        snowHours: 0,
        snowAccumulationHours: 0,
    };

    Object.values(weatherEvents).forEach((day) => {
        day.forEach((event) => {
            if (event.weatherImpact === 'Rain') summary.rainHours += 1;
            if (event.weatherImpact === 'Heavy Rain') summary.heavyRainHours += 1;
            if (event.weatherImpact === 'Snow') summary.snowHours += 1;
            if (event.weatherImpact === 'Snow Accumulation') summary.snowAccumulationHours += 1;
        });
    });

    return summary;
};

async function main() {
    const manifest = JSON.parse(await readFile(path.join(publicDir, 'date_manifest.json'), 'utf8'));
    const weatherEvents = Object.fromEntries(manifest.map((date) => [date, createDryDay()]));

    await parseWeatherCsv('Weather_2023.csv', weatherEvents);
    await parseWeatherCsv('Weather_2024.csv', weatherEvents);

    const { profiles, byCleanName } = await buildStationProfiles(manifest);
    const generatedAt = new Date().toISOString();
    const profilePayload = {
        schemaVersion: 1,
        generatedAt,
        criteria: {
            commercialNight: '18-23 share >= 0.35, peak hour >= 18, evening average > afternoon average',
        },
        stations: profiles,
        byCleanName,
    };
    const aggregatePayload = {
        schemaVersion: 2,
        generatedAt,
        stationCount: Object.keys(profiles).length,
        weatherSummary: summarizeWeather(weatherEvents),
        stations: Object.fromEntries(Object.entries(profiles).map(([name, profile]) => [
            name,
            {
                stationType: profile.stationType,
                typeLabel: profile.typeLabel,
                peakHour: profile.peakHour,
                nightShare: profile.nightShare,
                averageDailyLoad: profile.averageDailyLoad,
                quietHours: profile.quietHours,
            },
        ])),
    };

    await writeFile(path.join(publicDir, 'weather_events.json'), JSON.stringify(weatherEvents), 'utf8');
    await writeFile(path.join(publicDir, 'station_profiles.json'), JSON.stringify(profilePayload), 'utf8');
    await writeFile(path.join(publicDir, 'citydata_area_map.json'), JSON.stringify(buildCityDataAreaMap()), 'utf8');
    await writeFile(path.join(publicDir, 'station_aggregates.json'), JSON.stringify(aggregatePayload), 'utf8');

    const commercialNightCount = Object.values(profiles).filter((profile) => profile.stationType === 'Commercial Night').length;
    console.log(`Generated weather_events.json for ${manifest.length} dates.`);
    console.log(`Generated station_profiles.json for ${Object.keys(profiles).length} stations.`);
    console.log(`Commercial Night stations: ${commercialNightCount}`);
}

main().catch((error) => {
    console.error(error);
    throw error;
});
