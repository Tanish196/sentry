import React, { useState } from 'react';
import { MapPin, AlertTriangle, Truck, Loader2, X } from 'lucide-react';
import '@/styles/AddPathModel.css';

export default function AddPathModal({ isVisible, onClose, onStartTracking }) {
  const [startLocation, setStartLocation] = useState('New Delhi');
  const [destination, setDestination] = useState('Mumbai');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isVisible) return null;

  const handleStartTracking = async (e) => {
    e.preventDefault();
    setError(null);

    if (!startLocation || !destination) {
      setError('Please enter both a start location and a destination.');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (onStartTracking) onStartTracking(startLocation, destination);
      onClose();
    } catch {
      setError('Failed to start tracking session. (Mocked error)');
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
            <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleStartTracking}>
          <div className="add-path-form">
            <div>
              <label htmlFor="start" className="add-path-label">
                Start Location
              </label>
              <input
                id="start"
                type="text"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                disabled={isLoading}
                className="add-path-input"
              />
            </div>

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
