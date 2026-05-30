import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const MASTER_FILE = path.join(__dirname, 'data', '서울시 역사마스터 정보.json');
const USAGE_FILE = path.join(__dirname, 'data', '서울교통공사_역별 일별 시간대별 승하차인원 정보.json');
const LINE9_FILE = path.join(__dirname, 'data', 'line9_processed.json');
const TRAIN_CONG_FILE = path.join(__dirname, 'data', '서울교통공사_지하철혼잡도정보.json');

const OUTPUT_DIR = path.join(__dirname, 'public', 'daily_data');

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
        masterMap[cleaned] = { id: item.bldn_id, name: item.bldn_nm, line: item.route, x: parseFloat(item.lot), y: parseFloat(item.lat) };
    }
});

// 2. Definitive Station List from SUBWAY_LINES (User Provided)
const SUBWAY_LINES_DATA = [
  { line: "1호선", stations: ["연천", "전곡", "청산", "소요산", "동두천", "보산", "동두천중앙", "지행", "덕정", "덕계", "양주", "녹양", "가능", "의정부", "회룡", "망월사", "도봉산", "도봉", "방학", "창동", "녹천", "월계", "광운대", "석계", "신이문", "외대앞", "회기", "청량리", "제기동", "신설동", "동묘앞", "동대문", "종로5가", "종로3가", "종각", "시청", "서울역", "남영", "용산", "노량진", "대방", "신길", "영등포", "신도림", "구로", "구일", "개봉", "오류동", "온수", "역곡", "소사", "부천", "중동", "송내", "부개", "부평", "백운", "동암", "간석", "주안", "도화", "제물포", "도원", "동인천", "인천"] },
  { line: "1호선(경부선)", stations: ["구로", "가산디지털단지", "독산", "금천구청", "석수", "관악", "안양", "명학", "금정", "군포", "당정", "의왕", "성균관대", "화서", "수원", "세류", "병점", "세마", "오산대", "오산", "진위", "송탄", "서정리", "평택지제", "평택", "성환", "직산", "두정", "천안", "봉명", "쌍용", "아산", "배방", "온양온천", "신창"] },
  { line: "2호선", stations: ["시청", "을지로입구", "을지로3가", "을지로4가", "동대문역사문화공원", "신당", "상왕십리", "왕십리", "한양대", "뚝섬", "성수", "건대입구", "구의", "강변", "잠실나루", "잠실", "잠실새내", "종합운동장", "삼성", "선릉", "역삼", "강남", "교대", "서초", "방배", "사당", "낙성대", "서울대입구", "봉천", "신림", "신대방", "구로디지털단지", "대림", "신도림", "문래", "영등포구청", "당산", "합정", "홍대입구", "신촌", "이대", "아현", "충정로", "시청"] },
  { line: "2호선(성수지선)", stations: ["성수", "용답", "신답", "용두", "신설동"] },
  { line: "2호선(신정지선)", stations: ["신도림", "도림천", "양천구청", "신정네거리", "까치산"] },
  { line: "3호선", stations: ["대화", "주엽", "정발산", "마두", "백석", "대곡", "화정", "원당", "원흥", "삼송", "지축", "구파발", "연신내", "불광", "녹번", "홍제", "무악재", "독립문", "경복궁", "안국", "종로3가", "을지로3가", "충무로", "동대입구", "약수", "금호", "옥수", "압구정", "신사", "잠원", "고속터미널", "교대", "남부터미널", "양재", "매봉", "도곡", "대치", "학여울", "대청", "일원", "수서", "가락시장", "경찰병원", "오금"] },
  { line: "4호선", stations: ["진접", "오남", "별내별가람", "당고개", "상계", "노원", "창동", "쌍문", "수유", "미아", "미아사거리", "길음", "성신여대입구", "한성대입구", "혜화", "동대문", "동대문역사문화공원", "충무로", "명동", "회현", "서울역", "숙대입구", "삼각지", "신용산", "이촌", "동작", "총신대입구(이수)", "이수", "사당", "남태령", "선바위", "경마공원", "대공원", "과천", "정부과천청사", "인덕원", "평촌", "범계", "금정", "산본", "수리산", "대야미", "반월", "상록수", "한대앞", "중앙", "고잔", "초지", "안산", "신길온천", "정왕", "오이도"] },
  { line: "5호선", stations: ["방화", "개화산", "김포공항", "송정", "마곡", "발산", "우장산", "화곡", "까치산", "신정", "목동", "오목교", "양평", "영등포구청", "영등포시장", "신길", "여의도", "여의나루", "마포", "공덕", "애오개", "충정로", "서대문", "광화문", "종로3가", "을지로4가", "동대문역사문화공원", "청구", "신금호", "행당", "왕십리", "마장", "답십리", "장한평", "군자", "아차산", "광나루", "천호", "강동", "길동", "굽은다리", "명일", "고덕", "상일동", "강일", "미사", "하남풍산", "하남시청", "하남검단산"] },
  { line: "5호선(마천지선)", stations: ["강동", "둔촌동", "올림픽공원", "방이", "오금", "개롱", "거여", "마천"] },
  { line: "6호선", stations: ["응암", "역촌", "불광", "독바위", "연신내", "구산", "새절", "증산", "디지털미디어시티", "월드컵경기장", "마포구청", "망원", "합정", "상수", "광흥창", "대흥", "공덕", "효창공원앞", "삼각지", "녹사평", "이태원", "한강진", "버티고개", "약수", "청구", "신당", "동묘앞", "창신", "보문", "안암", "고려대", "월곡", "상월곡", "돌곶이", "석계", "태릉입구", "화랑대", "봉화산", "신내"] },
  { line: "7호선", stations: ["장암", "도봉산", "수락산", "마들", "노원", "중계", "하계", "공릉", "태릉입구", "먹골", "중화", "상봉", "면목", "사가정", "용마산", "중곡", "군자", "어린이대공원", "건대입구", "뚝섬유원지", "청담", "강남구청", "학동", "논현", "반포", "고속터미널", "내방", "이수", "남성", "숭실대입구", "상도", "장승배기", "신대방삼거리", "보라매", "신풍", "대림", "남구로", "가산디지털단지", "철산", "광명사거리", "천왕", "온수", "까치울", "부천종합운동장", "춘의", "신중동", "부천시청", "상동", "삼산체육관", "굴포천", "부평구청", "산곡", "석남"] },
  { line: "8호선", stations: ["별내", "다산", "동구릉", "구리", "장자호수공원", "암사역사공원", "암사", "천호", "강동구청", "몽촌토성", "잠실", "석촌", "송파", "가락시장", "문정", "장지", "복정", "남위례", "산성", "남한산성입구", "단대오거리", "신흥", "수진", "모란"] },
  { line: "9호선", stations: ["개화", "김포공항", "공항시장", "신방화", "마곡나루", "양천향교", "가양", "증미", "등촌", "염창", "신목동", "선유도", "당산", "국회의사당", "여의도", "샛강", "노량진", "노들", "흑석", "동작", "구반포", "신반포", "고속터미널", "사평", "신논현", "언주", "선정릉", "삼성중앙", "봉은사", "종합운동장", "삼전", "석촌고분", "석촌", "송파나루", "한성백제", "올림픽공원", "둔촌오륜", "중앙보훈병원"] }
];

// Helper to find lines for a station
const stationToLinesMap = {};
SUBWAY_LINES_DATA.forEach(l => {
    l.stations.forEach(s => {
        const cleaned = cleanName(s);
        if (!stationToLinesMap[cleaned]) stationToLinesMap[cleaned] = new Set();
        stationToLinesMap[cleaned].add(l.line);
    });
});

// 3. Load Train Patterns (Per Line)
const trainRaw = JSON.parse(fs.readFileSync(TRAIN_CONG_FILE, 'utf8'));
const trainPatterns = { "평일": {}, "토요일": {}, "일요일": {} };

trainRaw.DATA.forEach(row => {
    const dayType = row.dow_se; 
    const sName = cleanName(row.dptre_sttn);
    const lineName = row.line; // Use actual line from data
    const dir = (row.up_down_se === '상선' || row.up_down_se === '내선') ? 'upper' : 'lower';
    
    if (!dayType || !sName || !trainPatterns[dayType]) return;
    
    if (!trainPatterns[dayType][lineName]) trainPatterns[dayType][lineName] = {};
    if (!trainPatterns[dayType][lineName][sName]) {
        trainPatterns[dayType][lineName][sName] = { upper: new Array(24).fill(0), lower: new Array(24).fill(0) };
        trainPatterns[dayType][lineName][sName].uCounts = new Array(24).fill(0);
        trainPatterns[dayType][lineName][sName].lCounts = new Array(24).fill(0);
    }
    
    const target = trainPatterns[dayType][lineName][sName];
    const counts = dir === 'upper' ? target.uCounts : target.lCounts;
    const dataArr = dir === 'upper' ? target.upper : target.lower;

    for (let h = 0; h < 24; h++) {
        const hStr = String(h).padStart(2, '0');
        const v1 = row[`time${hStr}00`] || 0;
        const v2 = row[`time${hStr}30`] || 0;
        if (v1 > 0 || v2 > 0) {
            dataArr[h] += (v1 > 0 && v2 > 0) ? (v1 + v2) / 2 : (v1 || v2);
            counts[h]++;
        }
    }
});

for (let type in trainPatterns) {
    for (let line in trainPatterns[type]) {
        for (let s in trainPatterns[type][line]) {
            const entry = trainPatterns[type][line][s];
            for (let h = 0; h < 24; h++) {
                if (entry.uCounts[h] > 0) entry.upper[h] = Math.round(entry.upper[h] / entry.uCounts[h]);
                if (entry.lCounts[h] > 0) entry.lower[h] = Math.round(entry.lower[h] / entry.lCounts[h]);
            }
            delete entry.uCounts; delete entry.lCounts;
        }
    }
}

// 4. Load Usage and Merge
const line9Data = JSON.parse(fs.readFileSync(LINE9_FILE, 'utf8'));
const usageRaw = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
const dailyUsage = {};

function getHourValue(row, h) {
    if (h < 6) return row['hr06_bfr'] / 6 || 0;
    if (h === 6) return row['hr06'] || 0;
    const key = `hr${String(h).padStart(2, '0')}`;
    return row[key] || 0;
}

usageRaw.DATA.forEach(row => {
    const date = row.mvmn_ymd;
    if (!date) return;
    if (!dailyUsage[date]) dailyUsage[date] = {};
    const sName = cleanName(row.sttn);
    if (!dailyUsage[date][sName]) {
        dailyUsage[date][sName] = { inflow: new Array(24).fill(0), outflow: new Array(24).fill(0) };
    }
    const isBoarding = row.gtnf_se.includes('감') || row.gtnf_se.includes('승');
    for (let h = 0; h < 24; h++) {
        const val = getHourValue(row, h);
        if (isBoarding) dailyUsage[date][sName].outflow[h] += val; else dailyUsage[date][sName].inflow[h] += val;
    }
});

const HOLIDAYS = [
    "2023-01-01", "2023-01-21", "2023-01-22", "2023-01-23", "2023-01-24", "2023-03-01", "2023-05-05", "2023-05-27", "2023-06-06", "2023-08-15", "2023-09-28", "2023-09-29", "2023-09-30", "2023-10-03", "2023-10-09", "2023-12-25",
    "2024-01-01", "2024-02-09", "2024-02-10", "2024-02-11", "2024-02-12", "2024-03-01", "2024-04-10", "2024-05-05", "2024-05-06", "2024-05-15", "2024-06-06", "2024-08-15", "2024-09-16", "2024-09-17", "2024-09-18", "2024-10-01", "2024-10-03", "2024-10-09", "2024-12-25"
];

function calculateSimilarStations(current, all) {
    return all.filter(s => s.name !== current.name).map(s => {
        const dot = current.hourly_congestion.reduce((acc, v, i) => acc + v * s.hourly_congestion[i], 0);
        const mag1 = Math.sqrt(current.hourly_congestion.reduce((acc, v) => acc + v * v, 0));
        const mag2 = Math.sqrt(s.hourly_congestion.reduce((acc, v) => acc + v * v, 0));
        const cosine = mag1 && mag2 ? dot / (mag1 * mag2) : 0;
        const vol1 = current.hourly_congestion.reduce((a,b)=>a+b,0), vol2 = s.hourly_congestion.reduce((a,b)=>a+b,0);
        const volRatio = 1 - Math.min(1, Math.abs(vol1 - vol2) / Math.max(vol1, vol2, 1));
        return { name: s.name, score: Math.round((cosine * 0.7 + volRatio * 0.3) * 100) };
    }).sort((a,b) => b.score - a.score).slice(0, 5);
}

const allDates = [];
const years = ['2023', '2024'];
for (const year of years) {
    for (let m = 1; m <= 12; m++) {
        const days = new Date(year, m, 0).getDate();
        for (let d = 1; d <= days; d++) allDates.push(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
}

allDates.forEach(date => {
    const dObj = new Date(date), dayOfWeek = dObj.getDay();
    let type = "평일";
    if (dayOfWeek === 0 || HOLIDAYS.includes(date)) type = "일요일"; else if (dayOfWeek === 6) type = "토요일";
    
    const year = date.substring(0, 4);
    const usageForDay = dailyUsage[date] || {};
    const l9YearData = line9Data[year] || line9Data["2023"];
    
    const stationsList = [];
    const stationsPresent = Object.keys(usageForDay);
    // Include Line 9 names too
    const line9Names = Object.keys(l9YearData).map(cleanName);
    const mergedPresent = new Set([...stationsPresent, ...line9Names]);

    mergedPresent.forEach(sName => {
        const master = masterMap[sName];
        if (!master) return;
        
        let inflow = usageForDay[sName]?.inflow || new Array(24).fill(0);
        let outflow = usageForDay[sName]?.outflow || new Array(24).fill(0);
        
        if (inflow.every(v => v === 0) && l9YearData[sName]) {
            inflow = l9YearData[sName].map(v => v/2);
            outflow = l9YearData[sName].map(v => v/2);
        }

        const hourly_congestion = inflow.map((v, i) => Math.round(v + outflow[i]));
        const hourly_stay = inflow.map((v, i) => Math.round(v - outflow[i]));
        
        // Train Data Map (Line specific)
        const train_data = {};
        const servedLines = stationToLinesMap[sName] || new Set([master.line]);
        servedLines.forEach(ln => {
            const pattern = trainPatterns[type][ln]?.[sName] || { upper: new Array(24).fill(0), lower: new Array(24).fill(0) };
            train_data[ln] = pattern;
        });

        const morningIn = (inflow[7] || 0) + (inflow[8] || 0) + (inflow[9] || 0);
        const morningOut = (outflow[7] || 0) + (outflow[8] || 0) + (outflow[9] || 0);
        let station_type = "Mixed";
        if (morningIn > morningOut * 1.5) station_type = "Business";
        else if (morningOut > morningIn * 1.5) station_type = "Residential";

        stationsList.push({ 
            id: master.id, name: master.name, lines: Array.from(servedLines), 
            x: master.x, y: master.y, hourly_inflow: inflow, hourly_outflow: outflow, 
            hourly_congestion, hourly_stay, train_data, station_type 
        });
    });

    stationsList.forEach(s => { s.similar_stations = calculateSimilarStations(s, stationsList); });

    fs.writeFileSync(path.join(OUTPUT_DIR, `${date}.json`), JSON.stringify({ 
        date, day_type: type, hourly_weather: generateHourlyWeather(date), stations: stationsList 
    }));
});

fs.writeFileSync(path.join(__dirname, 'public', 'date_manifest.json'), JSON.stringify(allDates));

function generateHourlyWeather(dateStr) {
    const date = new Date(dateStr), month = date.getMonth();
    const baseDayTemp = [-2, 1, 7, 13, 19, 23, 25, 26, 19, 12, 6, 0][month] + (Math.sin(date.getDate()) * 5);
    const hourly = [];
    let condition = 'Clear';
    const rand = Math.abs(Math.sin(date.getDate() * 13 + month * 7));
    if (rand > 0.8) condition = 'Rainy'; else if (rand > 0.5) condition = 'Cloudy'; else if (rand > 0.2) condition = 'Sunny';
    for (let h = 0; h < 24; h++) {
        const hourlyVariance = -6 * Math.cos((h - 4) * (Math.PI / 12));
        hourly.push({ temp: Math.round((baseDayTemp + hourlyVariance) * 10) / 10, condition: h >= 19 || h < 6 ? 'Night' : condition });
    }
    return hourly;
}
console.log(`Successfully filtered and merged multi-line data for 2023-2024 (${allDates.length} days).`);
