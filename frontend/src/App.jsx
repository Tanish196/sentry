import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { RegistrationProvider } from '@/context/RegistrationContext'

import Header from "@/components/Header"
import HomeEntry from "@/components/HomeEntry"
import GlobalMenu from "@/components/GlobalMenu"
import LiveTracking from "@/components/LiveTracking"
import Profile from "@/components/Profile"

import Register from "@/pages/Register"
import Emergency from "@/pages/Emergency"
import ProfileDetails from "./pages/ProfileDetails"
import EmergencyContacts from "@/pages/EmergencyContacts"
import HelpCenter from '@/pages/HelpCenter'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import Login from "@/pages/Login";
import LeafletMapViewer from "@/pages/LeafletMapViewer";

import "@/App.css"

export default function App(){  
  return(
    <>
      <Router>
        <RegistrationProvider>
          <Header />
          <Routes>
            <Route path="/" element={<HomeEntry />} />
            <Route path="/register" element={<Register />} />
            <Route path="/globalmenu" element={<GlobalMenu />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/live-tracking" element={<LiveTracking />} />
            <Route path="/emergency-contacts" element={<EmergencyContacts />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/profile-details" element={<ProfileDetails />} />
            <Route path="/map" element={<LeafletMapViewer />} />
          </Routes>
        </RegistrationProvider>
      </Router>
    </>
  )
}