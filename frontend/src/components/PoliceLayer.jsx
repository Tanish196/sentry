import React from 'react';
import { GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const rangePalette = {
  'NORTHERN': '#312e81',
  'EASTERN': '#1d4ed8',
  'WESTERN': '#0f172a',
  'CENTRAL': '#2563eb',
  'SOUTHERN': '#1e40af',
  'NEW DELHI': '#1d3557'
};

const policeStationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const normalizeName = (value = '') => value.trim().toUpperCase();

const formatArea = (areaSqKm) => {
  if (!areaSqKm && areaSqKm !== 0) return 'N/A';
  return `${areaSqKm.toFixed(2)} km²`;
};

const PoliceLayer = ({ boundaries, stations, toggles, stationAreaIndex }) => {
  if ((!boundaries || !toggles.boundaries) && (!stations || !toggles.stations)) {
    return null;
  }

  const getRangeColor = (range) => rangePalette[normalizeName(range)] ?? '#155e75';

  const onEachBoundary = (feature, layer) => {
    const properties = feature.properties ?? {};
    const popupHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 220px;">
        <strong>${properties.POL_STN_NM ?? 'Police Station'}</strong><br/>
        District: ${properties.DIST_NM ?? 'Unknown'}<br/>
        Sub-division: ${properties.SUB_DIVISI ?? 'Unknown'}<br/>
        Range: ${properties.RANGE ?? 'Unknown'}<br/>
        Jurisdiction Area: ${properties.AREA ? formatArea(Number(properties.AREA)) : 'N/A'}
      </div>
    `;
    layer.bindPopup(popupHtml);
  };

  const boundaryStyle = (feature) => ({
    color: getRangeColor(feature.properties?.RANGE),
    weight: 1.5,
    dashArray: '6 6',
    fillColor: getRangeColor(feature.properties?.RANGE),
    fillOpacity: 0.05
  });

  return (
    <>
      {toggles.boundaries && boundaries && (
        <GeoJSON
          data={boundaries}
          style={boundaryStyle}
          onEachFeature={onEachBoundary}
        />
      )}

      {toggles.stations && stations?.features?.map((feature, idx) => {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length < 2) return null;
        const [lng, lat] = coords;
        const props = feature.properties ?? {};
        const lookup = stationAreaIndex[normalizeName(props.NAME)];

        return (
          <Marker
            key={`police-station-${props.FID ?? idx}`}
            position={[lat, lng]}
            icon={policeStationIcon}
          >
            <Popup>
              <div className="station-popup">
                <strong>{props.NAME ?? 'Police Station'}</strong>
                <div>District: {props.DISTRICT ?? lookup?.district ?? 'Unknown'}</div>
                {lookup && (
                  <>
                    <div>Jurisdiction: {lookup.subdivision}</div>
                    <div>Range: {lookup.range}</div>
                    <div>Coverage: {lookup.areaSqKm ? formatArea(lookup.areaSqKm) : 'N/A'}</div>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default PoliceLayer;
