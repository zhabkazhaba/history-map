import './style.css';
import {Map, View} from 'ol';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';

const imageUrl = 'map2.jpg';
const imageExtent = [-180, -90, 180, 90];

const map = new Map({
  target: 'map',
  layers: [
    new ImageLayer({
      source: new ImageStatic({
        url: imageUrl,
        imageExtent: imageExtent,
        projection: 'EPSG:4326'
      }),
    })
  ],
  view: new View({
    center: [0, 0],
    zoom: 2,
    projection: 'EPSG:4326'
  })
});

const pointFeature = new Feature({
  geometry: new Point([-10, 10]),
});

const vectorSource = new VectorSource({
  features: [pointFeature],
});

const vectorLayer = new VectorLayer({
  source: vectorSource,
});

map.addLayer(vectorLayer);

const overlay = new Overlay({
  element: document.getElementById('popup'),
  autoPan: true
});

map.addOverlay(overlay);

map.on(['click', 'pointermove'], function(event) {
  const feature = map.forEachFeatureAtPixel(event.pixel, function(feature) {
    return feature;
  });

  if (feature === pointFeature) {
    overlay.setPosition(event.coordinate);
    document.getElementById('popup').innerHTML = 'ВСЕМ ПРИВ!!!';
  } else {
    overlay.setPosition(undefined);
  }
});