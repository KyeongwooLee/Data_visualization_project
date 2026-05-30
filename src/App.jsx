import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

/**
 * Seoul Subway Insight - Final Pro Version
 * Features:
 * - Locked 1-9 Subway Line Data (Preserved)
 * - Screenshot-Matched 3-Line Comparison Tooltip
 * - Absolute scaling & Responsive Pan/Zoom
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

    // 2. Comprehensive Adjacency Data (STRICTLY PRESERVED)
    const lineColors = {
        "1호선": "#0052A4", "2호선": "#00A84D", "3호선": "#EF7C1C",
        "4호선": "#00A4E3", "5호선": "#996CAC", "6호선": "#CD7C2F",
        "7호선": "#747F00", "8호선": "#E6186C", "9호선": "#BDB092"
    };

    const SUBWAY_LINES = [
        { line: "1호선", color: "#0052A4", stations: ["연천", "전곡", "청산", "소요산", "동두천", "보산", "동두천중앙", "지행", "덕정", "덕계", "양주", "녹양", "가능", "의정부", "회룡", "망월사", "도봉산", "도봉", "방학", "창동", "녹천", "월계", "광운대", "석계", "신이문", "외대앞", "회기", "청량리", "제기동", "신설동", "동묘앞", "동대문", "종로5가", "종로3가", "종각", "시청", "서울역", "남영", "용산", "노량진", "대방", "신길", "영등포", "신도림", "구로", "구일", "개봉", "오류동", "온수", "역곡", "소사", "부천", "중동", "송내", "부개", "부평", "백운", "동암", "간석", "주안", "도화", "제물포", "도원", "동인천", "인천"] },
        { line: "1호선(경부선)", color: "#0052A4", stations: ["구로", "가산디지털단지", "독산", "금천구청", "석수", "관악", "안양", "명학", "금정", "군포", "당정", "의왕", "성균관대", "화서", "수원", "세류", "병점", "세마", "오산대", "오산", "진위", "송탄", "서정리", "평택지제", "평택", "성환", "직산", "두정", "천안", "봉명", "쌍용", "아산", "배방", "온양온천", "신창"] },
        { line: "2호선", color: "#00A84D", stations: ["시청", "을지로입구", "을지로3가", "을지로4가", "동대문역사문화공원", "신당", "상왕십리", "왕십리", "한양대", "뚝섬", "성수", "건대입구", "구의", "강변", "잠실나루", "잠실", "잠실새내", "종합운동장", "삼성", "선릉", "역삼", "강남", "교대", "서초", "방배", "사당", "낙성대", "서울대입구", "봉천", "신림", "신대방", "구로디지털단지", "대림", "신도림", "문래", "영등포구청", "당산", "합정", "홍대입구", "신촌", "이대", "아현", "충정로", "시청"] },
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

    // 3. Initial Load
    useEffect(() => {
        fetch('date_manifest.json')
            .then(res => res.json())
            .then(dates => { setAvailableDates(dates); if (dates.length > 0) setSelectedDate(dates[0]); })
            .catch(err => console.error("Manifest Error:", err));
    }, []);

    // 4. Daily Data Fetch + Comparison Data
    useEffect(() => {
        if (!selectedDate) return;
        fetch(`daily_data/${selectedDate}.json`)
            .then(res => res.json())
            .then(dayData => {
                setCurrentDay(dayData);
                const dayStations = dayData.stations || [];
                setStations(dayStations);
                let dayMaxC = 0; let dayMaxS = 0;
                dayStations.forEach(s => {
                    const locMaxC = Math.max(...s.hourly_congestion);
                    const locMaxS = Math.max(...s.hourly_stay.map(Math.abs));
                    if (locMaxC > dayMaxC) dayMaxC = locMaxC;
                    if (locMaxS > dayMaxS) dayMaxS = locMaxS;
                });
                setGlobalDailyMaxCongestion(dayMaxC || 1);
                setGlobalDailyMaxStay(dayMaxS || 1);

                const xs = dayStations.map(d => d.x); const ys = dayStations.map(d => d.y);
                const xMin = Math.min(...xs); const xMax = Math.max(...xs);
                const yMin = Math.min(...ys); const yMax = Math.max(...ys);
                const padX = (xMax - xMin) * 0.05 || 0.01;
                const padY = (yMax - yMin) * 0.05 || 0.01;
                setMapBounds({ minX: xMin - padX, maxX: xMax + padX, minY: yMin - padY, maxY: yMax + padY });

                if (selectedStation) {
                    const updated = dayStations.find(s => s.name === selectedStation.name);
                    setSelectedStation(updated || null);
                }
            })
            .catch(err => console.error("Data Load Error:", err));

        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 7);
        const lastWeekStr = d.toISOString().split('T')[0];
        fetch(`daily_data/${lastWeekStr}.json`)
            .then(res => res.json())
            .then(prevData => {
                if (selectedStation) {
                    const prevStation = prevData.stations.find(s => s.name === selectedStation.name);
                    setLastWeekStation(prevStation || null);
                }
            })
            .catch(() => setLastWeekStation(null));
    }, [selectedDate, selectedStation?.name]);

    // 5. Helpers
    const maxValAtTime = useMemo(() => {
        if (stations.length === 0) return 1;
        let max = 0;
        stations.forEach(s => {
            const isVisible = selectedLine === 'All' || s.line === selectedLine || s.line.startsWith(selectedLine);
            if (!isVisible) return;
            let val = (viewMode === 'congestion') ? (s.hourly_congestion[currentTime] || 0) : Math.abs((s.hourly_inflow[currentTime] || 0) - (s.hourly_outflow[currentTime] || 0));
            if (val > max) max = val;
        });
        return max || 1;
    }, [stations, currentTime, viewMode, selectedLine]);

    const scaleX = (val) => Number((((val - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX || 1)) * 100).toFixed(2));
    const scaleY = (val) => Number((100 - (((val - mapBounds.minY) / (mapBounds.maxY - mapBounds.minY || 1)) * 100)).toFixed(2));

    const subwayPaths = useMemo(() => {
        if (stations.length === 0) return [];
        const paths = [];
        const getCoord = (name) => {
            const clean = name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
            const found = stations.find(s => {
                const sClean = s.name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
                return sClean === clean || s.name === name;
            });
            return found ? { x: scaleX(found.x), y: scaleY(found.y) } : null;
        };
        SUBWAY_LINES.forEach(lineInfo => {
            const segments = [];
            for (let i = 0; i < lineInfo.stations.length - 1; i++) {
                const start = getCoord(lineInfo.stations[i]);
                const end = getCoord(lineInfo.stations[i+1]);
                if (start && end) segments.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
            }
            if (segments.length > 0) paths.push({ id: lineInfo.line, color: lineInfo.color, segments });
        });
        return paths;
    }, [stations, mapBounds]);

    const handleMouseDown = (e) => { isDragging.current = true; lastMousePos.current = { x: e.clientX, y: e.clientY }; };
    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMousePos.current.x; const dy = e.clientY - lastMousePos.current.y;
        const sens = viewBox.w / 800;
        setViewBox(prev => ({ ...prev, x: prev.x - dx * sens, y: prev.y - dy * sens }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { isDragging.current = false; };
    const zoomScale = viewBox.w / 100;
    const handleZoom = (factor) => {
        setViewBox(prev => {
            const newW = Math.max(5, Math.min(200, prev.w * factor));
            const newH = Math.max(5, Math.min(200, prev.h * factor));
            return { x: prev.x + (prev.w - newW) / 2, y: prev.y + (prev.h - newH) / 2, w: newW, h: newH };
        });
    };
    const resetZoom = () => setViewBox({ x: 0, y: 0, w: 100, h: 100 });

    const getStationStyle = (station) => {
        const isTarget = selectedLine === 'All' || station.line === selectedLine || station.line.startsWith(selectedLine);
        let radius = 0.2; let color = "#2ecc71";
        const effMax = globalDailyMaxCongestion; 
        if (viewMode === 'congestion') {
            const val = station.hourly_congestion[currentTime] || 0;
            const ratio = Math.min(1.5, val / effMax);
            radius = (Math.sqrt(ratio) * 1.5) + 0.2;
            if (ratio > 0.7) color = "#e74c3c"; else if (ratio > 0.4) color = "#e67e22"; else if (ratio > 0.1) color = "#3498db";
        } else if (viewMode === 'inflowOutflow') {
            const diff = (station.hourly_inflow[currentTime] || 0) - (station.hourly_outflow[currentTime] || 0);
            const ratio = Math.min(1.5, Math.abs(diff) / globalDailyMaxStay);
            radius = (Math.sqrt(ratio) * 2.0) + 0.2;
            color = diff > 0 ? "rgba(230, 85, 13, 0.8)" : "rgba(49, 130, 189, 0.8)";
        } else {
            radius = 0.3;
            if (station.station_type === 'Business') color = "#e67e22"; else if (station.station_type === 'Residential') color = "#2ecc71"; else color = "#95a5a6";
        }
        return { radius, color, opacity: isTarget ? 1 : 0.05, interactive: isTarget };
    };

    const getBehavior = (s) => {
        const getFlow = (h1, h2) => {
            let flow = 0;
            for(let i=h1; i<h2; i++) flow += (s.hourly_inflow[i] || 0) - (s.hourly_outflow[i] || 0);
            return flow;
        };
        const m = getFlow(9,12), n = getFlow(12,18), e = getFlow(18,24);
        return { morning: m > 0 ? "Inflow" : "Outflow", noon: n > 0 ? "Inflow" : "Outflow", evening: e > 0 ? "Inflow" : "Outflow" };
    };

    const formatNum = (n) => new Intl.NumberFormat().format(Math.round(n));
    const dayInfo = currentDay || { hourly_weather: new Array(24).fill({temp:0, condition:'Clear'}), events: [] };
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
                        <div className="input-group">
                            <label htmlFor="date-select">Analysis Date</label>
                            <input type="date" id="date-select" name="date-select" value={selectedDate} min="2023-01-01" max="2024-12-31" onChange={e => setSelectedDate(e.target.value)} />
                        </div>
                        <div className="mode-selector">
                            <div className="mode-buttons">
                                <button className={viewMode === 'congestion' ? 'active' : ''} onClick={() => setViewMode('congestion')}>📊 Congestion</button>
                                <button className={viewMode === 'inflowOutflow' ? 'active' : ''} onClick={() => setViewMode('inflowOutflow')}>🔁 Flow</button>
                                <button className={viewMode === 'stationType' ? 'active' : ''} onClick={() => setViewMode('stationType')}>🏢 Type</button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="line-filter">
                        <div className={`line-chip ${selectedLine === 'All' ? 'active' : ''}`} onClick={() => setSelectedLine('All')} style={{ backgroundColor: selectedLine === 'All' ? '#2c3e50' : '#fff' }}>ALL</div>
                        {Object.keys(lineColors).map(line => (
                            <div key={line} className={`line-chip ${selectedLine === line ? 'active' : ''}`} onClick={() => setSelectedLine(prev => prev === line ? 'All' : line)}
                                 style={{ backgroundColor: selectedLine === line ? lineColors[line] : '#fff', borderLeft: `4px solid ${lineColors[line]}` }}>{line}</div>
                        ))}
                    </div>

                    <div className="map-view">
                        <div className="map-svg-container" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={() => setSelectedStation(null)}>
                            <div className="zoom-controls" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleZoom(0.7)}>+</button><button onClick={() => handleZoom(1.4)}>-</button><button onClick={resetZoom}>⟲</button>
                            </div>

                            <svg width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} preserveAspectRatio="xMidYMid meet">
                                {subwayPaths.map(path => {
                                    const vis = selectedLine === 'All' || path.id === selectedLine;
                                    return (
                                        <g key={path.id} opacity={vis ? 0.6 : 0.05}>
                                            {path.segments.map((seg, idx) => (
                                                <line key={`${path.id}-${idx}`} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke={path.color} strokeWidth={0.45 * zoomScale} />
                                            ))}
                                        </g>
                                    );
                                })}
                                {stations.map(s => {
                                    if (s.id === hoveredStation?.id || s.id === selectedStation?.id) return null;
                                    const style = getStationStyle(s); const r = style.radius * zoomScale;
                                    return (
                                        <g key={`${s.id}-${s.name}`} opacity={style.opacity} style={{ pointerEvents: style.interactive ? 'auto' : 'none' }}>
                                            <circle cx={scaleX(s.x)} cy={scaleY(s.y)} r={r} fill={style.color} style={{ cursor: 'pointer' }}
                                                    onMouseEnter={() => setHoveredStation(s)} onMouseLeave={() => setHoveredStation(null)}
                                                    onClick={e => { e.stopPropagation(); setSelectedStation(s); }} />
                                            {(selectedLine !== 'All' && style.interactive) && (
                                                <text x={scaleX(s.x)} y={scaleY(s.y) - r - (0.5 * zoomScale)} className="station-label" textAnchor="middle" style={{fontSize: `${1.2 * zoomScale}px`}}>{s.name}</text>
                                            )}
                                        </g>
                                    );
                                })}
                                {[hoveredStation, selectedStation].map((s, idx) => {
                                    if (!s) return null; const style = getStationStyle(s); const isSel = idx === 1;
                                    const currentR = (isSel ? style.radius * 2 : style.radius * 1.5) * zoomScale;
                                    return (
                                        <g key={`top-${s.id}-${idx}`} opacity={1} style={{ pointerEvents: 'auto' }}>
                                            <circle cx={scaleX(s.x)} cy={scaleY(s.y)} r={currentR} fill={style.color} stroke="#000" strokeWidth={0.2 * zoomScale} style={{ cursor: 'pointer' }}
                                                    onMouseEnter={() => !isSel && setHoveredStation(s)} onMouseLeave={() => !isSel && setHoveredStation(null)}
                                                    onClick={e => { e.stopPropagation(); setSelectedStation(s); }} />
                                            <text x={scaleX(s.x)} y={scaleY(s.y) - currentR - (1.0 * zoomScale)} className="station-label" textAnchor="middle" 
                                                  style={{fontSize: `${1.8 * zoomScale}px`, fill: '#000', fontWeight: 'bold'}}>{s.name}</text>
                                        </g>
                                    );
                                })}
                            </svg>

                            <div className="context-overlay" onClick={e => e.stopPropagation()}>
                                <div className="weather-info">🗓️ {selectedDate} ({String(currentTime).padStart(2, '0')}:00)</div>
                                <div className="weather-info">
                                    <span className="icon">{currentWeather.condition === 'Rainy' ? '🌧️' : currentWeather.condition === 'Sunny' ? '☀️' : '☁️'}</span>
                                    <span>{currentWeather.temp}°C, {currentWeather.condition}</span>
                                </div>
                            </div>

                            <div className="map-legend" onClick={e => e.stopPropagation()}>
                                <span className="legend-title">{viewMode.toUpperCase()} %</span>
                                {viewMode === 'congestion' ? (
                                    <>
                                        <div className="legend-item"><div className="color-box" style={{backgroundColor: '#e74c3c'}}></div><span>Crowded (70%+)</span></div>
                                        <div className="legend-item"><div className="color-box" style={{backgroundColor: '#e67e22'}}></div><span>Moderate (40~70%)</span></div>
                                        <div className="legend-item"><div className="color-box" style={{backgroundColor: '#3498db'}}></div><span>Normal (10~40%)</span></div>
                                        <div className="legend-item"><div className="color-box" style={{backgroundColor: '#2ecc71'}}></div><span>Smooth (0~10%)</span></div>
                                    </>
                                ) : viewMode === 'inflowOutflow' ? (
                                    <><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e6550d'}}></div><span>Inflow</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#3182bd'}}></div><span>Outflow</span></div></>
                                ) : (
                                    <><div className="legend-item"><div className="color-box" style={{backgroundColor: '#e67e22'}}></div><span>Business Area</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#2ecc71'}}></div><span>Residential Area</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#95a5a6'}}></div><span>Mixed Zone</span></div></>
                                )}
                            </div>

                            {selectedStation && (
                                <div className="metadata-panel" onClick={e => e.stopPropagation()}>
                                    <div className="meta-row"><strong>STATION</strong> <span>{selectedStation.name}</span></div>
                                    <div className="meta-row"><strong>LOCATION</strong> <span>{selectedStation.y.toFixed(4)}, {selectedStation.x.toFixed(4)}</span></div>
                                    <div className="meta-row"><strong>LINE</strong> <span>{selectedStation.line}</span></div>
                                    <hr/><div className="behavior-item">🕒 Morning Flow: {getBehavior(selectedStation).morning}</div>
                                    <div className="behavior-item">☀️ Noon Flow: {getBehavior(selectedStation).noon}</div>
                                    <div className="behavior-item">🌙 Evening Flow: {getBehavior(selectedStation).evening}</div>
                                </div>
                            )}
                        </div>
                        <div className="time-slider"><div className="time-label">Time: <strong>{currentTime}:00</strong></div><input id="time-range" name="time-range" type="range" min="0" max="23" value={currentTime} onChange={e => setCurrentTime(Number(e.target.value))} /></div>
                    </div>
                </div>

                <div className="right-section" onClick={e => e.stopPropagation()}>
                    <div className="dashboard-panel">
                        {selectedStation ? (
                            <div className="dashboard-content">
                                <div className="station-header"><h3>{selectedStation.name} <span style={{fontSize:'12px', color:'#7f8c8d'}}>{selectedStation.line}</span></h3><span className="type-badge">{selectedStation.station_type}</span></div>
                                
                                <div className="chart-container">
                                    <h4>Hourly Congestion (vs Last Week)</h4>
                                    <svg viewBox="0 0 350 150" className="chart-svg">
                                        <text x="180" y="145" fontSize="10" fill="#95a5a6" textAnchor="middle">Time (Hour)</text>
                                        <text x="10" y="70" fontSize="10" fill="#95a5a6" textAnchor="middle" transform="rotate(-90 10,70)">Congestion</text>
                                        {(() => {
                                            const data = selectedStation.hourly_congestion; const max = globalDailyMaxCongestion; 
                                            const getX = i => 40 + i * (290 / 23); const getY = v => 110 - (v / max) * 80;
                                            const prevData = lastWeekStation?.hourly_congestion;
                                            return (
                                                <>
                                                    <line x1="40" y1="30" x2="40" y2="110" stroke="#bdc3c7" /><line x1="40" y1="110" x2="330" y2="110" stroke="#bdc3c7" />
                                                    <text x="35" y={getY(max) + 4} fontSize="9" fill="#7f8c8d" textAnchor="end">{formatNum(max)}</text>
                                                    <text x="35" y={getY(max*0.75) + 4} fontSize="9" fill="#7f8c8d" textAnchor="end">{formatNum(max*0.75)}</text>
                                                    <text x="35" y={getY(max*0.5) + 4} fontSize="9" fill="#7f8c8d" textAnchor="end">{formatNum(max*0.5)}</text>
                                                    <text x="35" y={getY(max*0.25) + 4} fontSize="9" fill="#7f8c8d" textAnchor="end">{formatNum(max*0.25)}</text>
                                                    <text x="35" y={114} fontSize="9" fill="#7f8c8d" textAnchor="end">0</text>
                                                    {[0, 6, 12, 18, 23].map(h => (<text key={h} x={getX(h)} y="125" fontSize="10" fill="#7f8c8d" textAnchor="middle">{h}h</text>))}
                                                    {prevData && <polyline points={prevData.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#bdc3c7" strokeWidth="1" strokeDasharray="3" />}
                                                    <polyline points={data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#2c3e50" strokeWidth="2" />
                                                    {data.map((v, h) => (
                                                        <g key={h}>
                                                            <circle cx={getX(h)} cy={getY(v)} r="2.5" fill="#2c3e50" />
                                                            <rect x={getX(h)-5} y="30" width="10" height="80" fill="transparent" 
                                                                  onMouseEnter={() => {
                                                                      const pV = prevData ? prevData[h] : 0; 
                                                                      const diffVal = pV > 0 ? ((v-pV)/pV*100).toFixed(1) : 'N/A';
                                                                      setCongestTooltip({ x: getX(h), y: getY(v), h, val: v, prev: pV, diff: diffVal });
                                                                  }} onMouseLeave={() => setCongestTooltip(null)} onClick={() => setCurrentTime(h)} style={{cursor:'pointer'}} />
                                                        </g>
                                                    ))}
                                                    <line x1={getX(currentTime)} y1="30" x2={getX(currentTime)} y2="110" stroke="#e74c3c" strokeDasharray="3" />
                                                    {congestTooltip && (
                                                        <g>
                                                            <rect x={congestTooltip.x-65} y={congestTooltip.y-85} width="130" height="70" fill="rgba(26,37,47,0.95)" rx="6" />
                                                            <text x={congestTooltip.x-55} y={congestTooltip.y-68} fill="#bdc3c7" fontSize="8">Today ({congestTooltip.h}h):</text>
                                                            <text x={congestTooltip.x+55} y={congestTooltip.y-68} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{formatNum(congestTooltip.val)}</text>
                                                            <text x={congestTooltip.x-55} y={congestTooltip.y-50} fill="#bdc3c7" fontSize="8">Last Week:</text>
                                                            <text x={congestTooltip.x+55} y={congestTooltip.y-50} fill="#fff" fontSize="9" textAnchor="end">{formatNum(congestTooltip.prev)}</text>
                                                            <text x={congestTooltip.x-55} y={congestTooltip.y-32} fill="#bdc3c7" fontSize="8">Change:</text>
                                                            <text x={congestTooltip.x+55} y={congestTooltip.y-32} fill={congestTooltip.diff !== 'N/A' && parseFloat(congestTooltip.diff) > 0 ? "#ff7675" : "#55efc4"} fontSize="9" fontWeight="bold" textAnchor="end">
                                                                {congestTooltip.diff !== 'N/A' ? (parseFloat(congestTooltip.diff) > 0 ? '▲' : '▼') : ''} {congestTooltip.diff}%
                                                            </text>
                                                        </g>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                </div>
                                <div className="chart-container">
                                    <h4>Stay Tendency</h4>
                                    <svg viewBox="0 0 350 150" className="chart-svg">
                                        <text x="180" y="145" fontSize="10" fill="#95a5a6" textAnchor="middle">Time (Hour)</text>
                                        <text x="10" y="70" fontSize="10" fill="#95a5a6" textAnchor="middle" transform="rotate(-90 10,70)">Flow Balance</text>
                                        {(() => {
                                            const data = selectedStation.hourly_stay; const maxAbsVal = globalDailyMaxStay; 
                                            const getX = i => 40 + i * (290 / 23); const getY = v => 70 - (v / maxAbsVal) * 40;
                                            return (
                                                <><line x1="40" y1="30" x2="40" y2="110" stroke="#bdc3c7" /><line x1="40" y1="70" x2="330" y2="70" stroke="#bdc3c7" strokeDasharray="4" /><text x="35" y={getY(maxAbsVal) + 4} fontSize="9" fill="#7f8c8d" textAnchor="end">+{formatNum(maxAbsVal)}</text><text x="35" y={74} fontSize="9" fill="#7f8c8d" textAnchor="end">0</text><text x="35" y={getY(-maxAbsVal) + 4} fontSize="9" fill="#7f8c8d" textAnchor="end">-{formatNum(maxAbsVal)}</text>{[0, 6, 12, 18, 23].map(h => (<text key={h} x={getX(h)} y="125" fontSize="10" fill="#7f8c8d" textAnchor="middle">{h}h</text>))}<polyline points={data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#2980b9" strokeWidth="2" /><line x1={getX(currentTime)} y1="30" x2={getX(currentTime)} y2="110" stroke="#e74c3c" strokeDasharray="3" /><circle cx={getX(currentTime)} cy={getY(data[currentTime])} r="3" fill="#e74c3c" /><text x={getX(currentTime)} y={getY(data[currentTime]) - 8} fill="#e74c3c" fontSize="11" fontWeight="bold" textAnchor="middle">{data[currentTime] > 0 ? '+' : ''}{formatNum(data[currentTime])}</text></>
                                            );
                                        })()}
                                    </svg>
                                </div>
                                <div className="chart-container">
                                    <h4>Hourly Temperature vs. Congestion</h4>
                                    <svg viewBox="0 0 350 160" className="chart-svg">
                                        <text x="185" y="155" fontSize="10" fill="#95a5a6" textAnchor="middle">Temperature (°C)</text>
                                        <text x="10" y="75" fontSize="10" fill="#95a5a6" textAnchor="middle" transform="rotate(-90 10,75)">Congestion</text>
                                        {(() => {
                                            const weather = dayInfo.hourly_weather; const congs = selectedStation.hourly_congestion;
                                            const temps = weather.map(w => w.temp); const minT = Math.min(...temps); const maxT = Math.max(...temps); 
                                            const localMaxC = Math.max(...congs) || 1;
                                            const getX = t => 40 + ((t - minT) / (maxT - minT || 1)) * 290; const getY = c => 120 - (c / localMaxC) * 90;
                                            return (
                                                <><line x1="40" y1="30" x2="40" y2="120" stroke="#bdc3c7" /><line x1="40" y1="120" x2="330" y2="120" stroke="#bdc3c7" />
                                                    {weather.map((w, h) => {
                                                        const sel = h === currentTime;
                                                        return (
                                                            <g key={h}>
                                                                <circle cx={getX(w.temp)} cy={getY(congs[h])} r={sel ? 5 : 3} fill={sel ? "#e74c3c" : "#3498db"} opacity={sel ? 1 : 0.6}
                                                                        onMouseEnter={() => setScatterTooltip({ x: getX(w.temp), y: getY(congs[h]), h, temp: w.temp, cong: congs[h] })}
                                                                        onMouseLeave={() => setScatterTooltip(null)} />
                                                                {sel && <text x={getX(w.temp)} y={getY(congs[h]) - 8} fontSize="10" fill="#e74c3c" fontWeight="bold" textAnchor="middle">{h}h</text>}
                                                            </g>
                                                        );
                                                    })}
                                                    {scatterTooltip && (
                                                        <g><rect x={scatterTooltip.x-55} y={scatterTooltip.y-65} width="110" height="55" fill="rgba(26,37,47,0.95)" rx="6" /><text x={scatterTooltip.x-45} y={scatterTooltip.y-48} fill="#bdc3c7" fontSize="8">Time:</text><text x={scatterTooltip.x+45} y={scatterTooltip.y-48} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{scatterTooltip.h}:00</text><text x={scatterTooltip.x-45} y={scatterTooltip.y-33} fill="#bdc3c7" fontSize="8">Temp:</text><text x={scatterTooltip.x+45} y={scatterTooltip.y-33} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{scatterTooltip.temp.toFixed(1)}°C</text><text x={scatterTooltip.x-45} y={scatterTooltip.y-18} fill="#bdc3c7" fontSize="8">Congest:</text><text x={scatterTooltip.x+45} y={scatterTooltip.y-18} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{formatNum(scatterTooltip.cong)}</text></g>
                                                    )}
                                                    <text x={getX(minT)} y={135} fontSize="9" fill="#7f8c8d" textAnchor="middle">{minT.toFixed(1)}°C</text><text x={getX(maxT)} y={135} fontSize="9" fill="#7f8c8d" textAnchor="middle">{maxT.toFixed(1)}°C</text></>
                                            );
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
                        ) : (
                            <div className="empty-selection"><div className="empty-icon">📍</div><p>Select a station on the map</p></div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;