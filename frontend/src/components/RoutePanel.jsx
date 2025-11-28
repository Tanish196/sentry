import React, { useState } from 'react';
import Button from './ui/button/Button';

const RoutePanel = ({
  onGetRoute,
  onClearRoute,
  layerToggles,
  setLayerToggles,
  policeLayerToggles,
  setPoliceLayerToggles,
  policeDataStatus,
  isTracking,
  setIsTracking,
  routeSegments,
  userLocation,
  routeLoading
}) => {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [avoidRiskLevels, setAvoidRiskLevels] = useState(['forbidden', 'caution']);

  const formatCoords = (coords) => `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

  const handleGetRoute = () => {
    // Try to parse as coordinates first, otherwise treat as location name
    const parseInput = (input) => {
      const trimmed = input.trim();
      
      // Try parsing as coordinates (format: "lat,lng" or "lat lng")
      const parts = trimmed.replace(/\s+/g, '').split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
      
      // Otherwise, treat as location name
      return trimmed;
    };

    const start = parseInput(startInput);
    const end = parseInput(endInput);

    if (!start || !end || start === '' || end === '') {
      alert('Please enter location names or coordinates (e.g., "Connaught Place, Delhi" or "28.7041,77.1025")');
      return;
    }

    onGetRoute(start, end, avoidRiskLevels);
  };

  const handleUseCurrentLocation = () => {
    if (!userLocation) {
      alert('Start location unavailable. Please enable tracking first.');
      return;
    }

    setStartInput(formatCoords(userLocation));
  };

  const handleClearRoute = () => {
    setStartInput('');
    setEndInput('');
    onClearRoute();
  };

  const toggleRiskLevel = (level) => {
    setAvoidRiskLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  return (
    <div className="route-panel">
      <div className="panel-header">
        <h3>Safe Route Planner</h3>
      </div>

      <div className="input-section">
        <div className="input-group">
          <label htmlFor="start-input">Start Location</label>
          <input
            id="start-input"
            type="text"
            placeholder="Connaught Place, Delhi"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
          />
          <div className="input-hint-row">
            <small>Enter location name or coordinates (lat,lng)</small>
            <button
              type="button"
              className="link-button"
              onClick={handleUseCurrentLocation}
              disabled={!userLocation}
            >
              Use my location
            </button>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="end-input">Destination</label>
          <input
            id="end-input"
            type="text"
            placeholder="India Gate, Delhi"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
          />
          <small>Enter location name or coordinates (lat,lng)</small>
        </div>
      </div>

      {/* <details className="advanced-options">
        <summary>Advanced routing preferences</summary>
        <div className="avoid-options">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={avoidRiskLevels.includes('forbidden')}
                onChange={() => toggleRiskLevel('forbidden')}
              />
              <span className="checkmark forbidden"></span>
              Avoid forbidden zones
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={avoidRiskLevels.includes('caution')}
                onChange={() => toggleRiskLevel('caution')}
              />
              <span className="checkmark caution"></span>
              Avoid caution zones
            </label>
          </div>
          <small className="advanced-note">These preferences are forwarded to the backend once routing APIs are wired up.</small>
        </div>
      </details> */}

      <div className="layer-toggles">
        <h4>Show Layers</h4>
        <div className="toggle-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={layerToggles.forbidden}
              onChange={() => setLayerToggles(prev => ({ ...prev, forbidden: !prev.forbidden }))}
            />
            <span className="toggle-slider forbidden"></span>
            Forbidden Zones
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={layerToggles.caution}
              onChange={() => setLayerToggles(prev => ({ ...prev, caution: !prev.caution }))}
            />
            <span className="toggle-slider caution"></span>
            Caution Zones
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={layerToggles.safe}
              onChange={() => setLayerToggles(prev => ({ ...prev, safe: !prev.safe }))}
            />
            <span className="toggle-slider safe"></span>
            Safe Zones
          </label>
        </div>
      </div>

      <div className="layer-toggles">
        <h4>Police Awareness</h4>
        <p className="panel-hint">Visualize Delhi Police jurisdiction boundaries and station pins to stay oriented.</p>
        <div className="toggle-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={policeLayerToggles.boundaries}
              onChange={() => setPoliceLayerToggles(prev => ({ ...prev, boundaries: !prev.boundaries }))}
            />
            <span className="toggle-slider police-boundary"></span>
            Police Station Boundaries
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={policeLayerToggles.stations}
              onChange={() => setPoliceLayerToggles(prev => ({ ...prev, stations: !prev.stations }))}
            />
            <span className="toggle-slider police-station"></span>
            Police Station Pins
          </label>
        </div>
        {policeDataStatus === 'loading' && (
          <small className="loading-hint">Loading official boundary overlays…</small>
        )}
        {policeDataStatus === 'error' && (
          <small className="error-text">Unable to load police datasets. Refresh the page to retry.</small>
        )}
      </div>

      <div className="action-buttons">
        <Button onClick={handleGetRoute} className="primary-button" disabled={routeLoading}>
          {routeLoading ? (
            <>
              Calculating Route...
              <span className="loading-spinner"></span>
            </>
          ) : (
            'Get Safe Route'
          )}
        </Button>
        <Button onClick={handleClearRoute} className="secondary-button" disabled={routeLoading}>
          Clear Route
        </Button>
      </div>

      <div className="tracking-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={isTracking}
            onChange={() => setIsTracking(!isTracking)}
          />
          <span className="toggle-slider tracking"></span>
          Track My Location
        </label>
        {isTracking && (
          <small className="tracking-note">
            Location tracking active - you'll receive alerts when entering/leaving safety zones
          </small>
        )}
      </div>
    </div>
  );
};

export default RoutePanel;
