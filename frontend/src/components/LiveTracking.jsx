import React, { useState, useEffect, useRef, useCallback } from 'react';
import {Plus} from 'lucide-react';

import AddPathModal from "@/pages/AddPathModel";
import LeafletMapViewer from "@/pages/LeafletMapViewer";
import { useSafetyAreas } from '@/hooks/useSafetyAreas';

export default function LiveTracking() {

    const [isModalVisible, setIsModalVisible] = useState(false); 
    
    const [currentRoute, setCurrentRoute] = useState({ 
        start: 'Awaiting Route...', 
        destination: 'Awaiting Route...' 
    });
    
    const handleRouteStart = (start, destination) => {
        setCurrentRoute({ start, destination });
    };

    const { refetch } = useSafetyAreas({ useCurrentConditions: true });

    // Fetch once on mount, no need to refetch on every render
    useEffect(() => {
        refetch();
    }, []); // Empty dependency array to prevent infinite loop

    return (
        <div className="h-screen w-screen relative">
            
            {/* NOTE: Props updated to match LeafletMapViewer signature (start, destination) */}
            <LeafletMapViewer 
                start={currentRoute.start} 
                destination={currentRoute.destination} 
            />

            {/* Blue capsule button removed - routing is handled through the sidebar panel */}

            {/* The Modal for initiating the tracking session */}
            <AddPathModal 
                isVisible={isModalVisible} 
                onClose={() => setIsModalVisible(false)}
                onStartTracking={handleRouteStart}
            />
        </div>
    );
}