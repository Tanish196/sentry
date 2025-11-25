import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import GeofenceLayer from './GeofenceLayer';
import RoutePanel from './RoutePanel';
import LocationTracker from './LocationTracker';
import DestinationWarningModal from './DestinationWarningModal';
import PoliceLayer from './PoliceLayer';
import { mockGeofences, mockRouteResponse, DELHI_CENTER, DEFAULT_ZOOM } from '../utils/mockMapData';
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

const MapView = () => {
  const [geofences, setGeofences] = useState(mockGeofences);
  const [route, setRoute] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [layerToggles, setLayerToggles] = useState({
    forbidden: true,
    caution: true,
    safe: false
  });
  const [policeLayerToggles, setPoliceLayerToggles] = useState({
    boundaries: true,
    stations: true
  });
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningDetails, setWarningDetails] = useState(null);
  const [routeSegments, setRouteSegments] = useState([]);
  const [policeBoundaries, setPoliceBoundaries] = useState(null);
  const [policeStations, setPoliceStations] = useState(null);
  const [policeDataStatus, setPoliceDataStatus] = useState('loading');

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
        console.error('Failed loading police overlays', error);
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
    const point = turf.point([latLng.lng, latLng.lat]);
    const forbiddenGeofences = geofences.features.filter(
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
  const handleGetRoute = (start, end, avoidRiskLevels) => {
    console.log('Requesting route:', { start, end, avoidRiskLevels });

    // Check if destination is in forbidden zone
    const forbiddenZone = checkPointInForbiddenZone(end);
    if (forbiddenZone) {
      setWarningDetails({
        zone: forbiddenZone,
        destination: end,
        onProceed: () => {
          generateRoute(start, end, avoidRiskLevels, true);
          setShowWarningModal(false);
        }
      });
      setShowWarningModal(true);
      return;
    }

    generateRoute(start, end, avoidRiskLevels, false);
  };

  // Generate route (mock implementation)
  const generateRoute = (start, end, avoidRiskLevels, userConsent) => {
    setStartPoint(start);
    setEndPoint(end);

    // In production, this would call /api/route with avoid_polygons
    // For now, use mock data
    const mockRoute = {
      ...mockRouteResponse.route,
      geometry: {
        type: "LineString",
        coordinates: [
          [start.lng, start.lat],
          ...mockRouteResponse.route.geometry.coordinates.slice(1, -1),
          [end.lng, end.lat]
        ]
      }
    };

    setRoute(mockRoute);

    // Analyze route segments for safety
    analyzeRouteSegments(mockRoute, avoidRiskLevels);

    // Log consent if user proceeded despite warning
    if (userConsent) {
      console.log('User consent logged for high-risk destination:', {
        destination: end,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Analyze route segments against geofences
  const analyzeRouteSegments = (route, avoidRiskLevels) => {
    const routeLine = turf.lineString(route.geometry.coordinates);
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
      geofences.features.forEach(geofence => {
        const polygon = turf.polygon(geofence.geometry.coordinates);
        try {
          const intersects = turf.booleanIntersects(segment, polygon);
          if (intersects) {
            intersectedZones.push(geofence.properties.name);
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

        {/* Render geofence layers */}
        <GeofenceLayer
          geofences={geofences}
          layerToggles={layerToggles}
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

        {/* Route polyline with segment coloring */}
        {route && routeSegments.length > 0 && (
          <>
            {routeSegments.map((segment, idx) => {
              const positions = segment.coordinates.map(coord => [coord[1], coord[0]]);
              const color = segment.risk === 'forbidden' ? '#ef4444' :
                           segment.risk === 'caution' ? '#f97316' : '#22c55e';
              
              return (
                <Polyline
                  key={idx}
                  positions={positions}
                  color={color}
                  weight={5}
                  opacity={0.7}
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
          geofences={geofences}
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
