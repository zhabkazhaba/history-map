import './style.css';
import {Map, View} from 'ol';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import {Polygon} from "ol/geom.js";
import { loadJSON } from './json-loader.js'

const imageExtent = [-180, -90, 180, 90];

const imageLayer = new ImageLayer({
  source: new ImageStatic({
    url: 'map.jpg',
    imageExtent: imageExtent,
    projection: 'EPSG:4326'
  }),
});

const imageLayerHigh = new ImageLayer({
  source: new ImageStatic({
    url: 'map_highres.jpg',
    imageExtent: imageExtent,
    projection: 'EPSG:4326'
  }),
});

// let client load image (move operation to site-load stage)
(async () => {
  await new Promise(resolve => setTimeout(resolve, 250));
  imageLayerHigh.setVisible(false);
})();

const map = new Map({
  target: 'map',
  layers: [
    imageLayer,
    imageLayerHigh
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

const features = [];
features.push(pointFeature);

const subscribeFeature = [];
subscribeFeature.push([pointFeature, ["ВСЕМ ПРИВ!!!"]]);

try {
  const data = await loadJSON('./data.json');
  for (let i = 0; i < data.length; ++i) {
    const polyEntry = data[i];
    const feature = new Feature({
      geometry: new Polygon([
        polyEntry.data
      ])
    });
    features.push(feature);

    subscribeFeature.push([feature, [polyEntry.name]]);
  }
} catch (error) {
  console.error('Error loading JSON:', error);
}

const vectorSource = new VectorSource({
  features: features,
});

const vectorLayer = new VectorLayer({
  source: vectorSource,
});

map.addLayer(vectorLayer);

const overlays = [];
for (let i = 0; i < subscribeFeature.length; i++) {
  const element = document.createElement('popup-' + i);
  element.innerHTML = subscribeFeature[i][1][0];

  const overlay = new Overlay({
    element: element,
    autoPan: true
  });
  map.addOverlay(overlay);
  overlays.push(overlay);
}

map.on(['click', 'pointermove'], function(event) {
  const feature = map.forEachFeatureAtPixel(event.pixel, function(feature) {
    return feature;
  });

  for (let i = 0; i < subscribeFeature.length; ++i) {
    const featureSetup = subscribeFeature[i];
    const overlay = overlays[i];
    if (featureSetup[0] === feature) {
      overlay.setPosition(event.coordinate);
      overlay.setVisible(true);
    } else {
      overlay.setPosition(undefined);
      overlay.setVisible(false);
    }
  }
});

let stateZoomActive = false;
let stateHighRes = false;
map.on(['movestart'], function () {
  stateZoomActive = true;
  (async () => {
    while (stateZoomActive) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (map.getView().getZoom() > 4.8) {
        if (!stateHighRes) {
          stateHighRes = true;
        } else {
          continue;
        }
      } else {
        if (stateHighRes) {
          stateHighRes = false;
        } else {
          continue;
        }
      }

      console.log("Resolution update triggered to " + (stateHighRes ? "high" : "low"));
      if (stateHighRes) {
        imageLayer.setVisible(false);
        imageLayerHigh.setVisible(true);
      } else {
        imageLayer.setVisible(true);
        imageLayerHigh.setVisible(false);
      }
    }
  })()
});

map.on(['moveend'], function () {
  stateZoomActive = false;
});

let data = "";
map.on(['click'], function (event) {
  let piece = map.getCoordinateFromPixel(event.pixel);
  piece = "[" + piece[0] + ", " + piece[1] + "]";
  if (data === "") {
    data = piece;
  } else {
    data = data + ",\n" + piece;
  }
  console.log(data);
});
