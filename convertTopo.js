import fs from 'fs';
import * as topojson from 'topojson-client';

console.log('Converting TopoJSON to High-Res GeoJSON...');
const topoRaw = fs.readFileSync('data/Korea_District/2_대한민국_기초자치단체/대한민국_기초자치단체_경계_2017_topo.json', 'utf8');
const topology = JSON.parse(topoRaw);

// The key in topology.objects is usually the name of the original shapefile or "layer1" etc.
const objectKey = Object.keys(topology.objects)[0];
console.log('Found object key:', objectKey);

const geojson = topojson.feature(topology, topology.objects[objectKey]);

// 11: Seoul, 28: Incheon, 41: Gyeonggi-do
const filteredFeatures = geojson.features.filter(f => {
    const code = f.properties.SIG_CD;
    return code.startsWith('11') || code.startsWith('28') || code.startsWith('41');
});

geojson.features = filteredFeatures;
fs.writeFileSync('public/capital_area.geojson', JSON.stringify(geojson));
console.log('Successfully saved public/capital_area.geojson with', filteredFeatures.length, 'features.');
console.log('Sample coordinate:', filteredFeatures[0].geometry.coordinates[0][0][0]);
