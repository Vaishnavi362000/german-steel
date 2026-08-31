import { API_BASE_URL } from './config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getVisitActionLocation } from './MobileLocationService';

const LOCATION_RETRY_COOLDOWN_MS = 2 * 60 * 1000;
let lastLocationFailureAt = 0;

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
        console.warn('Skipping live location update: missing employeeId or token');
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/employee/updateLiveLocation?id=${employeeId}&latitude=${location.coords.latitude}&longitude=${location.coords.longitude}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Location update response:', response.data);
      return response.data === 'Location Updated!';
    } catch (error) {
      const status = error?.response?.status;
      const detail = error?.response?.data || error?.message;
      console.warn('Live location update skipped:', { status, detail });
      return false;
    }
  }

  static async updateCurrentLocation() {
    const location = await this.getCurrentLocation();
    if (!location) return null;

    await this.updateLocation(location);
    return location;
  }

  static async getCurrentLocation() {
    if (Date.now() - lastLocationFailureAt < LOCATION_RETRY_COOLDOWN_MS) {
      return null;
    }

    try {
      const location = await getVisitActionLocation({
        requirePrecise: false,
        timeoutMs: 60000,
        cacheMaxAgeMs: 300000,
        cacheRequiredAccuracy: 1000,
        balancedRequiredAccuracy: 1000,
      });
      lastLocationFailureAt = 0;
      return location;
    } catch (error) {
      lastLocationFailureAt = Date.now();
      console.warn('Live location fetch skipped:', {
        code: error?.code || 'location_unavailable',
        message: error?.message || String(error),
      });
      return null;
    }
  }
}

export default LocationService;
