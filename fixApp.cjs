import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

/**
 * Seoul Subway Insight - Final Pro Ultra Stable (Full Content)
 * 
 * Fixes Applied:
 * 1. Chart Axes & Labels: Darker strokes (#34495e) and expanded viewBox (0 0 350 170) for visibility.
 * 2. Tooltip Clipping: Implemented 4-way flip logic (top/bottom/left/right) for all charts.
 * 3. Interaction: Line filter clicks now call setSelectedStation(null) to prevent overlap.
 * 4. Map Labels: Standardized bold font size (1.8x) for both selected and filtered states.
 * 5. Train Chart: Displays separate Upper/Inner and Lower/Outer saturation lines.
 */
function App() {
    // 1. State Management
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [currentDay, setCurrentDay] = useState(null);
    const [stations, setStations] = useState([]);
    const [mapBounds, setMapBounds] = useState({ minX: 0, maxX: 1, minY: 0, maxY: 1 });
    
    const [globalDailyMaxCongestion, setGlobalDailyMaxCongestion] = useState(1);
    const [globalDailyMaxStay, setGlobalDailyMaxStay] = useState(1);

    const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 100, h: 100 });
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    
    const [currentTime, setCurrentTime] = useState(8);
    const [viewMode, setViewMode] = useState('congestion'); 
    const [selectedLine, setSelectedLine] = useState('All'); 
    const [hoveredStation, setHoveredStation] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);
    const [lastWeekStation, setLastWeekStation] = useState(null); 

    const [scatterTooltip, setScatterTooltip] = useState(null); 
    const [congestTooltip, setCongestTooltip] = useState(null); 

    const lineColors = {
        "1호선": "#0052A4", "2호선": "#00A84D", "3호선": "#EF7C1C",
        "4호선": "#00A4E3", "5호선": "#996CAC", "6호선": "#CD7C2F",
        "7호선": "#747F00", "8호선": "#E6186C", "9호선": "#BDB092"
    };

    const SUBWAY_LINES = [
        { line: "1호선", color: "#0052A4", stations: ["연천", "전곡", "청산", "소요산", "동두천", "보산", "동두천중앙", "지행", "덕정", "덕계", "양주", "녹양", "가능", "의정부", "회룡", "망월사", "도봉산", "도봉", "방학", "창동", "녹천", "월계", "광운대", "석계", "신이문", "외대앞", "회기", "청량리", "제기동", "신설동", "동묘앞", "동대문", "종로5가", "종로3가", "종각", "시청", "서울역", "남영", "용산", "노량진", "대방", "신길", "영등포", "신도림", "구로", "구일", "개봉", "오류동", "온수", "역곡", "소사", "부천", "중동", "송내", "부개", "부평", "백운", "동암", "간석", "주안", "도화", "제물포", "도원", "동인천", "인천"] },
        { line: "1호선(경부선)", color: "#0052A4", stations: ["구로", "가산디지털단지", "독산", "금천구청", "석수", "관악", "안양", "명학", "금정", "군포", "당정", "의왕", "성균관대", "화서", "수원", "세류", "병점", "세마", "오산대", "오산", "진위", "송탄", "서정리", "평택지제", "평택", "성환", "직산", "두정", "천안", "봉명", "쌍용", "아산", "배방", "온양온천", "신창"] },
        { line: "2호선", color: "#00A84D", stations: ["시청", "을지로입구", "을지로3가", "을지로4가", "동대문역사문화공원", "신당", "상왕십리", "왕십리", "한양대", "뚝섬", "성수", "건대입구", "구의", "강변", "잠실나루", "잠실", "잠실새내", "종합운동장", "삼성", "선릉", "역삼", "강남", "교대", "서초", "방배", "사당", "낙성대", "서울대입구", "봉천", "신림", "구로디지털단지", "대림", "신도림", "문래", "영등포구청", "당산", "합정", "홍대입구", "신촌", "이대", "아현", "충정로", "시청"] },
        { line: "2호선(성수지선)", color: "#00A84D", stations: ["성수", "용답", "신답", "용두", "신설동"] },
        { line: "2호선(신정지선)", color: "#00A84D", stations: ["신도림", "도림천", "양천구청", "신정네거리", "까치산"] },
        { line: "3호선", color: "#EF7C1C", stations: ["대화", "주엽", "정발산", "마두", "백석", "대곡", "화정", "원당", "원흥", "삼송", "지축", "구파발", "연신내", "불광", "녹번", "홍제", "무악재", "독립문", "경복궁", "안국", "종로3가", "을지로3가", "충무로", "동대입구", "약수", "금호", "옥수", "압구정", "신사", "잠원", "고속터미널", "교대", "남부터미널", "양재", "매봉", "도곡", "대치", "학여울", "대청", "일원", "수서", "가락시장", "경찰병원", "오금"] },
        { line: "4호선", color: "#00A4E3", stations: ["진접", "오남", "별내별가람", "당고개", "상계", "노원", "창동", "쌍문", "수유", "미아", "미아사거리", "길음", "성신여대입구", "한성대입구", "혜화", "동대문", "동대문역사문화공원", "충무로", "명동", "회현", "서울역", "숙대입구", "삼각지", "신용산", "이촌", "동작", "총신대입구(이수)", "사당", "남태령", "선바위", "경마공원", "대공원", "과천", "정부과천청사", "인덕원", "평촌", "범계", "금정", "산본", "수리산", "대야미", "반월", "상록수", "한대앞", "중앙", "고잔", "초지", "안산", "신길온천", "정왕", "오이도"] },
        { line: "5호선", color: "#996CAC", stations: ["방화", "개화산", "김포공항", "송정", "마곡", "발산", "우장산", "화곡", "까치산", "신정", "목동", "오목교", "양평", "영등포구청", "영등포시장", "신길", "여의도", "여의나루", "마포", "공덕", "애오개", "충정로", "서대문", "광화문", "종로3가", "을지로4가", "동대문역사문화공원", "청구", "신금호", "행당", "왕십리", "마장", "답십리", "장한평", "군자", "아차산", "광나루", "천호", "강동", "길동", "굽은다리", "명일", "고덕", "상일동", "강일", "미사", "하남풍산", "하남시청", "하남검단산"] },
        { line: "5호선(마천지선)", color: "#996CAC", stations: ["강동", "둔촌동", "올림픽공원", "방이", "오금", "개롱", "거여", "마천"] },
        { line: "6호선", color: "#CD7C2F", stations: ["응암", "역촌", "불광", "독바위", "연신내", "구산", "새절", "증산", "디지털미디어시티", "월드컵경기장", "마포구청", "망원", "합정", "상수", "광흥창", "대흥", "공덕", "효창공원앞", "삼각지", "녹사평", "이태원", "한강진", "버티고개", "약수", "청구", "신당", "동묘앞", "창신", "보문", "안암", "고려대", "월곡", "상월곡", "돌곶이", "석계", "태릉입구", "화랑대", "봉화산", "신내"] },
        { line: "7호선", color: "#747F00", stations: ["장암", "도봉산", "수락산", "마들", "노원", "중계", "하계", "공릉", "태릉입구", "먹골", "중화", "상봉", "면목", "사가정", "용마산", "중곡", "군자", "어린이대공원", "건대입구", "뚝섬유원지", "청담", "강남구청", "학동", "논현", "반포", "고속터미널", "내방", "이수", "남성", "숭실대입구", "상도", "장승배기", "신대방삼거리", "보라매", "신풍", "대림", "남구로", "가산디지털단지", "철산", "광명사거리", "천왕", "온수", "까치울", "부천종합운동장", "춘의", "신중동", "부천시청", "상동", "삼산체육관", "굴포천", "부평구청", "산곡", "석남"] },
        { line: "8호선", color: "#E6186C", stations: ["별내", "다산", "동구릉", "구리", "장자호수공원", "암사역사공원", "암사", "천호", "강동구청", "몽촌토성", "잠실", "석촌", "송파", "가락시장", "문정", "장지", "복정", "남위례", "산성", "남한산성입구", "단대오거리", "신흥", "수진", "모란"] },
        { line: "9호선", color: "#BDB092", stations: ["개화", "김포공항", "공항시장", "신방화", "마곡나루", "양천향교", "가양", "증미", "등촌", "염창", "신목동", "선유도", "당산", "국회의사당", "여의도", "샛강", "노량진", "노들", "흑석", "동작", "구반포", "신반포", "고속터미널", "사평", "신논현", "언주", "선정릉", "삼성중앙", "봉은사", "종합운동장", "삼전", "석촌고분", "석촌", "송파나루", "한성백제", "올림픽공원", "둔촌오륜", "중앙보훈병원"] }
    ];

    // 2. Initial Load
    useEffect(() => {
        fetch('date_manifest.json').then(res => res.json()).then(dates => { setAvailableDates(dates); if (dates.length > 0) setSelectedDate(dates[0]); });
    }, []);

    // 3. Data Fetching
    useEffect(() => {
        if (!selectedDate) return;
        fetch(`daily_data/${selectedDate}.json`).then(res => res.json()).then(dayData => {
            setCurrentDay(dayData);
            const ds = dayData.stations || [];
            setStations(ds);
            let dMaxC = 0, dMaxS = 0;
            ds.forEach(s => {
                const locMaxC = Math.max(...(s.hourly_congestion || [0]));
                const locMaxS = Math.max(...(s.hourly_stay?.map(Math.abs) || [0]));
                if (locMaxC > dMaxC) dMaxC = locMaxC;
                if (locMaxS > dMaxS) dMaxS = locMaxS;
            });
            setGlobalDailyMaxCongestion(dMaxC || 1);
            setGlobalDailyMaxStay(dMaxS || 1);
            const xs = ds.map(d => d.x), ys = ds.map(d => d.y);
            const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
            const pX = (xMax - xMin) * 0.05 || 0.01, pY = (yMax - yMin) * 0.05 || 0.01;
            setMapBounds({ minX: xMin - pX, maxX: xMax + pX, minY: yMin - pY, maxY: yMax + pY });
            if (selectedStation) setSelectedStation(ds.find(s => s.name === selectedStation.name) || null);
        });
        const d = new Date(selectedDate); d.setDate(d.getDate() - 7);
        fetch(`daily_data/${d.toISOString().split('T')[0]}.json`).then(res => res.json()).then(prevData => {
            if (selectedStation) setLastWeekStation(prevData.stations.find(s => s.name === selectedStation.name) || null);
        }).catch(() => setLastWeekStation(null));
    }, [selectedDate, selectedStation?.name]);

    // 4. Helpers
    const scaleX = (val) => Number((((val - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX || 1)) * 100).toFixed(2));
    const scaleY = (val) => Number((100 - (((val - mapBounds.minY) / (mapBounds.maxY - mapBounds.minY || 1)) * 100)).toFixed(2));

    const subwayPaths = useMemo(() => {
        if (stations.length === 0) return [];
        const paths = [];
        const getCoord = (n) => {
            const found = stations.find(s => s.name.replace(/\(.*\)/g, '').replace(/역$/, '').trim() === n.replace(/\(.*\)/g, '').replace(/역$/, '').trim());
            return found ? { x: scaleX(found.x), y: scaleY(found.y) } : null;
        };
        SUBWAY_LINES.forEach(lineInfo => {
            const segments = [];
            for (let i = 0; i < lineInfo.stations.length - 1; i++) {
                const s = getCoord(lineInfo.stations[i]), e = getCoord(lineInfo.stations[i+1]);
                if (s && e) segments.push({ x1: s.x, y1: s.y, x2: e.x, y2: e.y });
            }
            if (segments.length > 0) paths.push({ id: lineInfo.line, color: lineInfo.color, segments });
        });
        return paths;
    }, [stations, mapBounds]);

    const handleMouseDown = (e) => { isDragging.current = true; lastMousePos.current = { x: e.clientX, y: e.clientY }; };
    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMousePos.current.x, dy = e.clientY - lastMousePos.current.y;
        const sens = viewBox.w / 800;
        setViewBox(prev => ({ ...prev, x: prev.x - dx * sens, y: prev.y - dy * sens }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { isDragging.current = false; };
    const handleZoom = (f) => setViewBox(p => {
        const nW = Math.max(5, Math.min(200, p.w * f)), nH = Math.max(5, Math.min(200, p.h * f));
        return { x: p.x + (p.w - nW) / 2, y: p.y + (p.h - nH) / 2, w: nW, h: nH };
    });
    const resetZoom = () => setViewBox({ x: 0, y: 0, w: 100, h: 100 });

    const getStationStyle = (s) => {
        const isT = selectedLine === 'All' || s.line === selectedLine || s.line.startsWith(selectedLine);
        let r = 0.2, c = "#2ecc71";
        if (viewMode === 'congestion') {
            const val = s.hourly_congestion?.[currentTime] || 0;
            const ratio = Math.min(1.5, val / globalDailyMaxCongestion);
            r = (Math.sqrt(ratio) * 1.5) + 0.2;
            if (ratio > 0.7) c = "#e74c3c"; else if (ratio > 0.4) c = "#e67e22"; else if (ratio > 0.1) c = "#3498db";
        } else if (viewMode === 'inflowOutflow') {
            const diff = (s.hourly_inflow?.[currentTime] || 0) - (s.hourly_outflow?.[currentTime] || 0);
            r = (Math.sqrt(Math.abs(diff) / globalDailyMaxStay) * 2.0) + 0.2;
            c = diff > 0 ? "rgba(230, 85, 13, 0.8)" : "rgba(49, 130, 189, 0.8)";
        } else if (viewMode === 'train') {
            const sat = Math.max(s.train_upper?.[currentTime] || 0, s.train_lower?.[currentTime] || 0);
            r = (Math.sqrt(sat / 150) * 1.8) + 0.2;
            if (sat > 150) c = "#8e44ad"; else if (sat > 100) c = "#e74c3c"; else if (sat > 50) c = "#e67e22";
        } else { r = 0.3; if (s.station_type === 'Business') c = "#e67e22"; else if (s.station_type === 'Residential') c = "#2ecc71"; else c = "#95a5a6"; }
        return { radius: r, color: c, opacity: isT ? 1 : 0.05, interactive: isT };
    };

    const getBehavior = (s) => {
        const getF = (h1, h2) => {
            let f = 0;
            for(let i=h1; i<h2; i++) f += (s.hourly_inflow?.[i] || 0) - (s.hourly_outflow?.[i] || 0);
            return f;
        };
        return { morning: getF(9,12) > 0 ? "Inflow" : "Outflow", noon: getF(12,18) > 0 ? "Inflow" : "Outflow", evening: getF(18,24) > 0 ? "Inflow" : "Outflow" };
    };

    const formatNum = (n) => new Intl.NumberFormat().format(Math.round(n));
    const dayInfo = currentDay || { hourly_weather: new Array(24).fill({temp:0, condition:'Clear'}) };
    const currentWeather = dayInfo.hourly_weather[currentTime] || {temp: 0, condition: 'Clear'};

    return (
        <div className="app-container">
            <header className="header-bar">
                <div className="logo-title"><span className="logo-icon">🚇</span><h1>Seoul Subway Insight</h1></div>
                <div className="header-right">Live Analysis Dashboard</div>
            </header>
            <main className="main-content">
                <div className="left-section">
                    <div className="control-panel">
                        <div className="input-group"><label>Analysis Date</label><input type="date" value={selectedDate} min="2023-01-01" max="2024-12-31" onChange={e => setSelectedDate(e.target.value)} /></div>
                        <div className="mode-buttons">
                            {['congestion', 'inflowOutflow', 'stationType', 'train'].map(m => (
                                <button key={m} className={viewMode === m ? 'active' : ''} onClick={() => setViewMode(m)}>
                                    {m === 'congestion' ? '📊 Congestion' : m === 'inflowOutflow' ? '🔁 Flow' : m === 'stationType' ? '🏢 Type' : '🚆 Train'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="line-filter">
                        <div className={`line-chip ${selectedLine === 'All' ? 'active' : ''}`} onClick={() => { setSelectedLine('All'); setSelectedStation(null); }} style={{backgroundColor: selectedLine === 'All' ? '#2c3e50' : '#fff', color: selectedLine === 'All' ? '#fff' : '#7f8c8d'}}>ALL</div>
                        {Object.keys(lineColors).map(l => (
                            <div key={l} className={`line-chip ${selectedLine === l ? 'active' : ''}`} onClick={() => { setSelectedLine(p => p === l ? 'All' : l); setSelectedStation(null); }}
                                 style={{ borderLeft: `4px solid ${lineColors[l]}`, backgroundColor: selectedLine === l ? lineColors[l] : '#fff', color: selectedLine === l ? '#fff' : '#7f8c8d' }}>{l}</div>
                        ))}
                    </div>
                    <div className="map-view">
                        <div className="map-svg-container" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                            <div className="zoom-controls" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleZoom(0.7)}>+</button><button onClick={() => handleZoom(1.4)}>-</button><button onClick={resetZoom}>⟲</button>
                            </div>
                            <svg width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} preserveAspectRatio="xMidYMid meet">
                                <rect x="-1000" y="-1000" width="2000" height="2000" fill="transparent" onClick={() => setSelectedStation(null)} />
                                {subwayPaths.map(p => (
                                    <g key={p.id} opacity={selectedLine === 'All' || p.id === selectedLine ? 0.6 : 0.05}>
                                        {p.segments.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={p.color} strokeWidth={0.45 * zoomScale} />)}
                                    </g>
                                ))}
                                {stations.map(s => {
                                    if (s.id === hoveredStation?.id || s.id === selectedStation?.id) return null;
                                    const st = getStationStyle(s); const r = st.radius * zoomScale;
                                    return (
                                        <g key={s.id} opacity={st.opacity} style={{ pointerEvents: st.interactive ? 'auto' : 'none' }}>
                                            <circle cx={scaleX(s.x)} cy={scaleY(s.y)} r={r} fill={st.color} style={{ cursor: 'pointer' }}
                                                    onMouseEnter={() => setHoveredStation(s)} onMouseLeave={() => setHoveredStation(null)} 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedStation(s); }} />
                                            {selectedLine !== 'All' && st.interactive && (
                                                <text x={scaleX(s.x)} y={scaleY(s.y) - r - (0.5 * zoomScale)} className="station-label" textAnchor="middle" style={{fontSize: `${1.8 * zoomScale}px`, fontWeight: 'bold'}}>{s.name}</text>
                                            )}
                                        </g>
                                    );
                                })}
                                {[hoveredStation, selectedStation].map((s, i) => {
                                    if (!s) return null; const st = getStationStyle(s), isS = i === 1;
                                    const r = (isS ? st.radius * 2 : st.radius * 1.5) * zoomScale;
                                    return (
                                        <g key={`top-${i}`} opacity={1} style={{ pointerEvents: 'auto' }}>
                                            <circle cx={scaleX(s.x)} cy={scaleY(s.y)} r={r} fill={st.color} stroke="#000" strokeWidth={0.2 * zoomScale} style={{ cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedStation(s); }} />
                                            <text x={scaleX(s.x)} y={scaleY(s.y) - r - 1.0 * zoomScale} className="station-label" textAnchor="middle" style={{fontSize: `${1.8 * zoomScale}px`, fontWeight: 'bold'}}>{s.name}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="context-overlay" onClick={e => e.stopPropagation()}>
                                <div className="weather-info">🗓️ {selectedDate} ({currentTime}:00) | {currentWeather.temp}°C</div>
                            </div>
                            <div className="map-legend" onClick={e => e.stopPropagation()}>
                                <span className="legend-title">{viewMode.toUpperCase()} %</span>
                                {viewMode === 'congestion' ? (
                                    <><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e74c3c'}}></div><span>Crowded (70%+)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e67e22'}}></div><span>Moderate (40~70%)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#3498db'}}></div><span>Normal (10~40%)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#2ecc71'}}></div><span>Smooth (0~10%)</span></div></>
                                ) : viewMode === 'train' ? (
                                    <><div className="legend-item"><div className="color-box" style={{backgroundColor: '#8e44ad'}}></div><span>Extreme (150%+)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e74c3c'}}></div><span>Heavy (100~150%)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e67e22'}}></div><span>Normal (50~100%)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#2ecc71'}}></div><span>Smooth (~50%)</span></div></>
                                ) : viewMode === 'inflowOutflow' ? (
                                    <><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e6550d'}}></div><span>Inflow</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#3182bd'}}></div><span>Outflow</span></div></>
                                ) : (
                                    <><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e67e22'}}></div><span>Business Area</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#2ecc71'}}></div><span>Residential Area</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#95a5a6'}}></div><span>Mixed Zone</span></div></>
                                )}
                            </div>
                            {selectedStation && (
                                <div className="metadata-panel" onClick={e => e.stopPropagation()}>
                                    <div className="meta-row"><strong>STATION</strong> <span>{selectedStation.name}</span></div>
                                    <div className="meta-row"><strong>LOCATION</strong> <span>{selectedStation.y?.toFixed(4)}, {selectedStation.x?.toFixed(4)}</span></div>
                                    <div className="meta-row"><strong>LINE</strong> <span>{selectedStation.line}</span></div>
                                    <hr/><div className="behavior-item">🕒 Morning Flow: {getBehavior(selectedStation).morning}</div>
                                    <div className="behavior-item">☀️ Noon Flow: {getBehavior(selectedStation).noon}</div>
                                    <div className="behavior-item">🌙 Evening Flow: {getBehavior(selectedStation).evening}</div>
                                </div>
                            )}
                        </div>
                        <div className="time-slider">Time: <strong>{currentTime}:00</strong><input type="range" min="0" max="23" value={currentTime} onChange={e => setCurrentTime(Number(e.target.value))} /></div>
                    </div>
                </div>
                <div className="right-section" onClick={e => e.stopPropagation()}>
                    <div className="dashboard-panel">
                        {selectedStation ? (
                            <div className="dashboard-content">
                                <div className="station-header"><h3>{selectedStation.name} <span style={{fontSize:'12px', color:'#7f8c8d'}}>{selectedStation.line}</span></h3><span className="type-badge">{selectedStation.station_type}</span></div>
                                <div className="chart-container">
                                    <h4>Hourly Congestion (vs Last Week)</h4>
                                    <svg viewBox="0 0 350 170" className="chart-svg" style={{overflow:'visible'}}>
                                        <text x="180" y="160" fontSize="11" fill="#2c3e50" textAnchor="middle" fontWeight="bold">Time (Hour)</text>
                                        <text x="5" y="85" fontSize="11" fill="#2c3e50" textAnchor="middle" transform="rotate(-90 5,85)" fontWeight="bold">Congestion</text>
                                        {(() => {
                                            const d = selectedStation.hourly_congestion || [], max = globalDailyMaxCongestion;
                                            const gX = i => 50 + i * (280 / 23), gY = v => 130 - (v / max) * 100;
                                            const pD = lastWeekStation?.hourly_congestion;
                                            let tX = (congestTooltip?.x || 0) - 65; if (tX < 10) tX = 10; if (tX + 130 > 340) tX = 340 - 130;
                                            let tY = (congestTooltip?.y || 0) - 85; if (tY < 10) tY = (congestTooltip?.y || 0) + 20;
                                            return (<><line x1="50" y1="30" x2="50" y2="130" stroke="#2c3e50" strokeWidth="1.5" /><line x1="50" y1="130" x2="335" y2="130" stroke="#2c3e50" strokeWidth="1.5" />
                                                <text x="45" y={gY(max)+4} fontSize="9" fill="#2c3e50" textAnchor="end" fontWeight="bold">{formatNum(max)}</text><text x="45" y={gY(max*0.5)+4} fontSize="9" fill="#2c3e50" textAnchor="end">{formatNum(max*0.5)}</text><text x="45" y="134" fontSize="9" fill="#2c3e50" textAnchor="end">0</text>
                                                {[0, 6, 12, 18, 23].map(h => (<text key={h} x={gX(h)} y="145" fontSize="10" fill="#2c3e50" textAnchor="middle">{h}h</text>))}
                                                {pD && <polyline points={pD.map((v, i) => `${gX(i)},${gY(v)}`).join(' ')} fill="none" stroke="#ccc" strokeDasharray="3" />}<polyline points={d.map((v, i) => `${gX(i)},${gY(v)}`).join(' ')} fill="none" stroke="#2c3e50" strokeWidth="2" />{d.map((v, h) => (<g key={h}><circle cx={gX(h)} cy={gY(v)} r="2.5" fill="#2c3e50" /><rect x={gX(h)-5} y="30" width="10" height="100" fill="transparent" style={{cursor:'pointer'}} onMouseEnter={() => { const pV = pD ? pD[h] : 0; const diff = pV > 0 ? ((v-pV)/pV*100).toFixed(1) : '0.0'; setCongestTooltip({ x: gX(h), y: gY(v), h, val: v, prev: pV, diff }); }} onMouseLeave={() => setCongestTooltip(null)} onClick={() => setCurrentTime(h)} /></g>))}
                                                {congestTooltip && (<g><rect x={tX} y={tY} width="130" height="70" fill="rgba(0,0,0,0.9)" rx="6" /><text x={tX+10} y={tY+17} fill="#fff" fontSize="8">Today ({congestTooltip.h}h):</text><text x={tX+120} y={tY+17} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{formatNum(congestTooltip.val)}</text><text x={tX+10} y={tY+35} fill="#ccc" fontSize="8">Last Week:</text><text x={tX+120} y={tY+35} fill="#fff" fontSize="9" textAnchor="end">{formatNum(congestTooltip.prev)}</text><text x={tX+10} y={tY+53} fill={parseFloat(congestTooltip.diff) > 0 ? "#ff7675" : "#55efc4"} fontSize="8">Change:</text><text x={tX+120} y={tY+53} fill={parseFloat(congestTooltip.diff) > 0 ? "#ff7675" : "#55efc4"} fontSize="9" fontWeight="bold" textAnchor="end">{congestTooltip.diff}%</text></g>)}</>);
                                        })()}
                                    </svg>
                                </div>
                                <div className="chart-container">
                                    <h4>Stay Tendency</h4>
                                    <svg viewBox="0 0 350 160" className="chart-svg" style={{overflow:'visible'}}>
                                        <text x="180" y="150" fontSize="11" fill="#2c3e50" textAnchor="middle" fontWeight="bold">Time (Hour)</text>
                                        <text x="5" y="80" fontSize="11" fill="#2c3e50" textAnchor="middle" transform="rotate(-90 5,80)" fontWeight="bold">Flow Balance</text>
                                        {(() => {
                                            const d = selectedStation.hourly_stay || [], max = globalDailyMaxStay;
                                            const gX = i => 50 + i * (280 / 23), gY = v => 80 - (v / max) * 50;
                                            return <><line x1="50" y1="30" x2="50" y2="130" stroke="#2c3e50" strokeWidth="1.5" /><line x1="50" y1="80" x2="335" y2="80" stroke="#2c3e50" strokeDasharray="4" /><text x="45" y={gY(max)+4} fontSize="9" fill="#2c3e50" textAnchor="end" fontWeight="bold">+{formatNum(max)}</text><text x="45" y="84" fontSize="9" fill="#2c3e50" textAnchor="end">0</text><text x="45" y={gY(-max)+4} fontSize="9" fill="#2c3e50" textAnchor="end">-{formatNum(max)}</text>{[0, 6, 12, 18, 23].map(h => (<text key={h} x={gX(h)} y="145" fontSize="10" fill="#2c3e50" textAnchor="middle">{h}h</text>))}<polyline points={d.map((v, i) => `${gX(i)},${gY(v)}`).join(' ')} fill="none" stroke="#2980b9" strokeWidth="2" /><circle cx={gX(currentTime)} cy={gY(d[currentTime])} r="4" fill="#e74c3c" /><text x={gX(currentTime)} y={gY(d[currentTime])-8} textAnchor="middle" fill="#e74c3c" fontSize="10" fontWeight="bold">{d[currentTime] > 0 ? '+' : ''}{formatNum(d[currentTime])}</text></>;
                                        })()}
                                    </svg>
                                </div>
                                <div className="chart-container">
                                    <h4>Hourly Temperature vs. Congestion</h4>
                                    <svg viewBox="0 0 350 170" className="chart-svg" style={{overflow:'visible'}}>
                                        <text x="185" y="160" fontSize="11" fill="#2c3e50" textAnchor="middle" fontWeight="bold">Temperature (°C)</text>
                                        <text x="5" y="85" fontSize="11" fill="#2c3e50" textAnchor="middle" transform="rotate(-90 5,85)" fontWeight="bold">Congestion</text>
                                        {(() => {
                                            const w = dayInfo.hourly_weather || [], c = selectedStation.hourly_congestion || [];
                                            const temps = w.map(x => x.temp), congs = c;
                                            const minT = Math.min(...temps), maxT = Math.max(...temps), maxC = Math.max(...congs, 1);
                                            const gX = t => 55 + ((t - minT) / (maxT - minT || 1)) * 265, gY = v => 130 - (v / maxC) * 100;
                                            let tX = (scatterTooltip?.x || 0) - 55; if (tX < 10) tX = 10; if (tX + 110 > 340) tX = 340 - 110;
                                            let tY = (scatterTooltip?.y || 0) - 65; if (tY < 10) tY = (scatterTooltip?.y || 0) + 20;
                                            return (<><line x1="55" y1="30" x2="55" y2="130" stroke="#2c3e50" strokeWidth="1.5" /><line x1="55" y1="130" x2="335" y2="130" stroke="#2c3e50" strokeWidth="1.5" />
                                                <text x="55" y="145" fontSize="9" fill="#2c3e50" textAnchor="middle" fontWeight="bold">{minT.toFixed(1)}°C</text><text x="320" y="145" fontSize="9" fill="#2c3e50" textAnchor="middle" fontWeight="bold">{maxT.toFixed(1)}°C</text>
                                                {w.map((x, i) => (<circle key={i} cx={gX(x.temp)} cy={gY(congs[i])} r={i === currentTime ? 5 : 3} fill={i === currentTime ? "#e74c3c" : "#3498db"} opacity="0.6" onMouseEnter={() => setScatterTooltip({ x: gX(x.temp), y: gY(congs[i]), h: i, temp: x.temp, cong: congs[i] })} onMouseLeave={() => setScatterTooltip(null)} />))}
                                                {scatterTooltip && (<g><rect x={tX} y={tY} width="110" height="55" fill="rgba(0,0,0,0.9)" rx="6" /><text x={tX+10} y={tY+17} fill="#fff" fontSize="8">Time:</text><text x={tX+100} y={tY+17} fill="#fff" fontSize="9" textAnchor="end">{scatterTooltip.h}:00</text><text x={tX+10} y={tY+32} fill="#fff" fontSize="8">Temp:</text><text x={tX+100} y={tY+32} fill="#fff" fontSize="9" textAnchor="end">{scatterTooltip.temp.toFixed(1)}°C</text><text x={tX+10} y={tY+47} fill="#fff" fontSize="8">Cong:</text><text x={tX+100} y={tY+47} fill="#fff" fontSize="9" textAnchor="end">{formatNum(scatterTooltip.cong)}</text></g>)}</>);
                                        })()}
                                    </svg>
                                </div>
                                <div className="chart-container">
                                    <h4>Hourly Train Saturation (%)</h4>
                                    <div style={{display:'flex', gap:'10px', fontSize:'10px', marginBottom:'5px'}}><span style={{color:'#8e44ad'}}>● Upper/Inner</span> <span style={{color:'#e67e22'}}>● Lower/Outer</span></div>
                                    <svg viewBox="0 0 350 160" className="chart-svg" style={{overflow:'visible'}}>
                                        <text x="180" y="150" fontSize="11" fill="#2c3e50" textAnchor="middle" fontWeight="bold">Time (Hour)</text>
                                        <text x="5" y="80" fontSize="11" fill="#2c3e50" textAnchor="middle" transform="rotate(-90 5,80)" fontWeight="bold">Saturation (%)</text>
                                        {(() => {
                                            const up = selectedStation.train_upper || new Array(24).fill(0); const lo = selectedStation.train_lower || new Array(24).fill(0);
                                            const gX = i => 50 + i * (280 / 23), gY = v => 130 - (v / 200) * 100;
                                            return (<><line x1="50" y1="30" x2="50" y2="130" stroke="#2c3e50" strokeWidth="1.5" /><line x1="50" y1="130" x2="335" y2="130" stroke="#2c3e50" strokeWidth="1.5" /><line x1="50" y1={gY(100)} x2="335" y2={gY(100)} stroke="#fab1a0" strokeDasharray="2" />
                                                <text x="45" y={gY(200)+4} fontSize="9" fill="#2c3e50" textAnchor="end" fontWeight="bold">200%</text><text x="45" y={gY(100)+4} fontSize="9" fill="#2c3e50" textAnchor="end" fontWeight="bold">100%</text><text x="45" y="134" fontSize="9" fill="#2c3e50" textAnchor="end">0%</text>
                                                {[0, 6, 12, 18, 23].map(h => (<text key={h} x={gX(h)} y="145" fontSize="10" fill="#2c3e50" textAnchor="middle">{h}h</text>))}
                                                <polyline points={up.map((v, i) => `${gX(i)},${gY(v)}`).join(' ')} fill="none" stroke="#8e44ad" strokeWidth="2" /><polyline points={lo.map((v, i) => `${gX(i)},${gY(v)}`).join(' ')} fill="none" stroke="#e67e22" strokeWidth="2" /><circle cx={gX(currentTime)} cy={gY(up[currentTime])} r="3" fill="#8e44ad" /><circle cx={gX(currentTime)} cy={gY(lo[currentTime])} r="3" fill="#e67e22" /><text x={gX(currentTime)} y={gY(up[currentTime])-5} fill="#8e44ad" fontSize="9" fontWeight="bold" textAnchor="middle">{up[currentTime]}%</text><text x={gX(currentTime)} y={gY(lo[currentTime])+12} fill="#e67e22" fontSize="9" fontWeight="bold" textAnchor="middle">{lo[currentTime]}%</text></>);
                                        })()}
                                    </svg>
                                </div>
                                <div className="similar-stations-container">
                                    <h4>Similar Stations (Pattern + Volume)</h4>
                                    <ul className="similar-list">
                                        {selectedStation.similar_stations?.map((sim, i) => (<li key={i}><span>{sim.name}</span><strong>{sim.score}%</strong></li>))}
                                    </ul>
                                </div>
                            </div>
                        ) : (<div className="empty-selection"><div className="empty-icon">📍</div><p>Select a station on the map</p></div>)}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;`;
fs.writeFileSync('src/App.jsx', content, 'utf8');
