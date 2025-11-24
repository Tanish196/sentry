import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  AlertTriangle,
  CheckCircle,
  Truck,
  AlertOctagon,
  Activity,
  Plus,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/styles/LeafletMapViewer.css";

import Header from "@/components/Header";
import BackgroundAnimation from "@/components/r3f/BackgroundAnimation";

const DEV_MODE = true;

const mockDataStream = [
  {
    type: "INITIAL",
    route: {
      type: "LineString",
      coordinates: [
        [77.209, 28.6139],
        [77.22, 28.62],
        [77.25, 28.64],
      ],
    },
    zone: {
      type: "Polygon",
      coordinates: [
        [
          [77.2, 28.61],
          [77.26, 28.61],
          [77.26, 28.65],
          [77.2, 28.65],
          [77.2, 28.61],
        ],
      ],
    },
    startLat: 28.6139,
    startLon: 77.209,
  },
  {
    type: "UPDATE",
    lat: 28.62,
    lon: 77.22,
    deviation: false,
    risk: 0.2,
    riskyAreas: [],
  },
  {
    type: "UPDATE",
    lat: 28.63,
    lon: 77.23,
    deviation: true,
    risk: 0.8,
    riskyAreas: [
      {
        type: "Polygon",
        coordinates: [
          [
            [77.22, 28.62],
            [77.24, 28.62],
            [77.24, 28.64],
            [77.22, 28.64],
            [77.22, 28.62],
          ],
        ],
      },
    ],
  },
];

export default function LeafletMapViewer({ start, destination }) {
  const [status, setStatus] = useState({
    text: "🔌 Initializing Map...",
    cardClass: "status-gray",
    icon: <Activity className="w-5 h-5 mr-2" />,
  });
  const [currentPositionText, setCurrentPositionText] = useState("N/A");
  const [risk, setRisk] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const zoneLayerRef = useRef(null);
  const riskAreaLayerRef = useRef(null);
  const positionMarkerRef = useRef(null);
  const isMapInitialized = useRef(false);

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    if (isMapInitialized.current) return;

    const defaultCenter = [28.65, 77.22];
    const defaultZoom = 12;

    const mapInstance = L.map("map", { zoomControl: true }).setView(
      defaultCenter,
      defaultZoom
    );
    mapRef.current = mapInstance;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance);

    routeLayerRef.current = L.geoJSON(null, {
      style: { color: "#1d4ed8", weight: 4, dashArray: "10,5", opacity: 0.7 },
    }).addTo(mapInstance);

    zoneLayerRef.current = L.geoJSON(null, {
      style: {
        fillColor: "#6ee7b7",
        color: "#10b981",
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4,
      },
    }).addTo(mapInstance);

    riskAreaLayerRef.current = L.geoJSON(null, {
      style: {
        fillColor: "#c2410c",
        color: "#c2410c",
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.5,
      },
    }).addTo(mapInstance);

    positionMarkerRef.current = L.circleMarker(defaultCenter, {
      radius: 10,
      color: "#0f172a",
      weight: 3,
      fillColor: "#3730a3",
      fillOpacity: 1,
    }).addTo(mapInstance);

    positionMarkerRef.current.bringToFront();
    isMapInitialized.current = true;

    setTimeout(() => mapRef.current?.invalidateSize(), 300);
  }, []);

  // --- MOCK SIMULATION ---
  useEffect(() => {
    if (!isMapInitialized.current || !mapRef.current) return;

    if (DEV_MODE) {
      setStatus({
        text: " Simulation Mode: Streaming Data",
        cardClass: "status-yellow",
        icon: <Truck className="w-5 h-5 mr-2" />,
      });

      let index = 0;
      const intervalId = setInterval(() => {
        handleWebSocketMessage(mockDataStream[index]);
        index = (index + 1) % mockDataStream.length;
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [isMapInitialized.current]);

  // --- HANDLE INCOMING DATA ---
  const handleWebSocketMessage = useCallback((data) => {
    if (!mapRef.current || !isMapInitialized.current || !data) return;

    if (data.type === "INITIAL") {
      routeLayerRef.current.clearLayers();
      routeLayerRef.current.addData({ type: "Feature", geometry: data.route });

      zoneLayerRef.current.clearLayers();
      zoneLayerRef.current.addData({ type: "Feature", geometry: data.zone });

      const Lbounds = L.geoJSON(data.zone);
      mapRef.current.fitBounds(Lbounds.getBounds(), { padding: [50, 50] });

      positionMarkerRef.current.setLatLng([data.startLat, data.startLon]);
      setCurrentPositionText(
        `${data.startLat.toFixed(6)}, ${data.startLon.toFixed(6)}`
      );

      setStatus({
        text: " Route Ready. Streaming Live Data",
        cardClass: "status-green",
        icon: <CheckCircle className="w-5 h-5 mr-2" />,
      });
      return;
    }

    if (data.type === "UPDATE") {
      const { lat, lon, deviation, risk, riskyAreas } = data;

      if (lat && lon) {
        const newLatLng = [lat, lon];
        positionMarkerRef.current.setLatLng(newLatLng);
        mapRef.current.setView(newLatLng);
        setCurrentPositionText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
      }

      riskAreaLayerRef.current.clearLayers();
      if (riskyAreas?.length)
        riskAreaLayerRef.current.addData({
          type: "FeatureCollection",
          features: riskyAreas,
        });

      let newStatus = {
        text: "✅ Status: Within Safe Zone",
        cardClass: "status-green",
        icon: <CheckCircle className="w-5 h-5 mr-2" />,
      };

      if (deviation) {
        newStatus = {
          text: " DEVIATION ALERT! Outside Safe Zone.",
          cardClass: "status-red",
          icon: <AlertOctagon className="w-5 h-5 mr-2" />,
        };
      } else if (risk > 0.65) {
        newStatus = {
          text: " HIGH ML RISK! Proceed with caution.",
          cardClass: "status-yellow",
          icon: <AlertTriangle className="w-5 h-5 mr-2" />,
        };
      }

      setStatus(newStatus);
      setRisk(risk);
    }
  }, []);

  const riskColorClass =
    risk > 0.65
      ? "text-red-600"
      : risk > 0.3
      ? "text-yellow-600"
      : "text-green-600";

  return (
    <>
      
      
      <div className="leaflet-container">

        {/* SIDEBAR */}
        <div className="sidebar">
          <h1 className="sidebar-title">Live Route Monitor</h1>
          <p className="sidebar-subtitle">
            Real-time path, geofence, and risk assessment system.
          </p>

          {/* ROUTE INFO */}
          <div className="route-info">
            <h2 className="route-heading">Current Route</h2>
            <div className="route-details">
              <div>
                <span className="label">
                  <MapPin className="w-4 h-4 mr-2 text-green-600" /> Start:
                </span>
                <p className="value">{start}</p>
              </div>
              <div>
                <span className="label">
                  <MapPin className="w-4 h-4 mr-2 text-red-600" /> Destination:
                </span>
                <p className="value">{destination}</p>
              </div>
            </div>
          </div>

          {/* STATUS CARD */}
          <div className={`status-card ${status.cardClass}`}>
            {status.icon}
            <p className="status-text">{status.text}</p>
          </div>

          {/* INFO */}
          <div className="info-block">
            <div>
              <span className="info-title">Current Position (Lat, Lon):</span>
              <p className="info-value">{currentPositionText}</p>
            </div>
            <div>
              <span className="info-title">ML Risk Score:</span>
              <p className={`risk-score ${riskColorClass}`}>
                {(risk * 100).toFixed(0)}%
              </p>
              <p className="risk-note">
                (Above 65% triggers High Risk visual alerts)
              </p>
            </div>
          </div>

          {DEV_MODE && (
            <div className="dev-mode">
              <p>
                Currently running in <strong>DEV MODE</strong> with simulated
                data points.
              </p>
            </div>
          )}
        </div>

        {/* MAP CONTAINER */}
        <div className="map-wrapper">
          <div id="map" className="map-view"></div>

          {/* ADD ROUTE MODAL */}
          {isModalOpen && (
            <AddPathModal
              isVisible={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onStartTracking={(s, d) => {
                console.log("Tracking started:", s, "→", d);
                setIsModalOpen(false);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
