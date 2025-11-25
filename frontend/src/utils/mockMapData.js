// Mock GeoJSON geofence data for Delhi area
// Coordinates format: [longitude, latitude] for GeoJSON spec

export const mockGeofences = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "ps_001",
        name: "Connaught Place High Risk Zone",
        safety_score: 0.18,
        risk_level: "forbidden"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.2090, 28.6300],
            [77.2190, 28.6300],
            [77.2190, 28.6380],
            [77.2090, 28.6380],
            [77.2090, 28.6300]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "ps_002",
        name: "Chandni Chowk Moderate Risk Zone",
        safety_score: 0.45,
        risk_level: "caution"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.2270, 28.6500],
            [77.2370, 28.6500],
            [77.2370, 28.6580],
            [77.2270, 28.6580],
            [77.2270, 28.6500]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "ps_003",
        name: "Karol Bagh High Risk Zone",
        safety_score: 0.22,
        risk_level: "forbidden"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.1850, 28.6450],
            [77.1950, 28.6450],
            [77.1950, 28.6530],
            [77.1850, 28.6530],
            [77.1850, 28.6450]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "ps_004",
        name: "Nehru Place Caution Zone",
        safety_score: 0.52,
        risk_level: "caution"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.2450, 28.5450],
            [77.2550, 28.5450],
            [77.2550, 28.5530],
            [77.2450, 28.5530],
            [77.2450, 28.5450]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "ps_005",
        name: "Dwarka Safe Zone",
        safety_score: 0.82,
        risk_level: "safe"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.0400, 28.5900],
            [77.0500, 28.5900],
            [77.0500, 28.5980],
            [77.0400, 28.5980],
            [77.0400, 28.5900]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "ps_006",
        name: "Saket Safe Zone",
        safety_score: 0.78,
        risk_level: "safe"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.2050, 28.5250],
            [77.2150, 28.5250],
            [77.2150, 28.5330],
            [77.2050, 28.5330],
            [77.2050, 28.5250]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "ps_007",
        name: "Rohini Moderate Risk Zone",
        safety_score: 0.48,
        risk_level: "caution"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.0700, 28.7200],
            [77.0800, 28.7200],
            [77.0800, 28.7280],
            [77.0700, 28.7280],
            [77.0700, 28.7200]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "ps_008",
        name: "Lajpat Nagar High Risk Zone",
        safety_score: 0.25,
        risk_level: "forbidden"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.2400, 28.5650],
            [77.2500, 28.5650],
            [77.2500, 28.5730],
            [77.2400, 28.5730],
            [77.2400, 28.5650]
          ]
        ]
      }
    }
  ]
};

// Mock route response (ORS format with GeoJSON LineString)
export const mockRouteResponse = {
  route: {
    geometry: {
      type: "LineString",
      coordinates: [
        [77.1025, 28.7041], // Start
        [77.1100, 28.7000],
        [77.1200, 28.6950],
        [77.1300, 28.6900],
        [77.1400, 28.6850],
        [77.1500, 28.6800],
        [77.1600, 28.6750],
        [77.1700, 28.6700],
        [77.1800, 28.6650],
        [77.1900, 28.6600],
        [77.2000, 28.6200],
        [77.2090, 28.6139]  // End
      ]
    },
    summary: {
      distance: 15230,  // meters
      duration: 1823    // seconds
    },
    segments: [
      {
        distance: 15230,
        duration: 1823,
        steps: [
          {
            distance: 500,
            duration: 60,
            instruction: "Head northeast"
          },
          {
            distance: 1200,
            duration: 144,
            instruction: "Turn right"
          },
          {
            distance: 800,
            duration: 96,
            instruction: "Continue straight"
          }
        ]
      }
    ]
  }
};

// Helper function to get geofence color based on risk level
export const getGeofenceColor = (riskLevel) => {
  switch (riskLevel) {
    case 'forbidden':
      return { fillColor: '#ef4444', color: '#dc2626', fillOpacity: 0.35 };
    case 'caution':
      return { fillColor: '#f97316', color: '#ea580c', fillOpacity: 0.25 };
    case 'safe':
      return { fillColor: '#22c55e', color: '#16a34a', fillOpacity: 0.15 };
    default:
      return { fillColor: '#6b7280', color: '#4b5563', fillOpacity: 0.2 };
  }
};

// Default Delhi center coordinates
export const DELHI_CENTER = [28.6139, 77.2090]; // [lat, lng]
export const DEFAULT_ZOOM = 12;
