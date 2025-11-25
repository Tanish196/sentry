import React from 'react';
import { GeoJSON } from 'react-leaflet';
import { getGeofenceColor } from '../utils/mockMapData';

const GeofenceLayer = ({ geofences, layerToggles }) => {
  // Filter geofences based on layer toggles
  const filteredFeatures = geofences.features.filter(feature => {
    const riskLevel = feature.properties.risk_level;
    return layerToggles[riskLevel];
  });

  const filteredGeofences = {
    ...geofences,
    features: filteredFeatures
  };

  // Style function for geofence polygons
  const geofenceStyle = (feature) => {
    const riskLevel = feature.properties.risk_level;
    const colors = getGeofenceColor(riskLevel);

    return {
      ...colors,
      weight: riskLevel === 'forbidden' ? 3 : 2,
      opacity: 0.8
    };
  };

  // Popup content for geofences
  const onEachFeature = (feature, layer) => {
    const { name, safety_score, risk_level } = feature.properties;
    const popupContent = `
      <div style="font-family: Arial, sans-serif; max-width: 200px;">
        <h4 style="margin: 0 0 8px 0; color: #333;">${name}</h4>
        <div style="margin-bottom: 4px;">
          <strong>Safety Score:</strong> ${(safety_score * 100).toFixed(1)}%
        </div>
        <div style="margin-bottom: 4px;">
          <strong>Risk Level:</strong>
          <span style="color: ${
            risk_level === 'forbidden' ? '#ef4444' :
            risk_level === 'caution' ? '#f97316' : '#22c55e'
          }; font-weight: bold;">
            ${risk_level.toUpperCase()}
          </span>
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 8px;">
          ${risk_level === 'forbidden' ? '⚠️ High-risk area - avoid if possible' :
            risk_level === 'caution' ? '⚠️ Moderate risk - exercise caution' :
            '✅ Generally safe area'}
        </div>
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  return (
    <GeoJSON
      data={filteredGeofences}
      style={geofenceStyle}
      onEachFeature={onEachFeature}
    />
  );
};

export default GeofenceLayer;
