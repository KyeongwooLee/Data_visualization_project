import fs from 'fs';

console.log('Filtering national geojson...');
const geojsonRaw = fs.readFileSync('data/Korea_District/2_대한민국_기초자치단체/대한민국_기초자치단체_경계_2017.geojson', 'utf8');
const geojson = JSON.parse(geojsonRaw);

// 11: Seoul, 28: Incheon, 41: Gyeonggi-do
const filteredFeatures = geojson.features.filter(f => {
    const code = f.properties.SIG_CD;
    return code.startsWith('11') || code.startsWith('28') || code.startsWith('41');
});

geojson.features = filteredFeatures;
fs.writeFileSync('public/capital_area.geojson', JSON.stringify(geojson));
console.log('Successfully saved public/capital_area.geojson with', filteredFeatures.length, 'features.');