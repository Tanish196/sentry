import React, { useState } from 'react';
import { MapPin, AlertTriangle, Truck, Loader2, X, LocateFixed } from 'lucide-react';
import '@/styles/AddPathModel.css';

export default function AddPathModal({ isVisible, onClose, onStartTracking }) {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isVisible) return null;
  const fillWithGPS = () => {
    setGpsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Your browser does not support GPS.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );

          const data = await res.json();
          const address = data.display_name || `${lat}, ${lon}`;

          setStartLocation(address);
        } catch (err) {
          setError("Failed to convert GPS to address.");
        }

        setGpsLoading(false);
      },
      () => {
        setError("Failed to fetch GPS location.");
        setGpsLoading(false);
      }
    );
  };


  const sendDestinationToAPI = async (destinationValue) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("You are not logged in.");
      return false;
    }

    try {
      const res = await fetch("https://sentry-3.onrender.com/destination", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify({ destination: destinationValue })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to update destination.");
        return false;
      }

      console.log("Destination updated:", data);
      return true;
    } catch (err) {
      console.error("API error:", err);
      setError("API request failed.");
      return false;
    }
  };

  // ===========================
  // 🚚 START TRACKING HANDLER
  // ===========================
  const handleStartTracking = async (e) => {
    e.preventDefault();
    setError(null);

    if (!startLocation || !destination) {
      setError("Please enter both a start location and a destination.");
      return;
    }

    setIsLoading(true);

    // 1. Send destination to backend first
    const ok = await sendDestinationToAPI(destination);
    if (!ok) {
      setIsLoading(false);
      return;
    }

    // 2. Continue tracking
    try {
      if (onStartTracking) onStartTracking(startLocation, destination);
      onClose();
    } catch {
      setError("Failed to start tracking session.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-path-overlay" onClick={onClose}>
      <div className="add-path-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button */}
        <button onClick={onClose} className="add-path-close" disabled={isLoading}>
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="add-path-header">
          <MapPin className="w-7 h-7 mr-2" />
          <h2>Start New Tracking</h2>
        </div>

        {/* Error */}
        {error && (
          <div className="add-path-error">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleStartTracking}>
          <div className="add-path-form">

            {/* Start Location */}
            <div>
              <label htmlFor="start" className="add-path-label">
                Start Location
              </label>

              <div className="gps-row">
                <input
                  id="start"
                  type="text"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  disabled={isLoading || gpsLoading}
                  className="add-path-input"
                />

                {/* GPS Button */}
                <button
                  type="button"
                  className="gps-button"
                  onClick={fillWithGPS}
                  disabled={gpsLoading || isLoading}
                >
                  {gpsLoading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <LocateFixed className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Destination */}
            <div>
              <label htmlFor="destination" className="add-path-label">
                Destination
              </label>
              <input
                id="destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={isLoading}
                className="add-path-input"
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="add-path-submit">
            {isLoading ? (
              <Loader2 className="animate-spin mr-3 h-5 w-5" />
            ) : (
              <>
                <Truck className="w-5 h-5 mr-2" />
                Start Live Tracking
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
