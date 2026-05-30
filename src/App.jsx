import { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import './App.css';

/**
 * Seoul Subway Population Movement Flow - Professional Analytics
 */
function App() {
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
    const [geoJson, setGeoJson] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const lineColors = {
        "1호선": "#0052A4", "2호선": "#00A84D", "3호선": "#EF7C1C",
        "4호선": "#00A4E3", "5호선": "#996CAC", "6호선": "#CD7C2F",
        "7호선": "#747F00", "8호선": "#E6186C", "9호선": "#BDB092"
    };

    const SUBWAY_LINES = [
      {
        line: "1호선",
        color: "#0052A4",
        stations: [
          { name: "연천", isTransfer: false, transferTo: [] }, { name: "전곡", isTransfer: false, transferTo: [] }, { name: "청산", isTransfer: false, transferTo: [] }, { name: "소요산", isTransfer: false, transferTo: [] }, { name: "동두천", isTransfer: false, transferTo: [] }, { name: "보산", isTransfer: false, transferTo: [] }, { name: "동두천중앙", isTransfer: false, transferTo: [] }, { name: "지행", isTransfer: false, transferTo: [] }, { name: "덕정", isTransfer: false, transferTo: [] }, { name: "덕계", isTransfer: false, transferTo: [] }, { name: "양주", isTransfer: false, transferTo: [] }, { name: "녹양", isTransfer: false, transferTo: [] }, { name: "가능", isTransfer: false, transferTo: [] }, { name: "의정부", isTransfer: false, transferTo: [] }, { name: "회룡", isTransfer: false, transferTo: [] }, { name: "망월사", isTransfer: false, transferTo: [] }, { name: "도봉산", isTransfer: true, transferTo: ["7호선"] }, { name: "도봉", isTransfer: false, transferTo: [] }, { name: "방학", isTransfer: false, transferTo: [] }, { name: "창동", isTransfer: true, transferTo: ["4호선"] }, { name: "녹천", isTransfer: false, transferTo: [] }, { name: "월계", isTransfer: false, transferTo: [] }, { name: "광운대", isTransfer: false, transferTo: [] }, { name: "석계", isTransfer: true, transferTo: ["6호선"] }, { name: "신이문", isTransfer: false, transferTo: [] }, { name: "외대앞", isTransfer: false, transferTo: [] }, { name: "회기", isTransfer: false, transferTo: [] }, { name: "청량리", isTransfer: false, transferTo: [] }, { name: "제기동", isTransfer: false, transferTo: [] }, { name: "신설동", isTransfer: true, transferTo: ["2호선(성수지선)"] }, { name: "동묘앞", isTransfer: true, transferTo: ["6호선"] }, { name: "동대문", isTransfer: true, transferTo: ["4호선"] }, { name: "종로5가", isTransfer: false, transferTo: [] }, { name: "종로3가", isTransfer: true, transferTo: ["3호선", "5호선"] }, { name: "종각", isTransfer: false, transferTo: [] }, { name: "시청", isTransfer: true, transferTo: ["2호선"] }, { name: "서울역", isTransfer: true, transferTo: ["4호선"] }, { name: "남영", isTransfer: false, transferTo: [] }, { name: "용산", isTransfer: false, transferTo: [] }, { name: "노량진", isTransfer: true, transferTo: ["9호선"] }, { name: "대방", isTransfer: false, transferTo: [] }, { name: "신길", isTransfer: true, transferTo: ["5호선"] }, { name: "영등포", isTransfer: false, transferTo: [] }, { name: "신도림", isTransfer: true, transferTo: ["2호선", "2호선(신정지선)"] }, { name: "구로", isTransfer: true, transferTo: ["1호선(경부선)"] }, { name: "구일", isTransfer: false, transferTo: [] }, { name: "개봉", isTransfer: false, transferTo: [] }, { name: "오류동", isTransfer: false, transferTo: [] }, { name: "온수", isTransfer: true, transferTo: ["7호선"] }, { name: "역곡", isTransfer: false, transferTo: [] }, { name: "소사", isTransfer: false, transferTo: [] }, { name: "부천", isTransfer: false, transferTo: [] }, { name: "중동", isTransfer: false, transferTo: [] }, { name: "송내", isTransfer: false, transferTo: [] }, { name: "부개", isTransfer: false, transferTo: [] }, { name: "부평", isTransfer: false, transferTo: [] }, { name: "백운", isTransfer: false, transferTo: [] }, { name: "동암", isTransfer: false, transferTo: [] }, { name: "간석", isTransfer: false, transferTo: [] }, { name: "주안", isTransfer: false, transferTo: [] }, { name: "도화", isTransfer: false, transferTo: [] }, { name: "제물포", isTransfer: false, transferTo: [] }, { name: "도원", isTransfer: false, transferTo: [] }, { name: "동인천", isTransfer: false, transferTo: [] }, { name: "인천", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "1호선(경부선)",
        color: "#0052A4",
        stations: [
          { name: "구로", isTransfer: true, transferTo: ["1호선"] }, { name: "가산디지털단지", isTransfer: true, transferTo: ["7호선"] }, { name: "독산", isTransfer: false, transferTo: [] }, { name: "금천구청", isTransfer: false, transferTo: [] }, { name: "석수", isTransfer: false, transferTo: [] }, { name: "관악", isTransfer: false, transferTo: [] }, { name: "안양", isTransfer: false, transferTo: [] }, { name: "명학", isTransfer: false, transferTo: [] }, { name: "금정", isTransfer: true, transferTo: ["4호선"] }, { name: "군포", isTransfer: false, transferTo: [] }, { name: "당정", isTransfer: false, transferTo: [] }, { name: "의왕", isTransfer: false, transferTo: [] }, { name: "성균관대", isTransfer: false, transferTo: [] }, { name: "화서", isTransfer: false, transferTo: [] }, { name: "수원", isTransfer: false, transferTo: [] }, { name: "세류", isTransfer: false, transferTo: [] }, { name: "병점", isTransfer: false, transferTo: [] }, { name: "세마", isTransfer: false, transferTo: [] }, { name: "오산대", isTransfer: false, transferTo: [] }, { name: "오산", isTransfer: false, transferTo: [] }, { name: "진위", isTransfer: false, transferTo: [] }, { name: "송탄", isTransfer: false, transferTo: [] }, { name: "서정리", isTransfer: false, transferTo: [] }, { name: "평택지제", isTransfer: false, transferTo: [] }, { name: "평택", isTransfer: false, transferTo: [] }, { name: "성환", isTransfer: false, transferTo: [] }, { name: "직산", isTransfer: false, transferTo: [] }, { name: "두정", isTransfer: false, transferTo: [] }, { name: "천안", isTransfer: false, transferTo: [] }, { name: "봉명", isTransfer: false, transferTo: [] }, { name: "쌍용", isTransfer: false, transferTo: [] }, { name: "아산", isTransfer: false, transferTo: [] }, { name: "배방", isTransfer: false, transferTo: [] }, { name: "온양온천", isTransfer: false, transferTo: [] }, { name: "신창", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "2호선",
        color: "#00A84D",
        stations: [
          { name: "시청", isTransfer: true, transferTo: ["1호선"] }, { name: "을지로입구", isTransfer: false, transferTo: [] }, { name: "을지로3가", isTransfer: true, transferTo: ["3호선"] }, { name: "을지로4가", isTransfer: true, transferTo: ["5호선"] }, { name: "동대문역사문화공원", isTransfer: true, transferTo: ["4호선", "5호선"] }, { name: "신당", isTransfer: true, transferTo: ["6호선"] }, { name: "상왕십리", isTransfer: false, transferTo: [] }, { name: "왕십리", isTransfer: true, transferTo: ["5호선"] }, { name: "한양대", isTransfer: false, transferTo: [] }, { name: "뚝섬", isTransfer: false, transferTo: [] }, { name: "성수", isTransfer: true, transferTo: ["2호선(성수지선)"] }, { name: "건대입구", isTransfer: true, transferTo: ["7호선"] }, { name: "구의", isTransfer: false, transferTo: [] }, { name: "강변", isTransfer: false, transferTo: [] }, { name: "잠실나루", isTransfer: false, transferTo: [] }, { name: "잠실", isTransfer: true, transferTo: ["8호선"] }, { name: "잠실새내", isTransfer: false, transferTo: [] }, { name: "종합운동장", isTransfer: true, transferTo: ["9호선"] }, { name: "삼성", isTransfer: false, transferTo: [] }, { name: "선릉", isTransfer: false, transferTo: [] }, { name: "역삼", isTransfer: false, transferTo: [] }, { name: "강남", isTransfer: false, transferTo: [] }, { name: "교대", isTransfer: true, transferTo: ["3호선"] }, { name: "서초", isTransfer: false, transferTo: [] }, { name: "방배", isTransfer: false, transferTo: [] }, { name: "사당", isTransfer: true, transferTo: ["4호선"] }, { name: "낙성대", isTransfer: false, transferTo: [] }, { name: "서울대입구", isTransfer: false, transferTo: [] }, { name: "봉천", isTransfer: false, transferTo: [] }, { name: "신림", isTransfer: false, transferTo: [] }, { name: "신대방", isTransfer: false, transferTo: [] }, { name: "구로디지털단지", isTransfer: false, transferTo: [] }, { name: "대림", isTransfer: true, transferTo: ["7호선"] }, { name: "신도림", isTransfer: true, transferTo: ["1호선", "2호선(신정지선)"] }, { name: "문래", isTransfer: false, transferTo: [] }, { name: "영등포구청", isTransfer: true, transferTo: ["5호선"] }, { name: "당산", isTransfer: true, transferTo: ["9호선"] }, { name: "합정", isTransfer: true, transferTo: ["6호선"] }, { name: "홍대입구", isTransfer: false, transferTo: [] }, { name: "신촌", isTransfer: false, transferTo: [] }, { name: "이대", isTransfer: false, transferTo: [] }, { name: "아현", isTransfer: false, transferTo: [] }, { name: "충정로", isTransfer: true, transferTo: ["5호선"] }, { name: "시청", isTransfer: true, transferTo: ["1호선"] }
        ]
      },
      {
        line: "2호선(성수지선)",
        color: "#00A84D",
        stations: [
          { name: "성수", isTransfer: true, transferTo: ["2호선"] }, { name: "용답", isTransfer: false, transferTo: [] }, { name: "신답", isTransfer: false, transferTo: [] }, { name: "용두", isTransfer: false, transferTo: [] }, { name: "신설동", isTransfer: true, transferTo: ["1호선"] }
        ]
      },
      {
        line: "2호선(신정지선)",
        color: "#00A84D",
        stations: [
          { name: "신도림", isTransfer: true, transferTo: ["1호선", "2호선"] }, { name: "도림천", isTransfer: false, transferTo: [] }, { name: "양천구청", isTransfer: false, transferTo: [] }, { name: "신정네거리", isTransfer: false, transferTo: [] }, { name: "까치산", isTransfer: true, transferTo: ["5호선"] }
        ]
      },
      {
        line: "3호선",
        color: "#EF7C1C",
        stations: [
          { name: "대화", isTransfer: false, transferTo: [] }, { name: "주엽", isTransfer: false, transferTo: [] }, { name: "정발산", isTransfer: false, transferTo: [] }, { name: "마두", isTransfer: false, transferTo: [] }, { name: "백석", isTransfer: false, transferTo: [] }, { name: "대곡", isTransfer: false, transferTo: [] }, { name: "화정", isTransfer: false, transferTo: [] }, { name: "원당", isTransfer: false, transferTo: [] }, { name: "원흥", isTransfer: false, transferTo: [] }, { name: "삼송", isTransfer: false, transferTo: [] }, { name: "지축", isTransfer: false, transferTo: [] }, { name: "구파발", isTransfer: false, transferTo: [] }, { name: "연신내", isTransfer: true, transferTo: ["6호선"] }, { name: "불광", isTransfer: true, transferTo: ["6호선"] }, { name: "녹번", isTransfer: false, transferTo: [] }, { name: "홍제", isTransfer: false, transferTo: [] }, { name: "무악재", isTransfer: false, transferTo: [] }, { name: "독립문", isTransfer: false, transferTo: [] }, { name: "경복궁", isTransfer: false, transferTo: [] }, { name: "안국", isTransfer: false, transferTo: [] }, { name: "종로3가", isTransfer: true, transferTo: ["1호선", "5호선"] }, { name: "을지로3가", isTransfer: true, transferTo: ["2호선"] }, { name: "충무로", isTransfer: true, transferTo: ["4호선"] }, { name: "동대입구", isTransfer: false, transferTo: [] }, { name: "약수", isTransfer: true, transferTo: ["6호선"] }, { name: "금호", isTransfer: false, transferTo: [] }, { name: "옥수", isTransfer: false, transferTo: [] }, { name: "압구정", isTransfer: false, transferTo: [] }, { name: "신사", isTransfer: false, transferTo: [] }, { name: "잠원", isTransfer: false, transferTo: [] }, { name: "고속터미널", isTransfer: true, transferTo: ["7호선", "9호선"] }, { name: "교대", isTransfer: true, transferTo: ["2호선"] }, { name: "남부터미널", isTransfer: false, transferTo: [] }, { name: "양재", isTransfer: false, transferTo: [] }, { name: "매봉", isTransfer: false, transferTo: [] }, { name: "도곡", isTransfer: false, transferTo: [] }, { name: "대치", isTransfer: false, transferTo: [] }, { name: "학여울", isTransfer: false, transferTo: [] }, { name: "대청", isTransfer: false, transferTo: [] }, { name: "일원", isTransfer: false, transferTo: [] }, { name: "수서", isTransfer: false, transferTo: [] }, { name: "가락시장", isTransfer: true, transferTo: ["8호선"] }, { name: "경찰병원", isTransfer: false, transferTo: [] }, { name: "오금", isTransfer: true, transferTo: ["5호선(마천지선)"] }
        ]
      },
      {
        line: "4호선",
        color: "#00A4E3",
        stations: [
          { name: "진접", isTransfer: false, transferTo: [] }, { name: "오남", isTransfer: false, transferTo: [] }, { name: "별내별가람", isTransfer: false, transferTo: [] }, { name: "당고개", isTransfer: false, transferTo: [] }, { name: "상계", isTransfer: false, transferTo: [] }, { name: "노원", isTransfer: true, transferTo: ["7호선"] }, { name: "창동", isTransfer: true, transferTo: ["1호선"] }, { name: "쌍문", isTransfer: false, transferTo: [] }, { name: "수유", isTransfer: false, transferTo: [] }, { name: "미아", isTransfer: false, transferTo: [] }, { name: "미아사거리", isTransfer: false, transferTo: [] }, { name: "길음", isTransfer: false, transferTo: [] }, { name: "성신여대입구", isTransfer: false, transferTo: [] }, { name: "한성대입구", isTransfer: false, transferTo: [] }, { name: "혜화", isTransfer: false, transferTo: [] }, { name: "동대문", isTransfer: true, transferTo: ["1호선"] }, { name: "동대문역사문화공원", isTransfer: true, transferTo: ["2호선", "5호선"] }, { name: "충무로", isTransfer: true, transferTo: ["3호선"] }, { name: "명동", isTransfer: false, transferTo: [] }, { name: "회현", isTransfer: false, transferTo: [] }, { name: "서울역", isTransfer: true, transferTo: ["1호선"] }, { name: "숙대입구", isTransfer: false, transferTo: [] }, { name: "삼각지", isTransfer: true, transferTo: ["6호선"] }, { name: "신용산", isTransfer: false, transferTo: [] }, { name: "이촌", isTransfer: false, transferTo: [] }, { name: "동작", isTransfer: true, transferTo: ["9호선"] }, { name: "이수", isTransfer: true, transferTo: ["7호선"] }, { name: "사당", isTransfer: true, transferTo: ["2호선"] }, { name: "남태령", isTransfer: false, transferTo: [] }, { name: "선바위", isTransfer: false, transferTo: [] }, { name: "경마공원", isTransfer: false, transferTo: [] }, { name: "대공원", isTransfer: false, transferTo: [] }, { name: "과천", isTransfer: false, transferTo: [] }, { name: "정부과천청사", isTransfer: false, transferTo: [] }, { name: "인덕원", isTransfer: false, transferTo: [] }, { name: "평촌", isTransfer: false, transferTo: [] }, { name: "범계", isTransfer: false, transferTo: [] }, { name: "금정", isTransfer: true, transferTo: ["1호선(경부선)"] }, { name: "산본", isTransfer: false, transferTo: [] }, { name: "수리산", isTransfer: false, transferTo: [] }, { name: "대야미", isTransfer: false, transferTo: [] }, { name: "반월", isTransfer: false, transferTo: [] }, { name: "상록수", isTransfer: false, transferTo: [] }, { name: "한대앞", isTransfer: false, transferTo: [] }, { name: "중앙", isTransfer: false, transferTo: [] }, { name: "고잔", isTransfer: false, transferTo: [] }, { name: "초지", isTransfer: false, transferTo: [] }, { name: "안산", isTransfer: false, transferTo: [] }, { name: "신길온천", isTransfer: false, transferTo: [] }, { name: "정왕", isTransfer: false, transferTo: [] }, { name: "오이도", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "5호선",
        color: "#996CAC",
        stations: [
          { name: "방화", isTransfer: false, transferTo: [] }, { name: "개화산", isTransfer: false, transferTo: [] }, { name: "김포공항", isTransfer: true, transferTo: ["9호선"] }, { name: "송정", isTransfer: false, transferTo: [] }, { name: "마곡", isTransfer: false, transferTo: [] }, { name: "발산", isTransfer: false, transferTo: [] }, { name: "우장산", isTransfer: false, transferTo: [] }, { name: "화곡", isTransfer: false, transferTo: [] }, { name: "까치산", isTransfer: true, transferTo: ["2호선(신정지선)"] }, { name: "신정", isTransfer: false, transferTo: [] }, { name: "목동", isTransfer: false, transferTo: [] }, { name: "오목교", isTransfer: false, transferTo: [] }, { name: "양평", isTransfer: false, transferTo: [] }, { name: "영등포구청", isTransfer: true, transferTo: ["2호선"] }, { name: "영등포시장", isTransfer: false, transferTo: [] }, { name: "신길", isTransfer: true, transferTo: ["1호선"] }, { name: "여의도", isTransfer: true, transferTo: ["9호선"] }, { name: "여의나루", isTransfer: false, transferTo: [] }, { name: "마포", isTransfer: false, transferTo: [] }, { name: "공덕", isTransfer: true, transferTo: ["6호선"] }, { name: "애오개", isTransfer: false, transferTo: [] }, { name: "충정로", isTransfer: true, transferTo: ["2호선"] }, { name: "서대문", isTransfer: false, transferTo: [] }, { name: "광화문", isTransfer: false, transferTo: [] }, { name: "종로3가", isTransfer: true, transferTo: ["1호선", "3호선"] }, { name: "을지로4가", isTransfer: true, transferTo: ["2호선"] }, { name: "동대문역사문화공원", isTransfer: true, transferTo: ["2호선", "4호선"] }, { name: "청구", isTransfer: true, transferTo: ["6호선"] }, { name: "신금호", isTransfer: false, transferTo: [] }, { name: "행당", isTransfer: false, transferTo: [] }, { name: "왕십리", isTransfer: true, transferTo: ["2호선"] }, { name: "마장", isTransfer: false, transferTo: [] }, { name: "답십리", isTransfer: false, transferTo: [] }, { name: "장한평", isTransfer: false, transferTo: [] }, { name: "군자", isTransfer: true, transferTo: ["7호선"] }, { name: "아차산", isTransfer: false, transferTo: [] }, { name: "광나루", isTransfer: false, transferTo: [] }, { name: "천호", isTransfer: true, transferTo: ["8호선"] }, { name: "강동", isTransfer: true, transferTo: ["5호선(마천지선)"] }, { name: "길동", isTransfer: false, transferTo: [] }, { name: "굽은다리", isTransfer: false, transferTo: [] }, { name: "명일", isTransfer: false, transferTo: [] }, { name: "고덕", isTransfer: false, transferTo: [] }, { name: "상일동", isTransfer: false, transferTo: [] }, { name: "강일", isTransfer: false, transferTo: [] }, { name: "미사", isTransfer: false, transferTo: [] }, { name: "하남풍산", isTransfer: false, transferTo: [] }, { name: "하남시청", isTransfer: false, transferTo: [] }, { name: "하남검단산", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "5호선(마천지선)",
        color: "#996CAC",
        stations: [
          { name: "강동", isTransfer: true, transferTo: ["5호선"] }, { name: "둔촌동", isTransfer: false, transferTo: [] }, { name: "올림픽공원", isTransfer: true, transferTo: ["9호선"] }, { name: "방이", isTransfer: false, transferTo: [] }, { name: "오금", isTransfer: true, transferTo: ["3호선"] }, { name: "개롱", isTransfer: false, transferTo: [] }, { name: "거여", isTransfer: false, transferTo: [] }, { name: "마천", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "6호선",
        color: "#CD7C2F",
        stations: [
          { name: "응암", isTransfer: false, transferTo: [] }, { name: "역촌", isTransfer: false, transferTo: [] }, { name: "불광", isTransfer: true, transferTo: ["3호선"] }, { name: "독바위", isTransfer: false, transferTo: [] }, { name: "연신내", isTransfer: true, transferTo: ["3호선"] }, { name: "구산", isTransfer: false, transferTo: [] }, { name: "새절", isTransfer: false, transferTo: [] }, { name: "증산", isTransfer: false, transferTo: [] }, { name: "디지털미디어시티", isTransfer: false, transferTo: [] }, { name: "월드컵경기장", isTransfer: false, transferTo: [] }, { name: "마포구청", isTransfer: false, transferTo: [] }, { name: "망원", isTransfer: false, transferTo: [] }, { name: "합정", isTransfer: true, transferTo: ["2호선"] }, { name: "상수", isTransfer: false, transferTo: [] }, { name: "광흥창", isTransfer: false, transferTo: [] }, { name: "대흥", isTransfer: false, transferTo: [] }, { name: "공덕", isTransfer: true, transferTo: ["5호선"] }, { name: "효창공원앞", isTransfer: false, transferTo: [] }, { name: "삼각지", isTransfer: true, transferTo: ["4호선"] }, { name: "녹사평", isTransfer: false, transferTo: [] }, { name: "이태원", isTransfer: false, transferTo: [] }, { name: "한성대입구", isTransfer: false, transferTo: [] }, { name: "한강진", isTransfer: false, transferTo: [] }, { name: "버티고개", isTransfer: false, transferTo: [] }, { name: "약수", isTransfer: true, transferTo: ["3호선"] }, { name: "청구", isTransfer: true, transferTo: ["5호선"] }, { name: "신당", isTransfer: true, transferTo: ["2호선"] }, { name: "동묘앞", isTransfer: true, transferTo: ["1호선"] }, { name: "창신", isTransfer: false, transferTo: [] }, { name: "보문", isTransfer: false, transferTo: [] }, { name: "안암", isTransfer: false, transferTo: [] }, { name: "고려대", isTransfer: false, transferTo: [] }, { name: "월곡", isTransfer: false, transferTo: [] }, { name: "상월곡", isTransfer: false, transferTo: [] }, { name: "돌곶이", isTransfer: false, transferTo: [] }, { name: "석계", isTransfer: true, transferTo: ["1호선"] }, { name: "태릉입구", isTransfer: true, transferTo: ["7호선"] }, { name: "화랑대", isTransfer: false, transferTo: [] }, { name: "봉화산", isTransfer: false, transferTo: [] }, { name: "신내", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "7호선",
        color: "#747F00",
        stations: [
          { name: "장암", isTransfer: false, transferTo: [] }, { name: "도봉산", isTransfer: true, transferTo: ["1호선"] }, { name: "수락산", isTransfer: false, transferTo: [] }, { name: "마들", isTransfer: false, transferTo: [] }, { name: "노원", isTransfer: true, transferTo: ["4호선"] }, { name: "중계", isTransfer: false, transferTo: [] }, { name: "하계", isTransfer: false, transferTo: [] }, { name: "공릉", isTransfer: false, transferTo: [] }, { name: "태릉입구", isTransfer: true, transferTo: ["6호선"] }, { name: "먹골", isTransfer: false, transferTo: [] }, { name: "중화", isTransfer: false, transferTo: [] }, { name: "상봉", isTransfer: false, transferTo: [] }, { name: "면목", isTransfer: false, transferTo: [] }, { name: "사가정", isTransfer: false, transferTo: [] }, { name: "용마산", isTransfer: false, transferTo: [] }, { name: "중곡", isTransfer: false, transferTo: [] }, { name: "군자", isTransfer: true, transferTo: ["5호선"] }, { name: "어린이대공원", isTransfer: false, transferTo: [] }, { name: "건대입구", isTransfer: true, transferTo: ["2호선"] }, { name: "뚝섬유원지", isTransfer: false, transferTo: [] }, { name: "청담", isTransfer: false, transferTo: [] }, { name: "강남구청", isTransfer: false, transferTo: [] }, { name: "학동", isTransfer: false, transferTo: [] }, { name: "논현", isTransfer: false, transferTo: [] }, { name: "반포", isTransfer: false, transferTo: [] }, { name: "고속터미널", isTransfer: true, transferTo: ["3호선", "9호선"] }, { name: "내방", isTransfer: false, transferTo: [] }, { name: "이수", isTransfer: true, transferTo: ["4호선"] }, { name: "남성", isTransfer: false, transferTo: [] }, { name: "숭실대입구", isTransfer: false, transferTo: [] }, { name: "상도", isTransfer: false, transferTo: [] }, { name: "장승배기", isTransfer: false, transferTo: [] }, { name: "신대방삼거리", isTransfer: false, transferTo: [] }, { name: "보라매", isTransfer: false, transferTo: [] }, { name: "신풍", isTransfer: false, transferTo: [] }, { name: "대림", isTransfer: true, transferTo: ["2호선"] }, { name: "남구로", isTransfer: false, transferTo: [] }, { name: "가산디지털단지", isTransfer: true, transferTo: ["1호선(경부선)"] }, { name: "철산", isTransfer: false, transferTo: [] }, { name: "광명사거리", isTransfer: false, transferTo: [] }, { name: "천왕", isTransfer: false, transferTo: [] }, { name: "온수", isTransfer: true, transferTo: ["1호선"] }, { name: "까치울", isTransfer: false, transferTo: [] }, { name: "부천종합운동장", isTransfer: false, transferTo: [] }, { name: "춘의", isTransfer: false, transferTo: [] }, { name: "신중동", isTransfer: false, transferTo: [] }, { name: "부천시청", isTransfer: false, transferTo: [] }, { name: "상동", isTransfer: false, transferTo: [] }, { name: "삼산체육관", isTransfer: false, transferTo: [] }, { name: "굴포천", isTransfer: false, transferTo: [] }, { name: "부평구청", isTransfer: false, transferTo: [] }, { name: "산곡", isTransfer: false, transferTo: [] }, { name: "석남", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "8호선",
        color: "#E6186C",
        stations: [
          { name: "별내", isTransfer: false, transferTo: [] }, { name: "다산", isTransfer: false, transferTo: [] }, { name: "동구릉", isTransfer: false, transferTo: [] }, { name: "구리", isTransfer: false, transferTo: [] }, { name: "장자호수공원", isTransfer: false, transferTo: [] }, { name: "암사역사공원", isTransfer: false, transferTo: [] }, { name: "암사", isTransfer: false, transferTo: [] }, { name: "천호", isTransfer: true, transferTo: ["5호선"] }, { name: "강동구청", isTransfer: false, transferTo: [] }, { name: "몽촌토성", isTransfer: false, transferTo: [] }, { name: "잠실", isTransfer: true, transferTo: ["2호선"] }, { name: "석촌", isTransfer: true, transferTo: ["9호선"] }, { name: "송파", isTransfer: false, transferTo: [] }, { name: "가락시장", isTransfer: true, transferTo: ["3호선"] }, { name: "문정", isTransfer: false, transferTo: [] }, { name: "장지", isTransfer: false, transferTo: [] }, { name: "복정", isTransfer: false, transferTo: [] }, { name: "남위례", isTransfer: false, transferTo: [] }, { name: "산성", isTransfer: false, transferTo: [] }, { name: "남한산성입구", isTransfer: false, transferTo: [] }, { name: "단대오거리", isTransfer: false, transferTo: [] }, { name: "신흥", isTransfer: false, transferTo: [] }, { name: "수진", isTransfer: false, transferTo: [] }, { name: "모란", isTransfer: false, transferTo: [] }
        ]
      },
      {
        line: "9호선",
        color: "#BDB092",
        stations: [
          { name: "개화", isTransfer: false, transferTo: [] }, { name: "김포공항", isTransfer: true, transferTo: ["5호선"] }, { name: "공항시장", isTransfer: false, transferTo: [] }, { name: "신방화", isTransfer: false, transferTo: [] }, { name: "마곡나루", isTransfer: false, transferTo: [] }, { name: "양천향교", isTransfer: false, transferTo: [] }, { name: "가양", isTransfer: false, transferTo: [] }, { name: "증미", isTransfer: false, transferTo: [] }, { name: "등촌", isTransfer: false, transferTo: [] }, { name: "염창", isTransfer: false, transferTo: [] }, { name: "신목동", isTransfer: false, transferTo: [] }, { name: "선유도", isTransfer: false, transferTo: [] }, { name: "당산", isTransfer: true, transferTo: ["2호선"] }, { name: "국회의사당", isTransfer: false, transferTo: [] }, { name: "여의도", isTransfer: true, transferTo: ["5호선"] }, { name: "샛강", isTransfer: false, transferTo: [] }, { name: "노량진", isTransfer: true, transferTo: ["1호선"] }, { name: "노들", isTransfer: false, transferTo: [] }, { name: "흑석", isTransfer: false, transferTo: [] }, { name: "동작", isTransfer: true, transferTo: ["4호선"] }, { name: "구반포", isTransfer: false, transferTo: [] }, { name: "신반포", isTransfer: false, transferTo: [] }, { name: "고속터미널", isTransfer: true, transferTo: ["3호선", "7호선"] }, { name: "사평", isTransfer: false, transferTo: [] }, { name: "신논현", isTransfer: false, transferTo: [] }, { name: "언주", isTransfer: false, transferTo: [] }, { name: "선정릉", isTransfer: false, transferTo: [] }, { name: "삼성중앙", isTransfer: false, transferTo: [] }, { name: "봉은사", isTransfer: false, transferTo: [] }, { name: "종합운동장", isTransfer: true, transferTo: ["2호선"] }, { name: "삼전", isTransfer: false, transferTo: [] }, { name: "석촌고분", isTransfer: false, transferTo: [] }, { name: "석촌", isTransfer: true, transferTo: ["8호선"] }, { name: "송파나루", isTransfer: false, transferTo: [] }, { name: "한성백제", isTransfer: false, transferTo: [] }, { name: "올림픽공원", isTransfer: true, transferTo: ["5호선(마천지선)"] }, { name: "둔촌오륜", isTransfer: false, transferTo: [] }, { name: "중앙보훈병원", isTransfer: false, transferTo: [] }
        ]
      }
    ];

    useEffect(() => {
        fetch('date_manifest.json').then(res => res.json()).then(dates => { setAvailableDates(dates); if (dates.length > 0) setSelectedDate(dates[0]); });
    }, []);

    useEffect(() => {
        fetch('capital_area.geojson').then(res => res.json()).then(data => setGeoJson(data)).catch(() => console.log('No geojson found'));
    }, []);

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
            if (selectedStation) setSelectedStation(ds.find(s => s.name === selectedStation.name) || null);
        });
        const d = new Date(selectedDate); d.setDate(d.getDate() - 7);
        fetch(`daily_data/${d.toISOString().split('T')[0]}.json`).then(res => res.json()).then(prevData => {
            if (selectedStation) setLastWeekStation(prevData.stations.find(s => s.name === selectedStation.name) || null);
        }).catch(() => setLastWeekStation(null));
    }, [selectedDate, selectedStation?.name]);

    const projection = useMemo(() => {
        if (stations.length === 0) return null;
        const featureCollection = {
            type: "FeatureCollection",
            features: stations.map(s => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.x, s.y] } }))
        };
        return d3.geoMercator().fitExtent([[5, 5], [95, 95]], featureCollection);
    }, [stations]);

    const geoPathGenerator = useMemo(() => {
        if (!projection) return null;
        return d3.geoPath().projection(projection);
    }, [projection]);

    const geoPaths = useMemo(() => {
        if (!geoJson || !geoPathGenerator) return null;
        return geoJson.features.map((feature, idx) => {
            return <path key={`geo-${idx}`} d={geoPathGenerator(feature)} fill="#f9fbfc" stroke="#c0c9d1" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />;
        });
    }, [geoJson, geoPathGenerator]);

    const activeLineStationNames = useMemo(() => {
        if (selectedLine === 'All') return null;
        const names = new Set();
        SUBWAY_LINES.forEach(ld => {
            if (ld.line === selectedLine || ld.line.startsWith(selectedLine + '(')) {
                ld.stations.forEach(s => { names.add(s.name.replace(/\(.*\)/g, '').replace(/역$/, '').trim()); });
            }
        });
        return names;
    }, [selectedLine]);

    const subwayPaths = useMemo(() => {
        if (stations.length === 0 || !projection) return [];
        const paths = [];
        const getCoord = (n) => {
            const cleanN = n.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
            const found = stations.find(s => s.name.replace(/\(.*\)/g, '').replace(/역$/, '').trim() === cleanN);
            if (!found) return null;
            const [cx, cy] = projection([found.x, found.y]);
            return { x: cx, y: cy };
        };
        SUBWAY_LINES.forEach(lineInfo => {
            const segments = [];
            for (let i = 0; i < lineInfo.stations.length - 1; i++) {
                const s = getCoord(lineInfo.stations[i].name), e = getCoord(lineInfo.stations[i+1].name);
                if (s && e) segments.push({ x1: s.x, y1: s.y, x2: e.x, y2: e.y });
            }
            if (segments.length > 0) paths.push({ id: lineInfo.line, color: lineInfo.color, segments });
        });
        return paths;
    }, [stations, projection]);

    const handleMouseDown = (e) => { isDragging.current = true; lastMousePos.current = { x: e.clientX, y: e.clientY }; };
    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMousePos.current.x, dy = e.clientY - lastMousePos.current.y;
        const sens = viewBox.w / 800;
        setViewBox(prev => ({ ...prev, x: prev.x - dx * sens, y: prev.y - dy * sens }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { isDragging.current = false; };
    const zoomScale = viewBox.w / 100;
    const handleZoom = (f) => setViewBox(p => {
        const nW = Math.max(5, Math.min(200, p.w * f)), nH = Math.max(5, Math.min(200, p.h * f));
        return { x: p.x + (p.w - nW) / 2, y: p.y + (p.h - nW * (p.h/p.w)) / 2, w: nW, h: nH };
    });
    const resetZoom = () => setViewBox({ x: 0, y: 0, w: 100, h: 100 });

    const getStationStyle = (s) => {
        const sCleanName = s.name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
        const isT = selectedLine === 'All' || (activeLineStationNames && activeLineStationNames.has(sCleanName));
        let r = 1.05, c = "#ccff33"; 
        if (viewMode === 'congestion') {
            const ratio = (s.hourly_congestion?.[currentTime] || 0) / globalDailyMaxCongestion;
            if (ratio > 0.7) c = "#ff4d4d"; else if (ratio > 0.4) c = "#b30000"; else if (ratio > 0.1) c = "#006400"; else c = "#ccff33";
        } else if (viewMode === 'inflowOutflow') {
            const diff = (s.hourly_inflow?.[currentTime] || 0) - (s.hourly_outflow?.[currentTime] || 0);
            c = diff > 0 ? "rgba(230, 85, 13, 0.9)" : "rgba(49, 130, 189, 0.9)";
        } else if (viewMode === 'train') {
            const satArr = Object.values(s.train_data || {}).map(v => Math.max(v.upper[currentTime], v.lower[currentTime]));
            const sat = satArr.length > 0 ? Math.max(...satArr) : 0;
            if (sat > 150) c = "#8e44ad"; else if (sat > 100) c = "#e74c3c"; else if (sat > 50) c = "#e67e22"; else c = "#ccff33";
        } else { 
            if (s.station_type === 'Business') c = "#e67e22"; else if (s.station_type === 'Residential') c = "#2ecc71"; else c = "#95a5a6"; 
        }
        return { radius: r, color: c, opacity: isT ? 1 : 0.05, interactive: isT };
    };

    const maxCurrentRatio = stations.length > 0 ? Math.max(...stations.map(s => (s.hourly_congestion?.[currentTime] || 0) / globalDailyMaxCongestion)) : 0;
    let activeHighlightTier = null;
    if (viewMode === 'congestion') {
        if (maxCurrentRatio > 0.7) activeHighlightTier = 'crowded'; else if (maxCurrentRatio > 0.4) activeHighlightTier = 'moderate';
    }

    const formatNum = (n) => new Intl.NumberFormat().format(Math.round(n));
    const dayInfo = currentDay || { hourly_weather: new Array(24).fill({temp:0, condition:'Clear'}) };
    const currentWeather = dayInfo.hourly_weather[currentTime] || {temp: 0, condition: 'Clear'};

    const getBehavior = (s) => {
        const getF = (h1, h2) => {
            let f = 0;
            for(let i=h1; i<h2; i++) f += (s.hourly_inflow?.[i] || 0) - (s.hourly_outflow?.[i] || 0);
            return f;
        };
        return { morning: getF(9,12) > 0 ? "Inflow" : "Outflow", noon: getF(12,18) > 0 ? "Inflow" : "Outflow", evening: getF(18,24) > 0 ? "Inflow" : "Outflow" };
    };

    const executeSearch = () => {
        if (!searchQuery) return;
        const q = searchQuery.replace(/역$/, '').trim();
        const found = stations.find(s => {
            const cleanS = s.name.replace(/\(.*\)/g, '').replace(/역$/, '').trim();
            return cleanS === q || s.name.includes(q);
        });
        if (found) { setSelectedStation(found); setSearchQuery(''); } else { alert('검색한 역을 찾을 수 없습니다.'); }
    };

    return (
        <div className="app-container">
            <header className="header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <div className="logo-title" style={{ flex: '1' }}><h1>Seoul Subway Population Movement Flow</h1></div>
                <div className="search-wrapper" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
                    <div className="search-container" style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '6px 15px', borderRadius: '20px', border: '2px solid #000' }}>
                        <input type="text" placeholder="역 이름 검색 (예: 강남)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && executeSearch()} style={{ background: 'transparent', border: 'none', color: '#000', outline: 'none', width: '200px', fontSize: '14px' }} />
                        <span style={{ cursor: 'pointer', marginLeft: '8px', color: '#000' }} onClick={executeSearch}>🔍</span>
                    </div>
                </div>
                <div className="header-right" style={{ flex: '1', textAlign: 'right' }}></div>
            </header>
            <main className="main-content">
                <div className="left-section">
                    <div className="control-panel">
                        <div className="input-group"><label>Analysis Date</label><input type="date" value={selectedDate} min="2023-01-01" max="2024-12-31" onChange={e => setSelectedDate(e.target.value)} /></div>
                        <div className="mode-buttons">
                            <button className={viewMode === 'congestion' ? 'active' : ''} onClick={() => setViewMode('congestion')}>Congestion</button>
                            <button className={viewMode === 'inflowOutflow' ? 'active' : ''} onClick={() => setViewMode('inflowOutflow')}>Flow</button>
                            <button className={viewMode === 'stationType' ? 'active' : ''} onClick={() => setViewMode('stationType')}>Type</button>
                            <button className={viewMode === 'train' ? 'active' : ''} onClick={() => setViewMode('train')}>Train</button>
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
                            <svg width="100%" height="100%" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} preserveAspectRatio="xMidYMid meet" onClick={() => setSelectedStation(null)}>
                                <rect x="-1000" y="-1000" width="2000" height="2000" fill="#e4f1fe" />
                                {geoPaths}
                                {subwayPaths.map(p => {
                                    const isVis = selectedLine === 'All' || p.id === selectedLine || p.id.startsWith(selectedLine + '(');
                                    return (<g key={p.id} opacity={isVis ? 0.6 : 0.05}>{p.segments.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={p.color} strokeWidth={0.45 * zoomScale} />)}</g>);
                                })}
                                {stations.map(s => {
                                    if (s.id === hoveredStation?.id || s.id === selectedStation?.id || !projection) return null;
                                    const st = getStationStyle(s); const r = st.radius * zoomScale;
                                    const ratio = (s.hourly_congestion?.[currentTime] || 0) / globalDailyMaxCongestion;
                                    const isAutoHighlighted = viewMode === 'congestion' && ((activeHighlightTier === 'crowded' && ratio > 0.7) || (activeHighlightTier === 'moderate' && ratio > 0.4 && ratio <= 0.7));
                                    const shouldShowLabel = (selectedLine !== 'All' && st.interactive) || isAutoHighlighted;
                                    const [cx, cy] = projection([s.x, s.y]);
                                    return (
                                        <g key={s.id} opacity={st.opacity} style={{ pointerEvents: st.interactive ? 'auto' : 'none' }}>
                                            <circle cx={cx} cy={cy} r={r} fill={st.color} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredStation(s)} onMouseLeave={() => setHoveredStation(null)} onClick={(e) => { e.stopPropagation(); setSelectedStation(s); }} />
                                            {shouldShowLabel && <text x={cx} y={cy - r - (0.5 * zoomScale)} className="station-label" textAnchor="middle" style={{fontSize: `${1.8 * zoomScale}px`, fontWeight: 'bold'}}>{s.name}</text>}
                                        </g>
                                    );
                                })}
                                {[hoveredStation, selectedStation].map((s, i) => {
                                    if (!s || !projection) return null; const st = getStationStyle(s), isS = i === 1;
                                    const r = (isS ? st.radius * 2 : st.radius * 1.5) * zoomScale;
                                    const [cx, cy] = projection([s.x, s.y]);
                                    return (
                                        <g key={`top-${i}`} opacity={1} style={{ pointerEvents: 'auto' }}>
                                            <circle cx={cx} cy={cy} r={r} fill={st.color} stroke="#000" strokeWidth={0.2 * zoomScale} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedStation(s); }} />
                                            <text x={cx} y={cy - r - 1.0 * zoomScale} className="station-label" textAnchor="middle" style={{fontSize: `${1.8 * zoomScale}px`, fontWeight: 'bold'}}>{s.name}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="context-overlay" onClick={e => e.stopPropagation()}>
                                <div className="weather-info">🗓️ {selectedDate} ({String(currentTime).padStart(2, '0')}:00)</div>
                                <div className="weather-info"><span className="icon">{currentWeather.condition === 'Rainy' ? '🌧️' : currentWeather.condition === 'Sunny' ? '☀️' : currentWeather.condition === 'Cloudy' ? '☁️' : currentWeather.condition === 'Night' ? '🌙' : '✨'}</span><span>{currentWeather.temp}°C, {currentWeather.condition}</span></div>
                            </div>
                            <div className="map-legend" onClick={e => e.stopPropagation()}>
                                <span className="legend-title">{viewMode.toUpperCase()} %</span>
                                {viewMode === 'congestion' ? (
                                    <><div className="legend-item"><div className="color-box" style={{backgroundColor: '#ff4d4d'}}></div><span>Crowded (70%+)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#b30000'}}></div><span>Moderate (40~70%)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#006400'}}></div><span>Normal (10~40%)</span></div><div className="legend-item"><div className="color-box" style={{backgroundColor: '#ccff33'}}></div><span>Smooth (0~10%)</span></div></>
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
                                    <div className="meta-row"><strong>LINES</strong> <span>{selectedStation.lines?.join(', ')}</span></div>
                                    <hr/><div className="behavior-item">Morning Flow: {getBehavior(selectedStation).morning}</div>
                                    <div className="behavior-item">Noon Flow: {getBehavior(selectedStation).noon}</div>
                                    <div className="behavior-item">Evening Flow: {getBehavior(selectedStation).evening}</div>
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
                                <div className="station-header"><h3>{selectedStation.name}</h3><span className="type-badge">{selectedStation.station_type}</span></div>
                                <div className="chart-container">
                                    <h4>Hourly Congestion (vs Last Week) (Number of getting on - getting off on the subway)</h4>
                                    <svg viewBox="0 0 350 225" className="chart-svg">
                                        <text x="180" y="215" fontSize="10" fill="#95a5a6" textAnchor="middle">Time (Hour)</text>
                                        <text x="5" y="105" fontSize="10" fill="#95a5a6" textAnchor="middle" transform="rotate(-90 5,105)">Congestion</text>
                                        {(() => {
                                            const data = selectedStation.hourly_congestion || []; const max = globalDailyMaxCongestion; 
                                            const getX = i => 45 + i * (285 / 23); const getY = v => 170 - (v / max) * 130;
                                            const prevData = lastWeekStation?.hourly_congestion;
                                            const ticks = []; const step = max >= 20000 ? 4000 : max >= 10000 ? 2000 : max >= 5000 ? 1000 : 500;
                                            for(let v=0; v<=max; v+=step) ticks.push(v);
                                            if (ticks[ticks.length-1] < max * 0.9) ticks.push(max);
                                            return (<><line x1="45" y1="40" x2="45" y2="170" stroke="#bdc3c7" /><line x1="45" y1="170" x2="330" y2="170" stroke="#bdc3c7" />
                                                {ticks.map(v => (<text key={v} x="40" y={getY(v) + 4} fontSize="8" fill="#7f8c8d" textAnchor="end">{formatNum(v)}</text>))}
                                                {[0, 6, 12, 18, 23].map(h => (<text key={h} x={getX(h)} y="185" fontSize="10" fill="#7f8c8d" textAnchor="middle">{h}h</text>))}
                                                {prevData && <polyline points={prevData.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#bdc3c7" strokeWidth="1" strokeDasharray="3" />}
                                                <polyline points={data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#2c3e50" strokeWidth="2" />
                                                {data.map((v, h) => (<g key={h}><circle cx={getX(h)} cy={getY(v)} r="2.5" fill="#2c3e50" /><rect x={getX(h)-5} y="40" width="10" height="130" fill="transparent" onMouseEnter={() => { const pV = prevData ? prevData[h] : 0; const diffVal = pV > 0 ? ((v-pV)/pV*100).toFixed(1) : 'N/A'; setCongestTooltip({ x: getX(h), y: getY(v), h, val: v, prev: pV, diff: diffVal }); }} onMouseLeave={() => setCongestTooltip(null)} onClick={() => setCurrentTime(h)} style={{cursor:'pointer'}} /></g>))}
                                                <line x1={getX(currentTime)} y1="40" x2={getX(currentTime)} y2="170" stroke="#e74c3c" strokeDasharray="3" />
                                                {congestTooltip && (() => {
                                                    let tX = congestTooltip.x - 65; if (tX < 5) tX = 5; if (tX + 130 > 345) tX = 345 - 130;
                                                    let tY = congestTooltip.y - 85; if (tY < 5) tY = congestTooltip.y + 15;
                                                    return (<g><rect x={tX} y={tY} width="130" height="70" fill="rgba(26,37,47,0.95)" rx="6" /><text x={tX + 10} y={tY + 17} fill="#bdc3c7" fontSize="8">Today ({congestTooltip.h}h):</text><text x={tX + 120} y={tY + 17} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{formatNum(congestTooltip.val)}</text><text x={tX + 10} y={tY + 35} fill="#bdc3c7" fontSize="8">Last Week:</text><text x={tX + 120} y={tY + 35} fill="#fff" fontSize="9" textAnchor="end">{formatNum(congestTooltip.prev)}</text><text x={tX + 10} y={tY + 53} fill="#bdc3c7" fontSize="8">Change:</text><text x={tX + 120} y={tY + 53} fill={congestTooltip.diff !== 'N/A' && parseFloat(congestTooltip.diff) > 0 ? "#ff7675" : "#55efc4"} fontSize="9" fontWeight="bold" textAnchor="end">{congestTooltip.diff}%</text></g>);
                                                })()}
                                            </>);
                                        })()}
                                    </svg>
                                </div>
                                <div className="chart-container">
                                    <h4>Stay Tendency (Number of getting on + getting off on the subway)</h4>
                                    <svg viewBox="0 0 350 225" className="chart-svg">
                                        <text x="180" y="215" fontSize="10" fill="#95a5a6" textAnchor="middle">Time (Hour)</text>
                                        <text x="10" y="105" fontSize="10" fill="#95a5a6" textAnchor="middle" transform="rotate(-90 10,105)">Flow Balance</text>
                                        {(() => {
                                            const data = selectedStation.hourly_stay || []; const maxAbsVal = globalDailyMaxStay; 
                                            const getX = i => 45 + i * (285 / 23); const getY = v => 105 - (v / maxAbsVal) * 65;
                                            const ticks = []; const step = maxAbsVal >= 20000 ? 4000 : maxAbsVal >= 10000 ? 2000 : maxAbsVal >= 5000 ? 1000 : 500;
                                            for(let v = -Math.floor(maxAbsVal/step)*step; v <= maxAbsVal; v += step) ticks.push(v);
                                            return (<><line x1="45" y1="40" x2="45" y2="170" stroke="#bdc3c7" /><line x1="45" y1="105" x2="330" y2="105" stroke="#bdc3c7" strokeDasharray="4" />
                                                {ticks.map(v => (<text key={v} x="40" y={getY(v) + 4} fontSize="8" fill="#7f8c8d" textAnchor="end">{v > 0 ? '+' : ''}{formatNum(v)}</text>))}
                                                {[0, 6, 12, 18, 23].map(h => (<text key={h} x={getX(h)} y="185" fontSize="10" fill="#7f8c8d" textAnchor="middle">{h}h</text>))}
                                                <polyline points={data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#2980b9" strokeWidth="2" />
                                                <line x1={getX(currentTime)} y1="40" x2={getX(currentTime)} y2="170" stroke="#e74c3c" strokeDasharray="3" />
                                                <circle cx={getX(currentTime)} cy={getY(data[currentTime])} r="3" fill="#e74c3c" />
                                                <text x={getX(currentTime) + 4} y={getY(data[currentTime]) - 4} fill="#e74c3c" fontSize="11" fontWeight="bold" textAnchor="start">{data[currentTime] > 0 ? '+' : ''}{formatNum(data[currentTime])}</text>
                                            </>);
                                        })()}
                                    </svg>
                                </div>
                                <div className="chart-container">
                                    <h4>Hourly Temperature vs. Congestion</h4>
                                    <svg viewBox="0 0 350 235" className="chart-svg">
                                        <text x="185" y="225" fontSize="10" fill="#95a5a6" textAnchor="middle">Temperature (°C)</text>
                                        <text x="10" y="110" fontSize="10" fill="#95a5a6" textAnchor="middle" transform="rotate(-90 10,110)">Congestion</text>
                                        {(() => {
                                            const weather = dayInfo.hourly_weather || []; const congs = selectedStation.hourly_congestion || [];
                                            const temps = weather.map(w => w.temp); const minT = Math.min(...temps); const maxT = Math.max(...temps); 
                                            const localMaxC = Math.max(...congs) || 1;
                                            const getX = t => 45 + ((t - minT) / (maxT - minT || 1)) * 285; const getY = c => 180 - (c / localMaxC) * 140;
                                            const ticks = []; const step = localMaxC >= 20000 ? 4000 : localMaxC >= 10000 ? 2000 : localMaxC >= 5000 ? 1000 : 500;
                                            for(let v=0; v<=localMaxC; v+=step) ticks.push(v);
                                            if (ticks[ticks.length-1] < localMaxC * 0.9) ticks.push(localMaxC);
                                            return (<><line x1="45" y1="40" x2="45" y2="180" stroke="#bdc3c7" /><line x1="45" y1="180" x2="330" y2="180" stroke="#bdc3c7" />
                                                {ticks.map(v => (<text key={v} x="40" y={getY(v) + 4} fontSize="8" fill="#7f8c8d" textAnchor="end">{formatNum(v)}</text>))}
                                                {weather.map((w, h) => {
                                                    const sel = h === currentTime;
                                                    return (<g key={h}><circle cx={getX(w.temp)} cy={getY(congs[h])} r={sel ? 5 : 3} fill={sel ? "#e74c3c" : "#3498db"} opacity={sel ? 1 : 0.6} onMouseEnter={() => setScatterTooltip({ x: getX(w.temp), y: getY(congs[h]), h, temp: w.temp, cong: congs[h] })} onMouseLeave={() => setScatterTooltip(null)} />{sel && <text x={getX(w.temp)} y={getY(congs[h]) - 8} fontSize="10" fill="#e74c3c" fontWeight="bold" textAnchor="middle">{h}h</text>}</g>);
                                                })}
                                                {scatterTooltip && (() => {
                                                    let tX = scatterTooltip.x - 55; if (tX < 5) tX = 5; if (tX + 110 > 345) tX = 345 - 110;
                                                    let tY = scatterTooltip.y - 65; if (tY < 5) tY = scatterTooltip.y + 15;
                                                    return (<g><rect x={tX} y={tY} width="110" height="55" fill="rgba(26,37,47,0.95)" rx="6" /><text x={tX + 10} y={tY + 17} fill="#bdc3c7" fontSize="8">Time:</text><text x={tX + 100} y={tY + 17} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{scatterTooltip.h}:00</text><text x={tX + 10} y={tY + 32} fill="#bdc3c7" fontSize="8">Temp:</text><text x={tX + 100} y={tY + 32} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{scatterTooltip.temp.toFixed(1)}°C</text><text x={tX + 10} y={tY + 47} fill="#bdc3c7" fontSize="8">Congest:</text><text x={tX + 100} y={tY + 47} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="end">{formatNum(scatterTooltip.cong)}</text></g>);
                                                })()}
                                                <text x={getX(minT)} y={195} fontSize="9" fill="#7f8c8d" textAnchor="middle">{minT.toFixed(1)}°C</text><text x={getX(maxT)} y={195} fontSize="9" fill="#7f8c8d" textAnchor="middle">{maxT.toFixed(1)}°C</text></>);
                                        })()}
                                    </svg>
                                </div>
                                {Object.keys(selectedStation.train_data || {}).map(ln => (
                                    <div key={ln} className="chart-container">
                                        <h4>Hourly Train Saturation (%) - {ln}</h4>
                                        <div style={{display:'flex', gap:'15px', fontSize:'15px', marginBottom:'10px'}}><span style={{color:'#8e44ad'}}>● Upper/Inner</span> <span style={{color:'#e67e22'}}>● Lower/Outer</span></div>
                                        <svg viewBox="0 0 350 225" className="chart-svg">
                                            <text x="180" y="215" fontSize="10" fill="#95a5a6" textAnchor="middle">Time (Hour)</text>
                                            <text x="10" y="105" fontSize="10" fill="#95a5a6" textAnchor="middle" transform="rotate(-90 10,105)">Saturation (%)</text>
                                            {(() => {
                                                const up = selectedStation.train_data[ln].upper; const lo = selectedStation.train_data[ln].lower;
                                                const getX = i => 45 + i * (285 / 23); const getY = v => 170 - (v / 200) * 130;
                                                const ticks = [0, 50, 100, 150, 200];
                                                return (<><line x1="45" y1="40" x2="45" y2="170" stroke="#bdc3c7" /><line x1="45" y1="170" x2="330" y2="170" stroke="#bdc3c7" /><line x1="45" y1={getY(100)} x2="330" y2={getY(100)} stroke="#fab1a0" strokeDasharray="2" />
                                                    {ticks.map(v => (<text key={v} x="40" y={getY(v) + 4} fontSize="8" fill="#7f8c8d" textAnchor="end">{v}%</text>))}
                                                    {[0, 6, 12, 18, 23].map(h => (<text key={h} x={getX(h)} y="185" fontSize="10" fill="#7f8c8d" textAnchor="middle">{h}h</text>))}
                                                    <polyline points={up.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#8e44ad" strokeWidth="2" /><polyline points={lo.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')} fill="none" stroke="#e67e22" strokeWidth="2" /><circle cx={getX(currentTime)} cy={getY(up[currentTime])} r="2.5" fill="#8e44ad" /><circle cx={getX(currentTime)} cy={getY(lo[currentTime])} r="2.5" fill="#e67e22" /><text x={getX(currentTime)} y={getY(up[currentTime])-7} fill="#8e44ad" fontSize="9" fontWeight="bold" textAnchor="middle">{up[currentTime]}%</text><text x={getX(currentTime)} y={getY(lo[currentTime])+14} fill="#e67e22" fontSize="9" fontWeight="bold" textAnchor="middle">{lo[currentTime]}%</text></>);
                                            })()}
                                        </svg>
                                    </div>
                                ))}
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
