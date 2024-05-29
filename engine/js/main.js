import '../css/style.css';
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
    url: '/img/base/map2.jpg',
    imageExtent: imageExtent,
    projection: 'EPSG:4326'
  }),
});

const imageLayerHigh = new ImageLayer({
  source: new ImageStatic({
    url: '/img/base/map2.jpg',
    imageExtent: imageExtent,
    projection: 'EPSG:4326'
  }),
});

const imageLayerHover = new ImageLayer({
  source: new ImageStatic({
    url: '/img/base/map2_hover.jpg',
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
    imageLayerHigh,
    imageLayerHover
  ],
  view: new View({
    center: [0, 0],
    zoom: 2,
    projection: 'EPSG:4326'
  })
});

const button = document.createElement('button');
button.innerHTML = 'Change map image';
button.style.position = 'absolute';
button.style.top = '10px';
button.style.right = '10px';

try {
  const data = await loadJSON('/config/data.json');
  for (let i = 0; i < data.length; ++i) {
    const polyEntry = data[i];
    const zoneFeatures = [];
    const overlays = [];
    for (let j = 0; j < polyEntry.data.length; ++j) {
      const feature = new Feature({
        geometry: new Polygon([
          polyEntry.data[j]
        ])
      });
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
      zoneFeatures.push(feature);

      const element = document.createElement('div');
      element.style.backgroundColor = 'white';
      element.style.display = 'inline-block';
      element.style.padding = '10px';
      element.style.border = '1px solid black';
      element.style.borderRadius = '5px';
      element.style.alignItems = 'center';
      element.style.maxWidth = '450px';

      const content = document.createElement('popup-' + i);
      content.innerHTML = polyEntry.name + "<br>" + polyEntry.lore + "<br>" + "<img src='/img/people/"
          + polyEntry.image + "' alt='image' style='width: 100px; height: 100px;'>";
      element.appendChild(content);

      const overlay = new Overlay({
        element: element,
        autoPan: true,
        positioning: 'center-left',
        offset: [20, 0],
      });
      map.addOverlay(overlay);
      overlays.push(overlay);
    }

    const vectorSource = new VectorSource({
      features: zoneFeatures
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    map.addLayer(vectorLayer);

    let glowing = false;
    map.on(['click', 'pointermove'], function(event) {
      const featureAtPixel = map.forEachFeatureAtPixel(event.pixel, function(featureAtPixel) {
        return featureAtPixel;
      });

      let glowPiece = false;
      for (let i = 0; i < zoneFeatures.length; ++i) {
        if (zoneFeatures[i] === featureAtPixel) {
          overlays[i].setPosition(event.coordinate);
          overlays[i].setVisible(true);
          glowPiece = true;
        } else {
          overlays[i].setPosition(undefined);
          overlays[i].setVisible(false);
        }
      }

      if (glowPiece !== glowing) {
        glowing  = glowPiece;
        console.log("Now glowing: " + glowing);
        for (let zoneFeature of zoneFeatures) {
          let stroke = zoneFeature.getStyle().getStroke();
          stroke.setColor(glowing ? "#FFFFFF" : polyEntry.color.toString());
          stroke.setWidth(glowing ? 2.5 : 1.75);
          vectorLayer.setZIndex(glowing ? 1 : 0);
          map.redrawText();
        }
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

const poly = new Polygon([
    [0, 0]
]);
const source = new VectorSource({
  features: [new Feature({
    geometry: poly
  })],
});
const layer = new VectorLayer({
  source: source,
});
map.addLayer(layer);

let data = "";
map.on(['click'], function (event) {
  let piece = map.getCoordinateFromPixel(event.pixel);

  let coordinates = data === "" ? [] : poly.getCoordinates()[0];
  coordinates.push(piece);
  poly.setCoordinates([coordinates]);
  source.changed();

  piece = "[" + piece[0] + ", " + piece[1] + "]";
  if (data === "") {
    data = piece;
  } else {
    data = data + ",\n" + piece;
  }
  console.log(data);
});
let hover_state = true;
button.addEventListener('click', function () {
  if (hover_state) {
    if (stateHighRes) {
      imageLayerHigh.setVisible(true);
      imageLayer.setVisible(false);
    } else {
      imageLayerHigh.setVisible(false);
      imageLayer.setVisible(true);
    }
    imageLayerHover.setVisible(false);
    hover_state = false;
  } else {
    imageLayer.setVisible(false);
    imageLayerHigh.setVisible(false);
    imageLayerHover.setVisible(true);
    hover_state = true;
  }
});

document.getElementById('map').appendChild(button);
