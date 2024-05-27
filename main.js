import './style.css';
import {Map, View} from 'ol';
import Feature from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import {Polygon} from "ol/geom.js";
import {loadJSON} from './json-loader.js'
import {Fill, Stroke, Style} from "ol/style.js";

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

try {
  const data = await loadJSON('./data.json');
  for (let i = 0; i < data.length; ++i) {
    const polyEntry = data[i];
    const feature = new Feature({
      geometry: new Polygon([
        polyEntry.data
      ])
    });
    feature.setId(i);

    const color = polyEntry.color.toString();
    feature.setStyle(new Style({
      fill: new Fill({
        color: color + "AA"
      }),
      stroke: new Stroke({
        color: color,
        width: 1.75
      })
    }));

    const vectorSource = new VectorSource({
      features: [feature],
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    map.addLayer(vectorLayer);

    const element = document.createElement('div');
    element.style.backgroundColor = 'white';
    element.style.display = 'inline-block';
    element.style.padding = '10px';
    element.style.border = '1px solid black';
    element.style.borderRadius = '5px';
    element.style.alignItems = 'center';
    element.style.maxWidth = '300px';

    const content = document.createElement('popup-' + i);
    content.innerHTML = polyEntry.name + "<br>" + polyEntry.lore + "<br>" + "<img src='" + polyEntry.image + "' alt='image' style='width: 100px; height: 100px;'>";
    element.appendChild(content);

    const overlay = new Overlay({
      element: element,
      autoPan: true,
      positioning: 'center-left',
      offset: [20, 0],
    });
    map.addOverlay(overlay);

    map.on(['click', 'pointermove'], function(event) {
      const featureAtPixel = map.forEachFeatureAtPixel(event.pixel, function(featureAtPixel) {
        return featureAtPixel;
      });

      if (feature === featureAtPixel) {
        overlay.setPosition(event.coordinate);
        overlay.setVisible(true);
      } else {
        overlay.setPosition(undefined);
        overlay.setVisible(false);
      }
    });
  }
} catch (error) {
  console.error('Error loading JSON:', error);
}

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
