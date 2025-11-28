import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import SafetyLayer from './SafetyLayer';
import RoutePanel from './RoutePanel';
import LocationTracker from './LocationTracker';
import DestinationWarningModal from './DestinationWarningModal';
import PoliceLayer from './PoliceLayer';
import { useSafetyAreas } from '../hooks/useSafetyAreas';
import { DELHI_CENTER, DEFAULT_ZOOM } from '../utils/mockMapData';
import '../styles/MapView.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapView = ({ start, destination }) => {
  const { data: safetyData, loading: safetyLoading, error: safetyError } = useSafetyAreas({
    useCurrentConditions: true,
  });
  const [route, setRoute] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [layerToggles, setLayerToggles] = useState({
    forbidden: true,
    caution: true,
    safe: true
  });
  const [policeLayerToggles, setPoliceLayerToggles] = useState({
    boundaries: true,
    stations: false
  });
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningDetails, setWarningDetails] = useState(null);
  const [routeSegments, setRouteSegments] = useState([]);
  const [policeBoundaries, setPoliceBoundaries] = useState(null);
  const [policeStations, setPoliceStations] = useState(null);
  const [policeDataStatus, setPoliceDataStatus] = useState('loading');

  const visibleRiskLevels = useMemo(() => {
    const levels = new Set();
    if (layerToggles.safe) levels.add('safe');
    if (layerToggles.caution) levels.add('caution');
    if (layerToggles.forbidden) levels.add('forbidden');
    return levels;
  }, [layerToggles]);

  useEffect(() => {
    let isMounted = true;

    const loadPoliceData = async () => {
      try {
        const [boundaryResponse, stationResponse] = await Promise.all([
          fetch('/data/police-boundaries.geojson'),
          fetch('/data/police-stations.geojson')
        ]);

        if (!boundaryResponse.ok || !stationResponse.ok) {
          throw new Error('Unable to load police datasets');
        }

        const [boundaryJson, stationJson] = await Promise.all([
          boundaryResponse.json(),
          stationResponse.json()
        ]);

        if (isMounted) {
          setPoliceBoundaries(boundaryJson);
          setPoliceStations(stationJson);
          setPoliceDataStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setPoliceDataStatus('error');
        }
      }
    };

    loadPoliceData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-generate route when start and destination props are provided
  useEffect(() => {
    if (start && destination && start !== 'Awaiting Route...' && destination !== 'Awaiting Route...') {
      // Automatically generate route with location names
      handleGetRoute(start, destination, ['forbidden']);
    }
  }, [start, destination]);

  const policeStationAreaIndex = useMemo(() => {
    if (!policeBoundaries?.features) return {};

    return policeBoundaries.features.reduce((acc, feature) => {
      const rawName = feature.properties?.POL_STN_NM;
      if (!rawName) return acc;

      const key = rawName.trim().toUpperCase();
      acc[key] = {
        district: feature.properties?.DIST_NM ?? 'Unknown',
        subdivision: feature.properties?.SUB_DIVISI ?? 'Unknown',
        range: feature.properties?.RANGE ?? 'Unknown',
        areaSqKm: feature.properties?.AREA ? Number(feature.properties.AREA) : null
      };
      return acc;
    }, {});
  }, [policeBoundaries]);

  // Check if a point is inside a forbidden geofence
  const checkPointInForbiddenZone = (latLng) => {
    if (!safetyData?.features) return null;

    const point = turf.point([latLng.lng, latLng.lat]);
    const forbiddenGeofences = safetyData.features.filter(
      f => f.properties.risk_level === 'forbidden'
    );

    for (const geofence of forbiddenGeofences) {
      const polygon = turf.polygon(geofence.geometry.coordinates);
      if (turf.booleanPointInPolygon(point, polygon)) {
        return geofence;
      }
    }
    return null;
  };

  // Handle route request
  const handleGetRoute = async (start, end, avoidRiskLevels) => {

    // If end is a string (location name), geocode it first to check for forbidden zone
    let endCoords = end;
    if (typeof end === 'string') {
      try {
        const geocodeRes = await fetch('http://localhost:8000/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: end }),
        });
        const geocodeData = await geocodeRes.json();
        endCoords = { lat: geocodeData.lat, lng: geocodeData.lng };
      } catch (error) {
        // Continue anyway, let backend handle it
      }
    }

    // Check if destination is in forbidden zone
    if (typeof endCoords === 'object' && endCoords.lat && endCoords.lng) {
      const forbiddenZone = checkPointInForbiddenZone(endCoords);
      if (forbiddenZone) {
        setWarningDetails({
          zone: forbiddenZone,
          destination: endCoords,
          onProceed: () => {
            generateRoute(start, end, avoidRiskLevels, true);
            setShowWarningModal(false);
          }
        });
        setShowWarningModal(true);
        return;
      }
    }

    generateRoute(start, end, avoidRiskLevels, false);
  };

  // Generate route using backend API
  const generateRoute = async (start, end, avoidRiskLevels, userConsent) => {
    setRouteLoading(true);

    try {
      // Determine if start/end are location strings or coordinate objects
      let startPayload, endPayload;
      
      if (typeof start === 'string') {
        // Start is a location name - send as string to backend
        startPayload = start;
        // Geocode to get coordinates for marker display
        try {
          const geocodeRes = await fetch('http://localhost:8000/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: start }),
          });
          if (geocodeRes.ok) {
            const geocodeData = await geocodeRes.json();
            if (geocodeData && geocodeData.lat && geocodeData.lng) {
              setStartPoint({ lat: geocodeData.lat, lng: geocodeData.lng });
            } else {
              setStartPoint(null);
            }
          }
        } catch (e) {
          setStartPoint(null);
        }
      } else if (start && typeof start === 'object') {
        // Start is coordinate object - send as [lat, lng] array
        startPayload = [start.lat, start.lng];
        setStartPoint(start);
      } else {
        throw new Error('Invalid start parameter');
      }
      
      if (typeof end === 'string') {
        // End is a location name - send as string to backend
        endPayload = end;
        // Geocode to get coordinates for marker display
        try {
          const geocodeRes = await fetch('http://localhost:8000/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: end }),
          });
          if (geocodeRes.ok) {
            const geocodeData = await geocodeRes.json();
            if (geocodeData && geocodeData.lat && geocodeData.lng) {
              setEndPoint({ lat: geocodeData.lat, lng: geocodeData.lng });
            } else {
              setEndPoint(null);
            }
          }
        } catch (e) {
          setEndPoint(null);
        }
      } else if (end && typeof end === 'object') {
        // End is coordinate object - send as [lat, lng] array
        endPayload = [end.lat, end.lng];
        setEndPoint(end);
      } else {
        throw new Error('Invalid end parameter');
      }

      const response = await fetch('http://localhost:8000/api/safe-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startPayload,
          end: endPayload,
          profile: 'foot-walking',
          avoid_risk_levels: avoidRiskLevels,
        }),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Route request failed: 413 Request too large. Try reducing avoided zones or simplifying dataset.');
        }
        throw new Error(`Route request failed: ${response.status}`);
      }

      const routeData = await response.json();
      
      // Extract route geometry from ORS GeoJSON response
      // ORS returns GeoJSON with features array
      if (routeData.features && routeData.features.length > 0) {
        const routeGeometry = routeData.features[0];
        setRoute(routeGeometry);
        analyzeRouteSegments(routeGeometry, avoidRiskLevels);
      } else if (routeData.routes && routeData.routes.length > 0) {
        // Fallback for non-GeoJSON format
        const routeGeometry = routeData.routes[0];
        setRoute(routeGeometry);
        analyzeRouteSegments(routeGeometry, avoidRiskLevels);
      } else {
        throw new Error('No route found');
      }

      // Log consent if user proceeded despite warning
      if (userConsent) {
        await fetch('http://localhost:8000/api/log-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: end,
            risk_level: 'forbidden',
            user_consent: true,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (error) {
      // User-friendly error messages
      let errorMessage = 'Failed to generate route. ';
      
      if (error.message.includes('404')) {
        errorMessage += 'The location could not be found. Please check your input.';
      } else if (error.message.includes('413')) {
        errorMessage += 'Too many avoid zones selected. Try reducing the number of avoided areas.';
      } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage += 'The request took too long. Try reducing avoid zones or simplifying the route.';
      } else if (error.message.includes('503') || error.message.includes('unavailable')) {
        errorMessage += 'The routing service is temporarily unavailable. Please try again in a moment.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
      setRoute(null);
      setRouteSegments([]);
    } finally {
      setRouteLoading(false);
    }
  };

  // Analyze route segments against geofences
  const analyzeRouteSegments = (route, avoidRiskLevels) => {
    if (!safetyData?.features || !route?.geometry?.coordinates) {
      setRouteSegments([]);
      return;
    }

    const segments = [];

    // Split route into segments and check intersection with geofences
    for (let i = 0; i < route.geometry.coordinates.length - 1; i++) {
      const segmentCoords = [
        route.geometry.coordinates[i],
        route.geometry.coordinates[i + 1]
      ];
      const segment = turf.lineString(segmentCoords);
      
      let segmentRisk = 'safe';
      let intersectedZones = [];

      // Check intersection with each geofence
      safetyData.features.forEach(geofence => {
        const polygon = turf.polygon(geofence.geometry.coordinates);
        try {
          const intersects = turf.booleanIntersects(segment, polygon);
          if (intersects) {
            intersectedZones.push(geofence.properties.station_name);
            if (geofence.properties.risk_level === 'forbidden') {
              segmentRisk = 'forbidden';
            } else if (geofence.properties.risk_level === 'caution' && segmentRisk !== 'forbidden') {
              segmentRisk = 'caution';
            }
          }
        } catch (e) {
          console.warn('Error checking intersection:', e);
        }
      });

      segments.push({
        coordinates: segmentCoords,
        risk: segmentRisk,
        zones: intersectedZones
      });
    }

    setRouteSegments(segments);
  };

  // Clear route
  const handleClearRoute = () => {
    setRoute(null);
    setStartPoint(null);
    setEndPoint(null);
    setRouteSegments([]);
  };

  return (
    <div className="map-view-container">
      <RoutePanel
        onGetRoute={handleGetRoute}
        onClearRoute={handleClearRoute}
        layerToggles={layerToggles}
        setLayerToggles={setLayerToggles}
        policeLayerToggles={policeLayerToggles}
        setPoliceLayerToggles={setPoliceLayerToggles}
        policeDataStatus={policeDataStatus}
        isTracking={isTracking}
        setIsTracking={setIsTracking}
        routeSegments={routeSegments}
        userLocation={userLocation}
        routeLoading={routeLoading}
      />

      <MapContainer
        center={DELHI_CENTER}
        zoom={DEFAULT_ZOOM}
        className="map-container"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <PoliceLayer
          boundaries={policeBoundaries}
          stations={policeStations}
          toggles={policeLayerToggles}
          stationAreaIndex={policeStationAreaIndex}
        />

        {/* Render safety layers with ML predictions */}
        <SafetyLayer
          data={safetyData}
          visibleRiskLevels={visibleRiskLevels}
          onLayerClick={(stationName, properties) => {
            // Station click handler
          }}
        />

        {/* Start marker */}
        {startPoint && (
          <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
            <Popup>Start Point</Popup>
          </Marker>
        )}

        {/* End marker */}
        {endPoint && (
          <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* Route polyline - blue color */}
        {route && routeSegments.length > 0 && (
          <>
            {routeSegments.map((segment, idx) => {
              const positions = segment.coordinates.map(coord => [coord[1], coord[0]]);
              
              return (
                <Polyline
                  key={idx}
                  positions={positions}
                  color="#3b82f6"
                  weight={5}
                  opacity={0.8}
                >
                  <Popup>
                    <div>
                      <strong>Segment {idx + 1}</strong><br />
                      Risk Level: {segment.risk}<br />
                      {segment.zones.length > 0 && (
                        <>Intersects: {segment.zones.join(', ')}</>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              );
            })}
          </>
        )}

        {/* User location marker */}
        {isTracking && userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>Your Location</Popup>
            </Marker>
            {userLocation.accuracy && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={Math.max(userLocation.accuracy, 25)}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
              />
            )}
          </>
        )}

        {/* Location tracker component */}
        <LocationTracker
          isTracking={isTracking}
          geofences={safetyData}
          onLocationUpdate={setUserLocation}
        />
      </MapContainer>

      {/* Warning modal for forbidden destinations */}
      {showWarningModal && warningDetails && (
        <DestinationWarningModal
          zone={warningDetails.zone}
          onClose={() => setShowWarningModal(false)}
          onProceed={warningDetails.onProceed}
        />
      )}
    </div>
  );
};

export default MapView;
