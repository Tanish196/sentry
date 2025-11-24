import React from "react";
import "@/styles/PrivacyPolicy.css";
import Header from  "@/components/Header";
import BackgroundAnimation from "@/components/r3f/BackgroundAnimation";
export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <BackgroundAnimation />

      <article className="privacy-policy-page content-container">
        <h2>Privacy Policy & Data Protection 🔒</h2>
        <p>Effective Date: November 12, 2025</p>

        {/* SECTION 1 */}
        <section className="policy-section">
          <h3>1. Overview</h3>
          <p>
            This Privacy Policy describes how the{" "}
            <strong>Smart Tourist Safety System</strong> collects, uses, and
            protects your personal data while using our platform. We are
            committed to ensuring your privacy and safety during your travels.
          </p>
        </section>

        {/* SECTION 2 */}
        <section className="policy-section">
          <h3>2. Information We Collect</h3>
          <p>We only collect data necessary to provide our safety services:</p>
          <ul>
            <li>
              <strong>Personal Information:</strong> Your name, nationality, and
              contact details for profile creation.
            </li>
            <li>
              <strong>Emergency Details:</strong> Information about your
              emergency contacts to alert them in critical situations.
            </li>
            <li>
              <strong>Health Information:</strong> Optional medical details such
              as allergies or conditions for emergency response purposes.
            </li>
            <li>
              <strong>Location Data:</strong> Your GPS coordinates collected
              only during active trips or SOS activation.
            </li>
          </ul>
        </section>

        {/* SECTION 3 */}
        <section className="policy-section">
          <h3>3. How We Use Your Information</h3>
          <p>Your data is used solely to enhance your travel safety:</p>
          <ul>
            <li>
              <strong>Emergency Response:</strong> To notify your emergency
              contacts and local authorities when an SOS is triggered.
            </li>
            <li>
              <strong>Trip Monitoring:</strong> To ensure your real-time
              location aligns with your planned travel path.
            </li>
            <li>
              <strong>Account Management:</strong> To maintain your digital
              profile and verify your identity when accessing our system.
            </li>
          </ul>
          <p className="highlight">
            🚫 We never sell, rent, or trade your personal data for marketing or
            advertising purposes.
          </p>
        </section>

        {/* SECTION 4 */}
        <section className="policy-section">
          <h3>4. Data Protection & Security</h3>
          <p>
            We implement strong security measures, including encryption,
            firewalls, and secure access control. Sensitive data such as
            location and health information is encrypted both in transit and at
            rest.
          </p>
          <p>
            Regular audits and security reviews are conducted to maintain system
            integrity and prevent unauthorized access.
          </p>
        </section>

        {/* SECTION 5 */}
        <section className="policy-section">
          <h3>5. Data Retention</h3>
          <p>
            We retain your personal information only as long as necessary for
            safety monitoring and legal compliance. You can request deletion of
            your account data at any time.
          </p>
        </section>

        {/* SECTION 6 */}
        <section className="policy-section">
          <h3>6. Your Rights</h3>
          <ul>
            <li>Request access to your personal data.</li>
            <li>Request correction or deletion of inaccurate data.</li>
            <li>Withdraw consent for location tracking or SOS services.</li>
            <li>
              Contact our Data Protection Officer (DPO) for any privacy-related
              concerns.
            </li>
          </ul>
        </section>

        {/* SECTION 7 */}
        <section className="policy-section">
          <h3>7. Contact Us</h3>
          <p>
            If you have questions or concerns about your privacy, contact our
            support team at{" "}
            <a href="mailto:privacy@smarttourist.in">privacy@smarttourist.in</a>
            .
          </p>
        </section>
      </article>
    </>
  );
}
