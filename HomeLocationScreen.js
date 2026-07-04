import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const HomeLocationScreen = ({ route, navigation }) => {
  const { authToken } = route.params;
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const response = await axios.get(`https://api.gajkesaristeels.in/employee/getById?id=${employeeId}`, {
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
        `https://api.gajkesaristeels.in/employee/edit?empId=${employeeId}`,
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
        `https://api.gajkesaristeels.in/employee/edit?empId=${employeeId}`,
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
    try {
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
      
      const employeeId = await AsyncStorage.getItem('employeeId');
      if (!employeeId) {
        throw new Error('Employee ID not found');
      }
      console.log('Employee ID:', employeeId);
      
      console.log('Making API call to update location...');
      const response = await axios.put(
        `https://api.gajkesaristeels.in/employee/edit?empId=${employeeId}`,
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
      console.error('Error in getCurrentLocation:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to set home location. Please try again.'
      );
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
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
                  Latitude: {currentLocation.latitude != null ? Number(currentLocation.latitude).toFixed(6) : 'N/A'}
                </Text>
                <Text style={styles.coordinatesText}>
                  Longitude: {currentLocation.longitude != null ? Number(currentLocation.longitude).toFixed(6) : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={getCurrentLocation}
              >
                <Ionicons name="location-outline" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Update Location</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.dangerButton]} 
                onPress={handleRemoveLocation}
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
              style={[styles.button, styles.primaryButton, styles.fullWidthButton]} 
              onPress={getCurrentLocation}
            >
              <Ionicons name="location-outline" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Use Current Location</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
