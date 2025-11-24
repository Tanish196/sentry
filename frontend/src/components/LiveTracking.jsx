import React, { useState, useEffect, useRef, useCallback } from 'react';
import {Plus} from 'lucide-react';

import AddPathModal from "@/pages/AddPathModel";
import LeafletMapViewer from "@/pages/LeafletMapViewer";

export default function LiveTracking() {

    const [isModalVisible, setIsModalVisible] = useState(false); 
    
    const [currentRoute, setCurrentRoute] = useState({ 
        start: 'Awaiting Route...', 
        destination: 'Awaiting Route...' 
    });
    
    const handleRouteStart = (start, destination) => {
        setCurrentRoute({ start, destination });
    };

    return (
        <div className="h-screen w-screen relative">
            
            {/* NOTE: Props updated to match LeafletMapViewer signature (start, destination) */}
            <LeafletMapViewer 
                start={currentRoute.start} 
                destination={currentRoute.destination} 
            />

            <button 
                onClick={() => setIsModalVisible(true)}
                className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition duration-200 z-40 font-semibold flex items-center"
            >
                <Plus className="w-5 h-5 mr-1" /> New Route
            </button>

            {/* The Modal for initiating the tracking session */}
            <AddPathModal 
                isVisible={isModalVisible} 
                onClose={() => setIsModalVisible(false)}
                onStartTracking={handleRouteStart}
            />
        </div>
    );
}