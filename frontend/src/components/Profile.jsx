import React, { useState } from "react";
import { useRegistrationData } from "@/context/RegistrationContext";
import { useNavigate } from "react-router-dom";
import { MapPin, Loader2 } from "lucide-react";

import "@/styles/Profile.css";

export default function Profile() {
  const { formData } = useRegistrationData();
  const navigate = useNavigate();

  const fullName = formData.fullName || "Traveler";
  const location = formData.nationality || "Delhi";

  const [gpsLoading, setGpsLoading] = React.useState(true);
  const [currentLocation, setCurrentLocation] = React.useState(null);

  // Fetch Current GPS Location
  React.useEffect(() => {
  if ("geolocation" in navigator) {
    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );

          const data = await res.json();

          const locationName =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.state ||
            "Unknown Location";

          setCurrentLocation(locationName);
        } catch (error) {
          console.error("Location fetch error:", error);
          setCurrentLocation("Unknown Location");
        }

        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        setCurrentLocation("Unable to fetch");
        setGpsLoading(false);
      }
    );
  } else {
    setCurrentLocation("Not Supported");
    setGpsLoading(false);
  }
}, []);


  const handleSOS = () => {
    alert("🚨 SOS Alert Triggered! Emergency contacts notified.");
  };

  const handleCall = (number) => {
    window.location.href = `tel:${number}`;
  };

  const handleViewMap = () => {
    navigate("/live-tracking");
  };

  return (
    <article className="profile-page grid-layout">
      <section className="safety-header header-area">
        <h1>Hello, {fullName}</h1>
        <p className="location-text">{location}</p>
        <div className="current-location-wrapper">
          <MapPin className="current-location-icon" />

          {gpsLoading ? (
            <span className="current-location-loading">
              <Loader2 className="loader-icon" />
              Getting location...
            </span>
          ) : (
            <span className="current-location-text"> {currentLocation}</span>
          )}
        </div>
      </section>

      <div className="action-column action-area">
        <section className="sos-section">
          <button className="sos-button" onClick={handleSOS}>
            SOS
          </button>
        </section>

        <section className="emergency-numbers">
          <button
            className="quick-action-button"
            onClick={() => handleCall(100)}
          >
            Police 100
          </button>
          <button
            className="quick-action-button medical"
            onClick={() => handleCall(108)}
          >
            Medical 108
          </button>
        </section>

        <section className="navigation-actions">
          <button className="quick-nav-button" onClick={handleViewMap}>
            View Map
          </button>
        </section>
      </div>
    </article>
  );
}
