import React from "react";
import { Link } from "react-router-dom";
import Header from  "@/components/Header";
import BackgroundAnimation from "@/components/r3f/BackgroundAnimation";

import "@/styles/HelpCenter.css";

export default function HelpCenter() {
  return (
    <>
        <Header />
        <BackgroundAnimation />
      <article className="help-center-page content-container">
        <h2>Traveler Safety Help Center 🚨</h2>
        <p>
          Your safety is our priority. Here are answers to common questions
          about using the Smart Tourist Safety Monitoring System.
        </p>

        <section className="help-section">
          <h3>1. Emergency & SOS Features</h3>
          <div className="help-item">
            <h4>How does the SOS button work?</h4>
            <p>
              When you press the **SOS button** on your Profile Dashboard, the
              system immediately records and transmits your **real-time GPS
              location** to your registered Emergency Contacts and local
              authorities (Police/Medical Services).
            </p>
            <p className="note">
              ⚠️ **Note:** This function requires active network connectivity
              and location services.
            </p>
          </div>
          <div className="help-item">
            <h4>How do I call a contact quickly?</h4>
            <p>
              On your Profile Dashboard, quick-action buttons are available to
              call national emergency numbers (e.g., Police 100, Medical 108) or
              any previously added Emergency Contact.
            </p>
          </div>
        </section>

        <section className="help-section">
          <h3>2. Managing Travel Paths</h3>
          <div className="help-item">
            <h4>How do I add a new path?</h4>
            <p>
              Go to the Profile Dashboard and click **'Add Path'**. Enter your
              Start and Destination points. The system will use the Bhuvan API
              to calculate and monitor your route.
            </p>
          </div>
          <div className="help-item">
            <h4>What if I deviate from the route?</h4>
            <p>
              The system monitors your current location against your planned
              path. If a significant deviation occurs, your emergency contacts
              may receive an automated alert asking them to check in with you.
            </p>
          </div>
          <div className="help-item">
            <h4>How can I update my contacts?</h4>
            <p>
              You can manage multiple contacts, their phone numbers, and
              relationships on the{" "}
              <Link to="/emergency-contacts">
                **Update Emergency Contacts**
              </Link>{" "}
              page.
            </p>
          </div>
        </section>

        <section className="help-section">
          <h3>3. Account & Technical Support</h3>
          <div className="help-item">
            <h4>Where is my Digital ID?</h4>
            <p>
              Your Digital ID information, including your medical details and
              emergency contact summary, is displayed on your main Profile
              Dashboard.
            </p>
          </div>
          <div className="help-item">
            <h4>Contact Support</h4>
            <p>
              If you have an issue that isn't covered here, please email us at{" "}
              <a href="mailto:support@touristsafety.in">
                support@touristsafety.in
              </a>
              .
            </p>
          </div>
        </section>
      </article>
    </>
  );
}
