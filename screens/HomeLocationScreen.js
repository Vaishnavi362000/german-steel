import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const HomeLocationScreen = ({ route, navigation }) => {
  const { authToken } = route.params;
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);
  const [requestingReset, setRequestingReset] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [canEditLocation, setCanEditLocation] = useState(false);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        console.log('🔵 [HOME LOCATION] Fetching employee data from /employee/me...');
        const response = await axios.get('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/me', {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        });
        
        console.log('🔵 [HOME LOCATION] Employee data received:', response.data);
        
        // Check if response is HTML instead of JSON (ngrok or auth issue)
        const isHtmlResponse = typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
        
        if (isHtmlResponse) {
          console.log('⚠️ [HOME LOCATION] Server returned HTML instead of JSON - skipping location fetch');
          setCurrentLocation(null);
          setLoading(false);
          return;
        }
        
        // Store employee ID from 'id' field
        const employeeId = response.data.id;
        if (employeeId) {
          await AsyncStorage.setItem('employeeId', employeeId.toString());
          setEmployeeId(employeeId);
        }
        // If a request is already pending, reflect that in UI
        if (response.data && response.data.locationChangeRequested === true) {
          setResetRequested(true);
        }
        const { houseLatitude, houseLongitude } = response.data;
        const hasValidCoordinates =
          typeof houseLatitude === 'number' &&
          typeof houseLongitude === 'number' &&
          !Number.isNaN(houseLatitude) &&
          !Number.isNaN(houseLongitude) &&
          houseLatitude !== 0 &&
          houseLongitude !== 0;

        if (hasValidCoordinates) {
          setCurrentLocation({
            latitude: houseLatitude,
            longitude: houseLongitude,
          });
        } else {
          setCurrentLocation(null);
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ [HOME LOCATION] Error fetching location data:', error);
        Alert.alert('Error', 'Failed to fetch location data. Please try again.');
        setLoading(false);
      }
    };

    fetchLocationData();
  }, [authToken]);

  useEffect(() => {
    const fetchEmployeeById = async () => {
      if (!employeeId) return;
      try {
        const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/get?id=${employeeId}`;
        console.log('🔵 [HOME LOCATION] GET Employee By ID - Endpoint:', endpoint);
        const response = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        });
        console.log('🔵 [HOME LOCATION] GET Employee By ID - Response:', response.data);
        if (response && response.data) {
          setCanEditLocation(!!response.data.canEditLocation);
        }
      } catch (error) {
        console.error('❌ [HOME LOCATION] Error fetching employee by ID:', error);
      }
    };

    fetchEmployeeById();
  }, [employeeId, authToken]);

  const handleSaveLocation = async () => {
    try {
      const response = await axios.put(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/editOwnDetails`,
        {
          houseLatitude: currentLocation.latitude,
          houseLongitude: currentLocation.longitude
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
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

  const handleRequestLocationReset = async () => {
    try {
      setRequestingReset(true);
      const id = employeeId || (await AsyncStorage.getItem('employeeId'));
      if (!id) {
        Alert.alert('Error', 'Employee ID not found. Please re-login and try again.');
        return;
      }

      console.log('🔵 [HOME LOCATION] POST /employee/requestLocationChange?employeeId=', id);

      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/requestLocationChange?employeeId=${id}`;
      const payload = null;
      console.log('🔵 [HOME LOCATION] Request Location Change - Endpoint:', endpoint);
      console.log('🔵 [HOME LOCATION] Request Location Change - Payload:', payload);

      const response = await axios.post(
        endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
          timeout: 10000,
        }
      );

      // Server may return plain text or JSON; normalize message
      const successMessage =
        (response && response.data && typeof response.data === 'string')
          ? response.data
          : 'Location change request submitted successfully. Please wait for admin approval.';

      setResetRequested(true);
      Alert.alert('Request Sent', successMessage);
    } catch (error) {
      console.error('Error requesting location change:', error);
      if (error && error.response && error.response.status === 400) {
        setResetRequested(true);
        Alert.alert('Info', 'A location change request is already pending approval.');
      } else {
        Alert.alert('Error', 'Failed to submit request. Please try again.');
      }
    } finally {
      setRequestingReset(false);
    }
  };

  

  const getCurrentLocation = async () => {
    try {
      setIsSettingLocation(true);
      console.log('Getting current location...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        return;
      }

      console.log('Getting position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      }).catch(error => {
        console.error('Error getting position:', error);
        throw new Error('Failed to get current position');
      });

      if (!location || !location.coords) {
        throw new Error('No location data received');
      }

      console.log('Current position:', location.coords);

      console.log('Making API call to update location...');
      const response = await axios.put(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/editOwnDetails`,
        {
          houseLatitude: location.coords.latitude,
          houseLongitude: location.coords.longitude
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
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
        // After successfully setting location, further edits should require a request
        setCanEditLocation(false);
        Alert.alert('Success', 'Home location set successfully');
      } else {
        throw new Error('Failed to set location');
      }
    } catch (error) {
      console.error('Error in getCurrentLocation:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to set home location. Please try again.'
      );
    } finally {
      setIsSettingLocation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home Location</Text>
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
                <Text style={styles.coordinatesText}>
                  Latitude:{' '}
                  {typeof currentLocation.latitude === 'number'
                    ? currentLocation.latitude.toFixed(6)
                    : 'N/A'}
                </Text>
                <Text style={styles.coordinatesText}>
                  Longitude:{' '}
                  {typeof currentLocation.longitude === 'number'
                    ? currentLocation.longitude.toFixed(6)
                    : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              {canEditLocation ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.primaryButton,
                      isSettingLocation && styles.disabledButton,
                    ]}
                    onPress={getCurrentLocation}
                    disabled={isSettingLocation}
                  >
                    {isSettingLocation ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="location-outline" size={24} color="#FFFFFF" />
                    )}
                    <Text style={styles.buttonText}>
                      {isSettingLocation ? 'Updating Location...' : 'Use Current Location'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    (requestingReset || resetRequested) && styles.disabledButton,
                  ]}
                  onPress={handleRequestLocationReset}
                  disabled={requestingReset || resetRequested}
                >
                  {requestingReset ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
                  )}
                  <Text style={styles.buttonText}>
                    {resetRequested ? 'Request Sent' : 'Request Location Change'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={48} color="#6C63FF" />
            </View>
            <Text style={styles.emptyStateTitle}>No Home Location Set</Text>
            <Text style={styles.emptyStateSubtitle}>Set your current location as home</Text>
            
            {canEditLocation ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  styles.fullWidthButton,
                  isSettingLocation && styles.disabledButton
                ]}
                onPress={getCurrentLocation}
                disabled={isSettingLocation}
              >
                {isSettingLocation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="location-outline" size={24} color="#FFFFFF" />
                )}
                <Text style={styles.buttonText}>
                  {isSettingLocation ? 'Setting Location...' : 'Use Current Location'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  styles.fullWidthButton,
                  (requestingReset || resetRequested) && styles.disabledButton
                ]}
                onPress={handleRequestLocationReset}
                disabled={requestingReset || resetRequested}
              >
                {requestingReset ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
                )}
                <Text style={styles.buttonText}>
                  {resetRequested ? 'Request Sent' : 'Request Location Change'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  coordinatesContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  coordinatesText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  fullWidthButton: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  }
});

export default HomeLocationScreen;
