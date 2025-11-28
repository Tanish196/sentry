import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { GeoJSON } from 'react-leaflet';

const RISK_COLORS = {
  safe: '#22c55e',      // green
  caution: '#f97316',   // orange
  forbidden: '#ef4444', // red
};

const RISK_LABELS = {
  safe: 'Safe',
  caution: 'Moderate Risk',
  forbidden: 'High Risk',
};

function SafetyLayer({
  data,
  visibleRiskLevels = new Set(['safe', 'caution', 'forbidden']),
  onLayerClick,
}) {
  const filteredFeatures = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      features: data.features.filter(feature => {
        const raw = feature?.properties?.risk_level;
        const norm = raw ? String(raw).toLowerCase().trim() : '';
        return visibleRiskLevels.has(norm);
      }),
    };
  }, [data, visibleRiskLevels]);

  const getStyle = (feature) => {
    const raw = feature?.properties?.risk_level;
    const riskLevel = raw ? String(raw).toLowerCase().trim() : 'forbidden';
    return {
      fillColor: RISK_COLORS[riskLevel],
      fillOpacity: 0.3,
      color: RISK_COLORS[riskLevel],
      weight: 2,
      opacity: 0.8,
    };
  };

  const onEachFeature = (feature, layer) => {
    const { properties } = feature;
    const rawRisk = properties?.risk_level;
    const normRisk = rawRisk ? String(rawRisk).toLowerCase().trim() : 'forbidden';
    
    // Bind popup
    layer.bindPopup(`
      <div style="font-family: sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
          ${properties.station_name}
        </h3>
        <div style="margin: 4px 0;">
          <strong>Risk Level:</strong> 
          <span style="color: ${RISK_COLORS[normRisk]}; font-weight: bold;">
            ${RISK_LABELS[normRisk]}
          </span>
        </div>
        <div style="margin: 4px 0;">
          <strong>Safety Score:</strong> ${(properties.safety_score * 100).toFixed(1)}%
        </div>
        <div style="margin: 4px 0;">
          <strong>ML Prediction:</strong> ${properties.predicted_label}
        </div>
        ${properties.aqi !== null ? `
          <div style="margin: 4px 0;">
            <strong>AQI:</strong> ${properties.aqi}
          </div>
        ` : ''}
        <div style="margin: 4px 0; font-size: 12px; color: #666;">
          <strong>District:</strong> ${properties.district}<br/>
          <strong>Range:</strong> ${properties.range}<br/>
          <strong>Sub-division:</strong> ${properties.subdivision}
        </div>
      </div>
    `);

    // Click handler
    if (onLayerClick) {
      layer.on('click', () => {
        onLayerClick(properties.station_name, properties);
      });
    }

    // Hover effects
    layer.on('mouseover', () => {
      layer.setStyle({
        fillOpacity: 0.5,
        weight: 3,
      });
    });

    layer.on('mouseout', () => {
      layer.setStyle({
        fillOpacity: 0.3,
        weight: 2,
      });
    });
  };

  if (!data) {
    return null; // No data yet
  }

  if (!filteredFeatures || filteredFeatures.features.length === 0) {
    return null;
  }

  return (
    <GeoJSON
      data={filteredFeatures}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
}

SafetyLayer.propTypes = {
  data: PropTypes.object,
  visibleRiskLevels: PropTypes.instanceOf(Set),
  onLayerClick: PropTypes.func,
};

export default SafetyLayer;
