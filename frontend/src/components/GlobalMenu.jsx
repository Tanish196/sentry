import React from 'react';
import { Link } from 'react-router-dom';
import "@/styles/GlobalMenu.css";


export default function GlobalMenu({ isOpen, onClose }) {
    if (!isOpen) return null;

    const handleLogout = () => {
        localStorage.removeItem('emergencyData'); 
        alert('Logging out...');
        onClose(); 
    };

    return (
        <div className="global-menu-overlay">
            <nav className="global-menu-content">
                
                <div className="menu-header">
                    <h2>Options & Settings</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <section className="menu-section">
                    <h3>Travel Tools</h3>
                    <ul>
                        <li><Link to="/live-tracking" onClick={onClose}>Home / Safety Map</Link></li>
                        <li><Link to="/emergency-contacts" onClick={onClose}>Update Emergency Contacts</Link></li>
                    </ul>
                </section>
                
                <section className="menu-section">
                    <h3>Account</h3>
                    <ul>
                        <li><Link to="/login" onClick={onClose}>Login</Link></li>
                        <li><button className="logout-button" onClick={handleLogout}>Logout</button></li>
                    </ul>
                </section>

                <section className="menu-section">
                    <h3>Support & Legal</h3>
                    <ul>
                        <li><Link to="/help" onClick={onClose}>Help Center</Link></li>
                        <li><Link to="/privacy" onClick={onClose}>Privacy Policy</Link></li>
                    </ul>
                </section>
                
            </nav>
        </div>
    );
}