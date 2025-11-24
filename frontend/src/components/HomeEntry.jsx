import { useNavigate } from "react-router-dom";
import  Button  from "@/components/ui/button/Button";
import BackgroundAnimation from "@/components/r3f/BackgroundAnimation";

import "@/styles/HomeEntry.css";

export default function HomeEntry() {
  return (
    <div className="landing-page">
      <BackgroundAnimation />

      <div className="landing-title">
        <h2 className="entry-title">Welcome To SENTRY</h2>
        <h3 className="entry-subtitle">
          Stay safe, stay connected — anywhere you travel
        </h3>
      </div>

    </div>
  );
}
