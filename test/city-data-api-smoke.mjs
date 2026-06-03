import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const DEFAULT_AREA = '광화문·덕수궁';
const DEFAULT_TYPE = 'json';
const DEFAULT_START_INDEX = 1;
const DEFAULT_END_INDEX = 5;

const SECTION_HINTS = {
  AREA_NM: '핫스팟 장소명',
  AREA_CD: '핫스팟 코드',
  LIVE_PPLTN_STTS: '실시간 인구현황',
  ROAD_TRAFFIC_STTS: '도로소통현황',
  SUB_STTS: '지하철 실시간 도착 현황',
  BUS_STN_STTS: '버스정류소 현황',
  ACDNT_CNTRL_STTS: '사고/통제 현황',
  SBIKE_STTS: '따릉이 현황',
  WEATHER_STTS: '날씨 현황',
  PARKING_STTS: '주차장 현황',
  CHARGER_STTS: '전기차 충전소 현황',
  EVENT_STTS: '문화행사/이벤트 현황',
  FCST24HOURS: '24시간 예보',
};

function parseArgs(argv) {
  const options = {
    area: process.env.CITY_DATA_AREA || DEFAULT_AREA,
    type: process.env.CITY_DATA_TYPE || DEFAULT_TYPE,
    start: Number(process.env.CITY_DATA_START_INDEX || DEFAULT_START_INDEX),
    end: Number(process.env.CITY_DATA_END_INDEX || DEFAULT_END_INDEX),
    raw: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--area' && argv[i + 1]) options.area = argv[++i];
    else if (arg === '--type' && argv[i + 1]) options.type = argv[++i];
    else if (arg === '--start' && argv[i + 1]) options.start = Number(argv[++i]);
    else if (arg === '--end' && argv[i + 1]) options.end = Number(argv[++i]);
    else if (arg === '--raw') options.raw = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Seoul real-time city data smoke test

Usage:
  node test/city-data-api-smoke.mjs
  node test/city-data-api-smoke.mjs --area 강남역
  CITY_DATA_AREA=서울역 node test/city-data-api-smoke.mjs

Options:
  --area <name-or-code>  장소명 또는 장소코드. 기본값: ${DEFAULT_AREA}
  --type <json|xml>      응답 형식. 기본값: ${DEFAULT_TYPE}
  --start <number>       시작 인덱스. 기본값: ${DEFAULT_START_INDEX}
  --end <number>         종료 인덱스. 기본값: ${DEFAULT_END_INDEX}
  --raw                  JSON 원문을 pretty-print로 함께 출력
`);
}

async function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) return {};

  const text = await readFile(envPath, 'utf8');
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

function buildUrl({ apiKey, type, start, end, area }) {
  return [
    'http://openapi.seoul.go.kr:8088',
    encodeURIComponent(apiKey),
    encodeURIComponent(type),
    'citydata',
    encodeURIComponent(String(start)),
    encodeURIComponent(String(end)),
    encodeURIComponent(area),
  ].join('/');
}

function maskUrl(url, apiKey) {
  return url.replace(encodeURIComponent(apiKey), '<redacted>');
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function shortValue(value, maxLength = 90) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const json = JSON.stringify(value);
  return json.length > maxLength ? `${json.slice(0, maxLength)}...` : json;
}

function describeValue(value, depth = 0, maxDepth = 3) {
  const kind = typeOf(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', length: 0, item: null };
    return {
      type: 'array',
      length: value.length,
      item: describeValue(value[0], depth + 1, maxDepth),
    };
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).slice(0, 12);
    if (depth >= maxDepth) {
      return {
        type: 'object',
        keys: Object.keys(value),
      };
    }

    return {
      type: 'object',
      keys: entries.map(([key, child]) => ({
        key,
        hint: SECTION_HINTS[key],
        ...describeValue(child, depth + 1, maxDepth),
      })),
    };
  }

  return {
    type: kind,
    sample: shortValue(value),
  };
}

function findResult(payload) {
  return payload?.RESULT || payload?.citydata?.RESULT || payload?.CITYDATA?.RESULT || null;
}

function findCityData(payload) {
  if (payload?.citydata?.CITYDATA) return payload.citydata.CITYDATA;
  if (payload?.CITYDATA) return payload.CITYDATA;
  if (payload?.citydata && !payload.citydata.RESULT) return payload.citydata;
  return null;
}

function flattenFields(value, prefix = '', rows = [], depth = 0) {
  if (depth > 4 || rows.length >= 220) return rows;

  const kind = typeOf(value);
  rows.push({
    path: prefix || '<root>',
    type: kind,
    sample: Array.isArray(value)
      ? `length=${value.length}`
      : value && typeof value === 'object'
        ? `keys=${Object.keys(value).slice(0, 10).join(', ')}`
        : shortValue(value),
  });

  if (Array.isArray(value) && value.length > 0) {
    flattenFields(value[0], `${prefix}[]`, rows, depth + 1);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flattenFields(child, prefix ? `${prefix}.${key}` : key, rows, depth + 1);
    }
  }

  return rows;
}

function printSection(title, value) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fileEnv = await loadEnv();
  const apiKey = process.env.CITY_DATA_API_KEY || fileEnv.CITY_DATA_API_KEY;

  if (!apiKey) {
    console.error('CITY_DATA_API_KEY가 없습니다. .env 또는 환경변수에 CITY_DATA_API_KEY를 설정하세요.');
    process.exit(1);
  }

  const url = buildUrl({ ...options, apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  console.log('# Seoul Real-Time City Data API smoke test');
  console.log(`requestUrl=${maskUrl(url, apiKey)}`);
  console.log(`area=${options.area}`);
  console.log(`type=${options.type}`);

  let response;
  let text;
  try {
    response = await fetch(url, { signal: controller.signal });
    text = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  console.log(`httpStatus=${response.status}`);
  console.log(`contentType=${response.headers.get('content-type') || '<none>'}`);
  console.log(`responseBytes=${Buffer.byteLength(text, 'utf8')}`);

  if (options.type.toLowerCase() !== 'json') {
    console.log('\n## XML/Text preview');
    console.log(text.slice(0, 2000));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    console.error('\nJSON 파싱 실패. 응답 앞부분:');
    console.error(text.slice(0, 1000));
    throw error;
  }

  const result = findResult(payload);
  const cityData = findCityData(payload);

  printSection('API result metadata', {
    result,
    topLevelKeys: Object.keys(payload),
    citydataKeys: payload.citydata ? Object.keys(payload.citydata) : null,
    listTotalCount: payload.citydata?.list_total_count ?? payload.list_total_count ?? null,
  });

  if (!cityData) {
    printSection('No CITYDATA block found', describeValue(payload));
    process.exitCode = 1;
    return;
  }

  printSection('CITYDATA overview', {
    type: typeOf(cityData),
    areaName: cityData.AREA_NM,
    areaCode: cityData.AREA_CD,
    keys: Object.keys(cityData).map((key) => ({
      key,
      hint: SECTION_HINTS[key],
      type: typeOf(cityData[key]),
      length: Array.isArray(cityData[key]) ? cityData[key].length : undefined,
      sample: Array.isArray(cityData[key]) ? shortValue(cityData[key][0]) : shortValue(cityData[key]),
    })),
  });

  printSection('Nested schema sample', describeValue(cityData));

  const rows = flattenFields(cityData).map((row) => ({
    path: row.path,
    type: row.type,
    sample: row.sample,
  }));

  console.log('\n## Flattened field catalog');
  console.table(rows.slice(0, 120));

  if (options.raw) {
    printSection('Raw JSON', payload);
  }
}

main().catch((error) => {
  console.error('\nSmoke test failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
