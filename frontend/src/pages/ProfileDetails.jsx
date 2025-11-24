import React, { useEffect } from "react";
import { useRegistrationData } from "@/context/RegistrationContext";
import "@/styles/ProfileDetails.css";
import { User, Phone, Mail, IdCard, MapPin, Hash, Shield } from "lucide-react";

export default function ProfileDetails() {
  const { formData } = useRegistrationData();

  useEffect(() => {
    if (!formData || Object.keys(formData).length === 0) {
      alert("⚠️ Please register first!");
    }

  }, [formData]);

  if (!formData || Object.keys(formData).length === 0) {
    return null; 
  }

  return (
    <main className="details-page">
      <div className="details-card">
        <h2 className="details-title">Your Details</h2>

        <div className="details-grid">

          <div className="detail-item">
            <User className="detail-icon" />
            <div>
              <p className="detail-label">Full Name</p>
              <p className="detail-value">{formData.fullName}</p>
            </div>
          </div>

          <div className="detail-item">
            <Hash className="detail-icon" />
            <div>
              <p className="detail-label">Age</p>
              <p className="detail-value">{formData.age}</p>
            </div>
          </div>

          <div className="detail-item">
            <Mail className="detail-icon" />
            <div>
              <p className="detail-label">Email</p>
              <p className="detail-value">{formData.email}</p>
            </div>
          </div>

          <div className="detail-item">
            <Shield className="detail-icon" />
            <div>
              <p className="detail-label">Password</p>
              <p className="detail-value">
                {formData.password ? "••••••••" : "Not Provided"}
              </p>
            </div>
          </div>

          <div className="detail-item">
            <Phone className="detail-icon" />
            <div>
              <p className="detail-label">Phone Number</p>
              <p className="detail-value">{formData.phoneNumber}</p>
            </div>
          </div>

          <div className="detail-item">
            <MapPin className="detail-icon" />
            <div>
              <p className="detail-label">Nationality</p>
              <p className="detail-value">{formData.nationality}</p>
            </div>
          </div>

          <div className="detail-item">
            <IdCard className="detail-icon" />
            <div>
              <p className="detail-label">Aadhaar</p>
              <p className="detail-value">{formData.aadhar}</p>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
