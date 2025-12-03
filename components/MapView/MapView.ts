// components/MapView/MapView.ts

import React from 'react';
import { MapMarkerProps, MapPolylineProps, MapViewProps } from 'react-native-maps';

const MapView = (props: MapViewProps) => <div />;
const Marker = (props: MapMarkerProps) => <div />;
const Polyline = (props: MapPolylineProps) => <div />;
const PROVIDER_GOOGLE = 'google';

export default MapView;
export { Marker, Polyline, PROVIDER_GOOGLE };
