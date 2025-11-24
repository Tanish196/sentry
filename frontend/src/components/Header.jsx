import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalMenu from "@/components/GlobalMenu";

import { useRegistrationData } from "@/context/RegistrationContext";

import logo from "@/assets/tourist-safety.png";
import profileIcon from "@/assets/profile1.svg";
import menuIcon from "@/assets/option.svg";


import "@/styles/Header.css";


export default function Header() {
  const { formData } = useRegistrationData();
  
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDetails = () => {
    if (!formData || Object.keys(formData).length === 0) {
      alert("⚠ Please register first!");
      return;
    }

    navigate("/profile-details");
  };

  return (
    <>
      <header className="header">
        <div className="left-header">
          <img src={logo} alt="logo" />
          <h3>SENTRY</h3>
        </div>
        
        <div className="right-header">
          <button className="action-button profile-link-wrapper" onClick={handleDetails}>
            <img src={profileIcon} alt="profile" className="action-icon" />
          </button>

          <button
            className="menu-toggle-button"
            onClick={() => setIsMenuOpen(true)}
          >
            <img src={menuIcon} alt="menu" className=" menu-icon" />
          </button>
        </div>
      </header>
      
      <GlobalMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
