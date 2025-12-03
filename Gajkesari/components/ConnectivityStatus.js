import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useConnectivityStatus } from '../hooks/useConnectivityStatus';

const getNetworkColor = (networkStatus) => {
  if (!networkStatus.isConnected || !networkStatus.isInternetReachable) {
    return '#FF3B30'; // Red for no connection
  }

  switch (networkStatus.strength) {
    case 'excellent':
      return '#34C759'; // Green
    case 'good':
      return '#87D068'; // Light green
    case 'fair':
      return '#FFC107'; // Yellow
    case 'poor':
      return '#FF9500'; // Orange
    default:
      return '#8E8E93'; // Gray for unknown
  }
};

export const ConnectivityStatusIcons = () => {
  const { networkStatus, isLocationEnabled } = useConnectivityStatus();

  return (
    <View style={styles.container}>
      {/* Network status dot */}
      <View style={[
        styles.dot,
        { backgroundColor: getNetworkColor(networkStatus) }
      ]} />
      
      {/* Location status triangle */}
      <View style={[
        styles.triangle,
        { borderBottomColor: isLocationEnabled ? '#34C759' : '#FF3B30' }
      ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  }
}); 