import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

class LocationService {
  static async isWithinWorkingHours() {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const hours = now.getHours();
    
    // Check if it's not Sunday and within working hours (9 AM to 8 PM)
    return day !== 0 && hours >= 9 && hours <= 20;
  }

  static async updateLocation(location) {
    try {
      if (!await this.isWithinWorkingHours()) {
        console.log('Outside working hours or Sunday, skipping location update');
        return;
      }

      const employeeId = await AsyncStorage.getItem('employeeId');
      const token = await AsyncStorage.getItem('userToken');

      if (!employeeId || !token) {
        console.error('Missing employeeId or token');
        return;
      }

      const response = await axios.put(
        `https://api.gajkesaristeels.in/employee/updateLiveLocation?id=${employeeId}&latitude=${location.coords.latitude}&longitude=${location.coords.longitude}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Location update response:', response.data);
      return response.data === 'Location Updated!';
    } catch (error) {
      console.error('Error updating location:', error);
      return false;
    }
  }

  static async getCurrentLocation() {
    try {
      const { status: foregroundStatus } = 
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.error('Location permissions not granted');
        return null;
      }

      // Try to get location with multiple fallback options
      const locationPromises = [
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000
        }).catch(() => null),

        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000
        }).catch(() => null),

        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeout: 5000
        }).catch(() => null),

        Location.getLastKnownPositionAsync({
          maxAge: 300000,
          requiredAccuracy: 100
        }).catch(() => null)
      ];

      const results = await Promise.all(locationPromises);
      const location = results.find(result => result !== null);

      if (!location) {
        throw new Error('Could not get location');
      }

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }
}

export default LocationService;