import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import * as turf from '@turf/turf';

const LocationTracker = ({ isTracking, geofences, onLocationUpdate }) => {
  const map = useMap();
  const watchIdRef = useRef(null);
  const currentGeofencesRef = useRef(new Set()); // Track which geofences user is currently in

  useEffect(() => {
    if (isTracking) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isTracking]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    currentGeofencesRef.current.clear();
  };

  const handlePositionUpdate = (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    const latLng = { lat: latitude, lng: longitude, accuracy };

    // Update parent component with location
    onLocationUpdate(latLng);

    // Check geofence intersections
    checkGeofenceIntersections(latLng);

    if (map && isTracking) {
      const targetZoom = Math.max(map.getZoom(), 15);
      map.flyTo([latitude, longitude], targetZoom, { duration: 0.5 });
    }
  };

  const handlePositionError = (error) => {
    console.error('Geolocation error:', error);
    let message = 'Unable to retrieve your location. ';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message += 'Location access denied by user.';
        break;
      case error.POSITION_UNAVAILABLE:
        message += 'Location information is unavailable.';
        break;
      case error.TIMEOUT:
        message += 'Location request timed out.';
        break;
      default:
        message += 'An unknown error occurred.';
        break;
    }

    alert(message);
  };

  const checkGeofenceIntersections = (latLng) => {
    if (!geofences?.features) return;

    const point = turf.point([latLng.lng, latLng.lat]);
    const newGeofences = new Set();

    geofences.features.forEach(geofence => {
      const polygon = turf.polygon(geofence.geometry.coordinates);

      try {
        const isInside = turf.booleanPointInPolygon(point, polygon);

        if (isInside) {
          const stationId = geofence.properties.station_name;
          newGeofences.add(stationId);

          // Check if this is a new entry
          if (!currentGeofencesRef.current.has(stationId)) {
            handleGeofenceEntry(geofence, latLng);
          }
        }
      } catch (error) {
        console.warn('Error checking geofence intersection:', error);
      }
    });

    // Check for exits
    currentGeofencesRef.current.forEach(stationId => {
      if (!newGeofences.has(stationId)) {
        const geofence = geofences.features.find(f => f.properties.station_name === stationId);
        if (geofence) {
          handleGeofenceExit(geofence, latLng);
        }
      }
    });

    // Update current geofences
    currentGeofencesRef.current = newGeofences;
  };

  const handleGeofenceEntry = async (geofence, latLng) => {
    const { station_name, risk_level, safety_score } = geofence.properties;

    // Show UI alert
    showGeofenceAlert('entry', geofence, latLng);

    // Send to backend
    try {
      await fetch('http://localhost:8000/api/log-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geofence_id: station_name,
          station_name: station_name,
          risk_level: risk_level,
          safety_score: safety_score,
          lat: latLng.lat,
          lng: latLng.lng,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error logging geofence entry:', error);
    }
  };

  const handleGeofenceExit = async (geofence, latLng) => {
    const { station_name, risk_level, safety_score } = geofence.properties;

    // Show UI alert
    showGeofenceAlert('exit', geofence, latLng);

    // Send to backend
    try {
      await fetch('http://localhost:8000/api/log-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geofence_id: station_name,
          station_name: station_name,
          risk_level: risk_level,
          safety_score: safety_score,
          lat: latLng.lat,
          lng: latLng.lng,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error logging geofence exit:', error);
    }
  };

  const showGeofenceAlert = (action, geofence, latLng) => {
    const { station_name, risk_level } = geofence.properties;
    const actionText = action === 'entry' ? 'entered' : 'exited';
    const riskColor = risk_level === 'forbidden' ? '#ef4444' :
                     risk_level === 'caution' ? '#f97316' : '#22c55e';

    // Create a temporary alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `geofence-alert ${action} ${risk_level}`;
    alertDiv.innerHTML = `
      <div class="alert-content">
        <strong>Zone Alert</strong><br>
        You have ${actionText}: <strong style="color: ${riskColor}">${station_name}</strong><br>
        <small>Risk Level: ${risk_level.toUpperCase()}</small>
      </div>
    `;

    // Style the alert
    Object.assign(alertDiv.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'white',
      border: `2px solid ${riskColor}`,
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '1000',
      maxWidth: '300px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px'
    });

    document.body.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 5000);
  };

  return null; // This component doesn't render anything visible
};

export default LocationTracker;
