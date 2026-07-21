import { useEffect, useState } from 'react';
import LocationService from './LocationService';

const useLocationUpdate = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const currentLocation = await LocationService.updateCurrentLocation();
        if (isMounted && currentLocation) {
          setLocation(currentLocation);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMsg(error?.message || 'Unable to update location');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return { location, errorMsg };
};

export default useLocationUpdate;
