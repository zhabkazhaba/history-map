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
import {defaults as defaultInteractions} from 'ol/interaction';

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
    projection: 'EPSG:4326',
    extent: imageExtent
  })
});

try {
  const data = await loadJSON('/config/data.json');
  for (let i = 0; i < data.length; ++i) {
    const polyEntry = data[i];
    const zoneFeatures = [];
    const overlays = [];
    const index = polyEntry["z-index"] === undefined ? 50 : polyEntry["z-index"];
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
      //set cyan
      element.style.backgroundColor = '#E2F5F4EE';
      element.style.padding = '14px';
      element.style.border = '1px solid black';
      element.style.borderRadius = '0.9em';
      element.style.margin = "10px";

      const content = document.createElement('popup-' + i);
      content.style.display = 'flex';

      // content.innerHTML = "<div class='wrapper'>" + polyEntry.name + "</div><br><div class='lore-wrapper'>" + polyEntry.lore + "</div><br>" +
      //     "<div class='container'><img src='/img/people/" + polyEntry.image + "' alt='image'></div>";
      content.innerHTML = "<div class='holder-base'><div class='name-wrapper'>" + polyEntry.name + "</div>" +
          "<div class='container'><img src='/img/people/" + polyEntry.image + "' alt='image'></div>" +
          "</div><div class='holder-info'><div class='lore-wrapper'>" + polyEntry.lore + "</div></div>"
      element.appendChild(content);

      const overlay = new Overlay({
        element: element,
        autoPan: false,
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
      zIndex: index
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

          const x = event.pixel[0];
          let widthOffset = 0;
          if (x > (map.getSize()[0] / 2)) {
            widthOffset = -20;
            overlays[i].setPositioning('center-right');
          } else {
            widthOffset = 20;
            overlays[i].setPositioning('center-left');
          }
          const y = event.pixel[1];
          const overlayHeight = overlays[i].element.offsetHeight;
          let heightOffset = 0;

          if ((overlayHeight / 2) > y) {
            heightOffset = (overlayHeight / 2) - y;
          } else if (y > (map.getSize()[1] - (overlayHeight / 2))) {
            heightOffset = (map.getSize()[1] - y) - (overlayHeight / 2);
          } else {
            heightOffset = 0;
          }
          overlays[i].setOffset([widthOffset, heightOffset]);


        } else {
          overlays[i].setPosition(undefined);
          overlays[i].setVisible(false);
        }
      }

      if (glowPiece !== glowing) {
        glowing  = glowPiece;
        for (let zoneFeature of zoneFeatures) {
          let stroke = zoneFeature.getStyle().getStroke();
          stroke.setColor(glowing ? "#FFFFFF" : polyEntry.color.toString());
          stroke.setWidth(glowing ? 2.5 : 1.75);
          vectorLayer.setZIndex(glowing ? 100 : index);
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

// const poly = new Polygon([
//     [0, 0]
// ]);
// const source = new VectorSource({
//   features: [new Feature({
//     geometry: poly
//   })],
// });
// const layer = new VectorLayer({
//   source: source,
// });
// map.addLayer(layer);
//
// let data = "";
// map.on(['click'], function (event) {
//   let piece = map.getCoordinateFromPixel(event.pixel);
//
//   let coordinates = data === "" ? [] : poly.getCoordinates()[0];
//   coordinates.push(piece);
//   poly.setCoordinates([coordinates]);
//   source.changed();
//
//   piece = "[" + piece[0] + ", " + piece[1] + "]";
//   if (data === "") {
//     data = piece;
//   } else {
//     data = data + ",\n" + piece;
//   }
//   console.log(data);
// });

var modal = document.getElementById("myModal");
var btn = document.getElementById("okButton");
var mapel = document.getElementById("map");

btn.onclick = function() {
    modal.style.display = "none";
    mapel.style.filter = "blur(0px)";
}

window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
        mapel.style.filter = "blur(0px)";
    }
}

window.onload = function() {
    modal.style.display = "block";
    mapel.style.filter = "blur(5px)";
}
