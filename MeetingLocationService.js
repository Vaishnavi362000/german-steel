import * as Location from 'expo-location';
import { getMobileActionLocation } from './MobileLocationService';

const MEETING_LOCATION_OPTIONS = {
  requirePrecise: false,
  timeoutMs: 15000,
  highAccuracyTimeoutMs: 10000,
  cacheMaxAgeMs: 120000,
  cacheRequiredAccuracy: 200,
  balancedRequiredAccuracy: 200,
  highRequiredAccuracy: 120,
};

const REVERSE_GEOCODE_TIMEOUT_MS = 7000;

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('reverse_geocode_timeout')), timeoutMs);

  promise.then(
    (value) => {
      clearTimeout(timer);
      resolve(value);
    },
    (error) => {
      clearTimeout(timer);
      reject(error);
    }
  );
});

export const formatMeetingLocationAddress = (place, coords) => {
  const addressParts = [
    place?.name,
    place?.street,
    place?.district,
    place?.city,
    place?.subregion,
    place?.region,
    place?.postalCode,
  ].filter(Boolean);

  if (addressParts.length > 0) {
    return [...new Set(addressParts)].join(', ');
  }

  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
};

export const getMeetingCurrentLocation = async ({ onStatus } = {}) => {
  const position = await getMobileActionLocation({
    ...MEETING_LOCATION_OPTIONS,
    onStatus,
  });
  const coords = position.coords;

  let place = null;
  try {
    const results = await withTimeout(
      Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      REVERSE_GEOCODE_TIMEOUT_MS
    );
    place = results?.[0] || null;
  } catch (error) {
    console.warn('Unable to reverse geocode meeting location:', error.message);
  }

  return {
    coords,
    place,
    locationLabel: formatMeetingLocationAddress(place, coords),
  };
};

export const getMeetingLocationErrorContent = (error, targetLabel = 'meeting location') => {
  const code = error?.code;

  switch (code) {
    case 'permission_denied':
      return {
        title: 'Location Permission Needed',
        message: `Please allow location access to fill the ${targetLabel}.`,
        canOpenSettings: error?.canOpenSettings,
      };
    case 'precise_required':
      return {
        title: 'Precise Location Needed',
        message: `Android has granted approximate location only. Enable precise location to fill the ${targetLabel}.`,
        canOpenSettings: true,
      };
    case 'services_disabled':
      return {
        title: 'Location Services Disabled',
        message: 'Turn on device location services, then try again.',
        canOpenSettings: true,
      };
    case 'provider_unavailable':
      return {
        title: 'Location Provider Unavailable',
        message: 'Android location providers are not ready. Turn on GPS/network location or move to an area with better signal.',
        canOpenSettings: true,
      };
    case 'location_timeout':
      return {
        title: 'Location Timeout',
        message: 'We could not get a fresh location in time, and no recent saved location was available. Please try again or enter the location manually.',
      };
    case 'location_accuracy_low':
      return {
        title: 'Location Accuracy Too Low',
        message: 'The current and saved locations are not accurate enough. Try again from an area with better GPS or network signal.',
        canOpenSettings: true,
      };
    default:
      return {
        title: 'Location Unavailable',
        message: `Unable to fetch the ${targetLabel}. Please try again or enter it manually.`,
      };
  }
};
