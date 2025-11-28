import React from 'react';
import MapView from '../components/MapView';

export default function LeafletMapViewer({ start, destination }) {
  return <MapView start={start} destination={destination} />;
}
