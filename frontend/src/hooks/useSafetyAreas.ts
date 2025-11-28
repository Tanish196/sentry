import { useState, useEffect } from 'react';

interface SafetyPolygonsResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: any[];
    };
    properties: {
      station_name: string;
      district: string;
      range: string;
      subdivision: string;
      safety_score: number;
      predicted_label: string;
      risk_level: 'safe' | 'caution' | 'forbidden';
      aqi: number | null;
      features_used: {
        gender: string;
        family: boolean;
        month: number;
        day: number;
      };
    };
  }>;
  metadata: {
    generated_at: string;
    median_aqi: number | null;
    total_features: number;
  };
}

interface UseSafetyAreasOptions {
  month?: number;
  day?: number;
  useCurrentConditions?: boolean;
  refreshInterval?: number; // milliseconds, default: 10 min
}

interface UseSafetyAreasResult {
  data: SafetyPolygonsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CACHE_KEY = 'safety_areas_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useSafetyAreas(options: UseSafetyAreasOptions = {}): UseSafetyAreasResult {
  const {
    month,
    day,
    useCurrentConditions = true,
    refreshInterval = 30 * 60 * 1000, // 30 minutes
  } = options;

  const [data, setData] = useState<SafetyPolygonsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSafetyAreas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      // Build query params
      const params = new URLSearchParams();
      if (month !== undefined) params.append('month', month.toString());
      if (day !== undefined) params.append('day', day.toString());
      params.append('use_current_conditions', useCurrentConditions.toString());

      const response = await fetch(`http://localhost:8000/api/safety-areas?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch safety areas: ${response.status} ${response.statusText}`);
      }

      const result: SafetyPolygonsResponse = await response.json();
      
      // Cache the result
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: result, timestamp: Date.now() })
      );

      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useSafetyAreas error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafetyAreas();

    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchSafetyAreas();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [month, day, useCurrentConditions, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchSafetyAreas,
  };
}
