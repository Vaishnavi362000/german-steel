import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const useLocationUpdate = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      console.log('Requesting location permissions...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setErrorMsg('Permission to access location was denied');
        return;
      }

      console.log('Getting current position...');
      let location = await Location.getCurrentPositionAsync({});
      console.log('Location obtained:', location);
      if (isMounted) {
        setLocation(location);
        updateLocationOnServer(location.coords.latitude, location.coords.longitude);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateLocationOnServer = async (latitude, longitude) => {
    try {
      console.log('Updating location on server...');
      const employeeId = await AsyncStorage.getItem('employeeId');
      const token = await AsyncStorage.getItem('userToken');

      if (!employeeId || !token) {
        console.error('Employee ID or token not found');
        return;
      }

      const response = await axios.put(
        `https://api.gajkesaristeels.in/employee/updateLiveLocation?id=${employeeId}&latitude=${latitude}&longitude=${longitude}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data === 'Location Updated!') {
        console.log('Location updated successfully on server');
      } else {
        console.log('Unexpected response when updating location:', response.data);
      }
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  };

  return { location, errorMsg };
};

export default useLocationUpdate;