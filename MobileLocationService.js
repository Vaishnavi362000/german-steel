import { Platform } from 'react-native';
import * as Location from 'expo-location';

const DEFAULT_OPTIONS = {
  timeoutMs: 15000,
  highAccuracyTimeoutMs: 10000,
  cacheMaxAgeMs: 120000,
  cacheRequiredAccuracy: 120,
  balancedRequiredAccuracy: 120,
  highRequiredAccuracy: 80,
  requirePrecise: false,
  onStatus: null,
};

let activeLocationRequest = null;

export class MobileLocationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MobileLocationError';
    this.code = code;
    this.isLocationError = true;
    Object.assign(this, details);
  }
}

const notifyStatus = (options, status) => {
  if (typeof options.onStatus === 'function') {
    options.onStatus(status);
  }
};

const withTimeout = (promise, timeoutMs, code) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new MobileLocationError(
      code,
      'Location request timed out. Please try again.'
    ));
  }, timeoutMs);

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

const isPermissionGranted = (permission) => (
  permission?.status === 'granted' || permission?.granted === true
);

const getAndroidAccuracy = (permission) => {
  const accuracy = permission?.android?.accuracy || permission?.accuracy || permission?.grantedAccuracy;
  return typeof accuracy === 'string' ? accuracy.toLowerCase() : accuracy;
};

const isApproximateOnly = (permission) => {
  if (Platform.OS !== 'android') return false;
  const accuracy = getAndroidAccuracy(permission);
  return accuracy === 'coarse' || accuracy === 'approximate' || accuracy === 'reduced';
};

const getLocationAgeMs = (location) => {
  if (!location?.timestamp) return Infinity;
  return Date.now() - location.timestamp;
};

const hasCoords = (location) => (
  location?.coords?.latitude !== undefined &&
  location?.coords?.longitude !== undefined
);

const isAccurateEnough = (location, requiredAccuracy) => {
  if (!hasCoords(location)) return false;
  if (!requiredAccuracy || location.coords.accuracy === null || location.coords.accuracy === undefined) {
    return true;
  }
  return location.coords.accuracy <= requiredAccuracy;
};

const isFreshEnough = (location, maxAgeMs) => getLocationAgeMs(location) <= maxAgeMs;

const normalizeLocationError = (error) => {
  if (error?.isLocationError) return error;

  const message = error?.message || 'Unable to fetch location.';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('permission')) {
    return new MobileLocationError('permission_denied', 'Location permission is required.', {
      canOpenSettings: true,
    });
  }

  if (lowerMessage.includes('disabled') || lowerMessage.includes('provider')) {
    return new MobileLocationError('services_disabled', 'Device location services are disabled.', {
      canOpenSettings: true,
    });
  }

  return new MobileLocationError('location_unavailable', message);
};

const ensureForegroundPermission = async (options) => {
  notifyStatus(options, 'permission');

  let permission = await Location.getForegroundPermissionsAsync().catch(() => null);
  if (!isPermissionGranted(permission)) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!isPermissionGranted(permission)) {
    throw new MobileLocationError('permission_denied', 'Location permission is required.', {
      canOpenSettings: permission?.canAskAgain === false,
    });
  }

  if (options.requirePrecise && isApproximateOnly(permission)) {
    throw new MobileLocationError(
      'precise_required',
      'Precise location permission is required.',
      { canOpenSettings: true }
    );
  }

  return permission;
};

const ensureLocationProviders = async (options) => {
  notifyStatus(options, 'services');

  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
  if (!servicesEnabled) {
    throw new MobileLocationError('services_disabled', 'Device location services are disabled.', {
      canOpenSettings: true,
    });
  }

  const providerStatus = await Location.getProviderStatusAsync().catch(() => null);
  if (providerStatus?.locationServicesEnabled === false) {
    throw new MobileLocationError('services_disabled', 'Device location services are disabled.', {
      canOpenSettings: true,
    });
  }

  if (
    Platform.OS === 'android' &&
    providerStatus &&
    providerStatus.gpsAvailable === false &&
    providerStatus.networkAvailable === false
  ) {
    throw new MobileLocationError(
      'provider_unavailable',
      'Android location providers are not available.',
      { canOpenSettings: true }
    );
  }
};

const getCachedLocation = async (options) => {
  notifyStatus(options, 'cached');

  const cachedLocation = await Location.getLastKnownPositionAsync({
    maxAge: options.cacheMaxAgeMs,
    requiredAccuracy: options.cacheRequiredAccuracy,
  }).catch(() => null);

  if (
    cachedLocation &&
    isFreshEnough(cachedLocation, options.cacheMaxAgeMs) &&
    isAccurateEnough(cachedLocation, options.cacheRequiredAccuracy)
  ) {
    return cachedLocation;
  }

  return null;
};

const getWatchedLocationOnce = (accuracy, timeoutMs) => new Promise((resolve, reject) => {
  let subscription = null;
  let isSettled = false;

  const cleanup = () => {
    if (subscription?.remove) {
      subscription.remove();
      subscription = null;
    }
  };

  const finish = (error, location) => {
    if (isSettled) return;
    isSettled = true;
    clearTimeout(timer);
    cleanup();

    if (error) {
      reject(error);
      return;
    }

    resolve(location);
  };

  const timer = setTimeout(() => {
    finish(new MobileLocationError(
      'location_timeout',
      'Location request timed out. Please try again.'
    ));
  }, timeoutMs);

  Location.watchPositionAsync(
    {
      accuracy,
      timeInterval: 1000,
      distanceInterval: 0,
      mayShowUserSettingsDialog: true,
    },
    (location) => {
      if (hasCoords(location)) {
        finish(null, location);
      }
    }
  ).then((nextSubscription) => {
    if (isSettled) {
      nextSubscription.remove();
      return;
    }
    subscription = nextSubscription;
  }).catch((error) => {
    finish(error);
  });
});

const getFreshLocation = async (accuracy, timeoutMs, status, options) => {
  notifyStatus(options, status);

  if (Platform.OS === 'android') {
    return getWatchedLocationOnce(accuracy, timeoutMs);
  }

  return withTimeout(
    Location.getCurrentPositionAsync({
      accuracy,
      mayShowUserSettingsDialog: true,
    }),
    timeoutMs,
    'location_timeout'
  );
};

const resolveLocation = async (options) => {
  await ensureForegroundPermission(options);
  await ensureLocationProviders(options);

  let lastError = null;

  try {
    const balancedLocation = await getFreshLocation(
      Location.Accuracy.Balanced,
      options.timeoutMs,
      'balanced',
      options
    );

    if (isAccurateEnough(balancedLocation, options.balancedRequiredAccuracy)) {
      return balancedLocation;
    }

    if (!options.requirePrecise) {
      return balancedLocation;
    }

    lastError = new MobileLocationError(
      'location_accuracy_low',
      'Current location accuracy is too low.'
    );
  } catch (error) {
    lastError = normalizeLocationError(error);
  }

  const canTryHighAccuracy = options.requirePrecise && lastError?.code === 'location_accuracy_low';
  if (canTryHighAccuracy) {
    try {
      const highLocation = await getFreshLocation(
        Location.Accuracy.High,
        options.highAccuracyTimeoutMs,
        'high',
        options
      );

      if (isAccurateEnough(highLocation, options.highRequiredAccuracy)) {
        return highLocation;
      }

      lastError = new MobileLocationError(
        'location_accuracy_low',
        'Current location accuracy is too low.'
      );
    } catch (error) {
      lastError = normalizeLocationError(error);
    }
  }

  const cachedLocation = await getCachedLocation(options);
  if (cachedLocation) {
    return cachedLocation;
  }

  throw lastError || new MobileLocationError(
    'location_unavailable',
    'Unable to fetch location.'
  );
};

export const getMobileActionLocation = async (requestedOptions = {}) => {
  if (activeLocationRequest) {
    return activeLocationRequest;
  }

  const options = { ...DEFAULT_OPTIONS, ...requestedOptions };
  activeLocationRequest = resolveLocation(options).finally(() => {
    activeLocationRequest = null;
  });

  return activeLocationRequest;
};

export const getVisitActionLocation = getMobileActionLocation;

export const getMobileLocationErrorContent = (error, actionLabel = 'fetch location') => {
  const code = error?.code;

  switch (code) {
    case 'permission_denied':
      return {
        title: 'Location Permission Needed',
        message: `Please allow location access to ${actionLabel}.`,
        canOpenSettings: error?.canOpenSettings,
      };
    case 'precise_required':
      return {
        title: 'Precise Location Needed',
        message: `Android has granted approximate location only. Enable precise location to ${actionLabel}.`,
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
        message: 'We could not get a fresh location in time, and no recent saved location was available. Please try again.',
      };
    case 'location_accuracy_low':
      return {
        title: 'Location Accuracy Too Low',
        message: 'The current and saved locations are not accurate enough. Enable precise location and try again from a better signal area.',
        canOpenSettings: true,
      };
    default:
      return {
        title: 'Location Unavailable',
        message: `Unable to ${actionLabel}. Please try again.`,
      };
  }
};
