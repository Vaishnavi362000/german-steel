import { useState, useEffect } from 'react';
import NetInfo from "@react-native-community/netinfo";
import * as Location from 'expo-location';

const getConnectionStrength = (state) => {
  if (!state.isConnected || !state.isInternetReachable) {
    return 'poor';
  }

  if (state.type === 'wifi') {
    const signalStrength = state.details?.strength || state.details?.level;
    if (signalStrength !== undefined) {
      if (signalStrength >= -50) return 'excellent';
      if (signalStrength >= -60) return 'good';
      if (signalStrength >= -70) return 'fair';
      return 'poor';
    }
  } else if (state.type === 'cellular') {
    const generation = state.details?.cellularGeneration;
    const signalStrength = state.details?.strength || state.details?.level;
    
    if (generation === '4g' || generation === '5g') {
      if (signalStrength >= 0.8) return 'excellent';
      if (signalStrength >= 0.6) return 'good';
      if (signalStrength >= 0.4) return 'fair';
      return 'poor';
    } else if (generation === '3g') {
      if (signalStrength >= 0.7) return 'good';
      if (signalStrength >= 0.5) return 'fair';
      return 'poor';
    }
    return 'poor';
  }
  
  return 'unknown';
};

export const useConnectivityStatus = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isConnected: false,
    type: null,
    strength: 'unknown',
    isInternetReachable: false
  });
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  useEffect(() => {
    // Network connectivity check with enhanced status
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setNetworkStatus({
        isConnected: state.isConnected,
        type: state.type,
        strength: getConnectionStrength(state),
        isInternetReachable: state.isInternetReachable
      });
    });

    // Location permission check
    const checkLocationPermission = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setIsLocationEnabled(status === 'granted');
      } catch (error) {
        console.error('Location permission check error:', error);
        setIsLocationEnabled(false);
      }
    };

    checkLocationPermission();

    // Periodic checks
    const networkInterval = setInterval(() => {
      NetInfo.fetch().then(state => {
        setNetworkStatus({
          isConnected: state.isConnected,
          type: state.type,
          strength: getConnectionStrength(state),
          isInternetReachable: state.isInternetReachable
        });
      });
    }, 30000); // Check every 30 seconds

    const locationInterval = setInterval(checkLocationPermission, 60000); // Check every minute

    // Cleanup
    return () => {
      unsubscribeNetInfo();
      clearInterval(networkInterval);
      clearInterval(locationInterval);
    };
  }, []);

  return { networkStatus, isLocationEnabled };
}; 