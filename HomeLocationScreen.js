import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, Linking } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  getMobileActionLocation,
  getMobileLocationErrorContent,
} from './MobileLocationService';

const HomeLocationScreen = ({ route, navigation }) => {
  const { authToken } = route.params;
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const response = await axios.get(`${API_BASE_URL}/employee/getById?id=${employeeId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        
        if (response.data.houseLatitude != null && response.data.houseLongitude != null && response.data.houseLatitude !== 0 && response.data.houseLongitude !== 0) {
          setCurrentLocation({
            latitude: response.data.houseLatitude,
            longitude: response.data.houseLongitude,
          });
        } else {
          setCurrentLocation(null);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching location data:', error);
        Alert.alert('Error', 'Failed to fetch location data. Please try again.');
        setLoading(false);
      }
    };

    fetchLocationData();
  }, [authToken]);

  const handleSaveLocation = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.put(
        `${API_BASE_URL}/employee/edit?empId=${employeeId}`,
        {
          houseLatitude: currentLocation.latitude,
          houseLongitude: currentLocation.longitude
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      if (response.status === 200) {
        Alert.alert('Success', 'Home location updated successfully');
      } else {
        throw new Error('Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'Failed to update location. Please try again.');
    }
  };

  const handleRemoveLocation = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.put(
        `${API_BASE_URL}/employee/edit?empId=${employeeId}`,
        {
          houseLatitude: 0,
          houseLongitude: 0
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.status === 200) {
        setCurrentLocation(null);
        Alert.alert('Success', 'Home location removed successfully');
      } else {
        throw new Error('Failed to remove location');
      }
    } catch (error) {
      console.error('Error removing location:', error);
      Alert.alert('Error', 'Failed to remove location. Please try again.');
    }
  };

  const getCurrentLocation = async () => {
    if (isUpdatingLocation) return;

    try {
      setIsUpdatingLocation(true);
      console.log('Getting current location...');
      const location = await getMobileActionLocation({
        requirePrecise: false,
        timeoutMs: 60000,
        cacheMaxAgeMs: 300000,
        cacheRequiredAccuracy: 1000,
        balancedRequiredAccuracy: 1000,
      });

      if (!location || !location.coords) {
        throw new Error('No location data received');
      }

      console.log('Current position:', location.coords);
      
      const employeeId = await AsyncStorage.getItem('employeeId');
      if (!employeeId) {
        throw new Error('Employee ID not found');
      }
      console.log('Employee ID:', employeeId);
      
      console.log('Making API call to update location...');
      const response = await axios.put(
        `${API_BASE_URL}/employee/edit?empId=${employeeId}`,
        {
          houseLatitude: location.coords.latitude,
          houseLongitude: location.coords.longitude
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 10000, // 10 second timeout
        }
      ).catch(error => {
        console.error('API call error:', error);
        throw new Error('Failed to update location on server');
      });

      console.log('API response:', response.status, response.data);

      if (response.status === 200) {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        Alert.alert('Success', 'Home location set successfully');
      } else {
        throw new Error('Failed to set location');
      }
    } catch (error) {
      if (error?.isLocationError || error?.code?.startsWith?.('location_') || error?.code === 'permission_denied') {
        console.warn('Home location could not be updated:', {
          code: error?.code || 'location_unavailable',
          message: error?.message || String(error),
        });
        const content = getMobileLocationErrorContent(error, 'set home location');
        const buttons = content.canOpenSettings
          ? [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'OK', style: 'cancel' },
          ]
          : [{ text: 'OK' }];
        Alert.alert(content.title, content.message, buttons);
      } else {
        console.error('Error updating home location:', error);
        Alert.alert(
          'Error',
          error.message || 'Failed to set home location. Please try again.'
        );
      }
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="#6C63FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Home Location</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading home location...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Location</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {currentLocation ? (
          <>
            <View style={styles.locationInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="home" size={32} color="#6C63FF" />
              </View>
              <Text style={styles.locationTitle}>Current Home Location</Text>
              <View style={styles.coordinatesContainer}>
                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>Latitude</Text>
                  <Text style={styles.coordinateValue}>
                    {currentLocation.latitude != null ? Number(currentLocation.latitude).toFixed(6) : 'N/A'}
                  </Text>
                </View>
                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>Longitude</Text>
                  <Text style={styles.coordinateValue}>
                    {currentLocation.longitude != null ? Number(currentLocation.longitude).toFixed(6) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isUpdatingLocation && styles.disabledButton]}
                onPress={getCurrentLocation}
                disabled={isUpdatingLocation}
              >
                {isUpdatingLocation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="location-outline" size={24} color="#FFFFFF" />
                )}
                <Text style={styles.buttonText}>{isUpdatingLocation ? 'Updating...' : 'Update Location'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.dangerButton, isUpdatingLocation && styles.disabledButton]}
                onPress={handleRemoveLocation}
                disabled={isUpdatingLocation}
              >
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={48} color="#6C63FF" />
            </View>
            <Text style={styles.emptyStateTitle}>No Home Location Set</Text>
            <Text style={styles.emptyStateSubtitle}>Set your current location as home</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, styles.fullWidthButton, isUpdatingLocation && styles.disabledButton]}
              onPress={getCurrentLocation}
              disabled={isUpdatingLocation}
            >
              {isUpdatingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="location-outline" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>{isUpdatingLocation ? 'Fetching...' : 'Use Current Location'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  locationInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  coordinatesContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  coordinateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  coordinateLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  coordinateValue: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
  },
  disabledButton: {
    opacity: 0.65,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  fullWidthButton: {
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  }
});

export default HomeLocationScreen;
