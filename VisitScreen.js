import { API_BASE_URL } from './config/api';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import * as FileSystem from 'expo-file-system';

// Import refactored components
import BottomSheet from './BottomSheet';
import BrandsProCons from './BrandsProCons';
import MonthlySales from './MonthlySales';
import Complaints from './Complaints';
import Requirements from './Requirements';
import CheckInImages from './CheckInImages';
import Notes from './Notes';
import Sites from './Sites';
import IntentLevel from './IntentLevel';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import ContactsManager from './ContactsManager';
import { getVisitActionLocation } from './MobileLocationService';

const VISIT_LOCATION_OPTIONS = {
  requirePrecise: true,
  timeoutMs: 60000,
  highAccuracyTimeoutMs: 30000,
  cacheMaxAgeMs: 300000,
  cacheRequiredAccuracy: 1000,
  balancedRequiredAccuracy: 1000,
  highRequiredAccuracy: 500,
};

const LOCATION_STEP_LABELS = {
  permission: 'Checking location permission...',
  services: 'Checking device location...',
  balanced: 'Getting your location...',
  high: 'Improving accuracy...',
  cached: 'Trying recent location...',
};

const GiftImageViewer = ({ imageUrl, authToken, visitId }) => {
  const [localUri, setLocalUri] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const downloadImage = async () => {
      if (!imageUrl || !authToken) {
        setLoading(false);
        return;
      }
      try {
        const fileName = imageUrl.split('/').pop() || 'gift_image.jpg';
        const fileUri = FileSystem.cacheDirectory + 'gift_' + new Date().getTime() + '_' + fileName;
        
        // The backend's generated fileDownloadUri is broken and returns 404. 
        // We will try the most likely backend endpoints for visit file downloads.
        const fallbackUrls = [
          imageUrl, // Try original first just in case
          `${API_BASE_URL}/visit/downloadFile/${visitId}/gift/${fileName}`,
          `${API_BASE_URL}/visit/downloadFile/${visitId}/${fileName}`,
          `${API_BASE_URL}/visit/downloadFile/${fileName}`
        ];

        let success = false;
        for (const url of fallbackUrls) {
          console.log('Trying to download from:', url);
          const result = await FileSystem.downloadAsync(url, fileUri, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          
          if (result.status === 200) {
            console.log('Successfully downloaded from:', url);
            setLocalUri(result.uri);
            success = true;
            break;
          }
        }

        if (!success) {
          console.log('All fallback download URLs failed with 404.');
        }
      } catch (err) {
        console.error('Error downloading gift image:', err);
      } finally {
        setLoading(false);
      }
    };
    downloadImage();
  }, [imageUrl, authToken, visitId]);

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      {localUri ? (
        <Image 
          source={{ uri: localUri }} 
          style={{ width: '100%', height: 400, resizeMode: 'contain' }} 
        />
      ) : (
        <Text style={{ fontSize: 16, color: '#666' }}>No image available</Text>
      )}
    </View>
  );
};

const VisitScreen = ({ route }) => {
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [bottomSheetTitle, setBottomSheetTitle] = useState('');
  const [visitData, setVisitData] = useState({
    monthlySales: 0,
    brandsInUse: [],
    notes: [],
    requirements: [],
    complaints: [],
    visitDuration: 0,
    intentLevel: 0,
  });
  const { visitId, authToken } = route.params;
  const [isCheckInImagesDisabled, setIsCheckInImagesDisabled] = useState(false);
  const [isCheckInButtonEnabled, setIsCheckInButtonEnabled] = useState(false);
  const [isCheckInImageUploaded, setIsCheckInImageUploaded] = useState(false);
  const [isGiftImageUploaded, setIsGiftImageUploaded] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkinDateTime, setCheckinDateTime] = useState(null);
  const navigation = useNavigation();
  const [bottomSheetContent, setBottomSheetContent] = useState(null);
  const [checkedOut, setCheckedOut] = useState(false);
  const [isCheckoutEnabled, setIsCheckoutEnabled] = useState(false);
  const [monthlySale, setMonthlySale] = useState('');
  const [checkoutDateTime, setCheckoutDateTime] = useState(null);
  const [ongoingVisits, setOngoingVisits] = useState([]);
  const [isConfirmationVisible, setConfirmationVisible] = useState(false);
  const [intentLevel, setIntentLevel] = useState(0);
  const [visit, setVisit] = useState(null);
  const [visitStatus, setVisitStatus] = useState('Assigned');
  const [sliderValue, setSliderValue] = useState(0);
  const [clientType, setClientType] = useState('');
  const [sitesCount, setSitesCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [contactsCount, setContactsCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkInStep, setCheckInStep] = useState(null);
  const [checkOutStep, setCheckOutStep] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);
  const [storeDetails, setStoreDetails] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);

  const fetchSitesCount = async (storeIdParam) => {
    const storeId = storeIdParam || visit?.storeId;
    if (!storeId) return;
    try {
      const response = await axios.get(
        `${API_BASE_URL}/site/getByStore?id=${storeId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const sites = Array.isArray(response.data) ? response.data : [];
      setSitesCount(sites.length);
    } catch (error) {
      console.error('Error fetching sites count:', error);
      setSitesCount(0);
    }
  };

  const fetchVisitDetails = async () => {
    try {
      const visitResponse = await axios.get(`${API_BASE_URL}/visit/getById?id=${visitId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      const visitData = visitResponse.data;
      console.log("VISIT_DETAILS_RESPONSE:", JSON.stringify(visitData, null, 2));
      if (visitData) {
        setVisit(visitData);
        setVisitStatus(getVisitStatus(visitData));
        setSliderValue(visitData.visitIntentValue || 0);
        setIntentLevel(visitData.visitIntentValue || 0);

        // Set check-in status and time
        const isCheckedIn = !!visitData.checkinDate;
        setCheckedIn(isCheckedIn);

        // Check if check-in image is already uploaded
        const hasCheckInImage = visitData.attachmentResponse?.some(
          (attachment) => attachment.tag === 'check-in'
        );
        setIsCheckInImageUploaded(hasCheckInImage);
        setIsCheckInImagesDisabled(hasCheckInImage);
        setIsGiftImageUploaded(visitData.attachmentResponse?.some((attachment) => attachment.tag === 'gift'));
        setIsCheckInButtonEnabled(!hasCheckInImage && !isCheckedIn);

        // Update visitData state
        setVisitData(prevData => ({
          ...prevData,
          monthlySales: visitData.monthlySale || 0,
          competitiveInfo: visitData.brandProCons?.length > 0 ? visitData.brandProCons[0] : { brand: '', pros: [], cons: [] },
          brandsInUse: visitData.brandsInUse || [],
          visitDuration: visitData.checkoutDate ? calculateDuration(visitData.checkinDate, visitData.checkinTime, visitData.checkoutDate, visitData.checkoutTime) : null,
          intentLevel: visitData.visitIntentValue || 0,
        }));

        // Only fetch client type if we have storeId
        if (visitData.storeId) {
          try {
            const storeResponse = await axios.get(`${API_BASE_URL}/store/getById?id=${visitData.storeId}`, {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            });
            const storeData = storeResponse.data;
            setStoreDetails(storeData);
            setClientType((storeData.clientType || 'shop').toLowerCase());
            
            // Check if today is the customer's birthday
            if (storeData.dob) {
              const today = new Date();
              const dob = new Date(storeData.dob);
              const isTodayBirthday = dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
              setIsBirthday(isTodayBirthday);
            } else {
              setIsBirthday(false);
            }
          } catch (error) {
            console.error('Error fetching store details:', error);
            setClientType('shop'); // Default to shop if fetch fails
            setIsBirthday(false);
          }
        }

        // Fetch additional data
        await Promise.all([
          fetchBrandsProCons(),
          fetchRequirements(),
          fetchComplaints(),
          fetchNotes(),
          fetchIntentLevel(),
          fetchSitesCount(visitData.storeId),
        ]);
        // Use the legacy monthly-sales endpoint as a supplemental refresh.
        // The visit response remains authoritative when this endpoint is empty.
        await fetchMonthlySales();
      }
    } catch (error) {
      console.error('Error fetching visit details:', error);
    }
  };

  const isSiteRelatedClient = ['site visit', 'engineer', 'architect', 'builder'].includes((clientType || '').toLowerCase());
  const isGiftingVisit = String(visit?.purpose || '').trim().toLowerCase() === 'gifting';
  
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await fetchVisitDetails();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [visitId, authToken]);

  // Add a focus effect to refresh notes when returning to the screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (visit?.storeId) {
        fetchNotes();
      }
    });

    return unsubscribe;
  }, [navigation, visit?.storeId]);

  const fetchClientType = async (storeId) => {
    if (!storeId) {
      console.log('Store ID not available');
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/store/getById?id=${storeId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setClientType((response.data.clientType || 'shop').toLowerCase());
    } catch (error) {
      console.error('Error fetching client type:', error);
      setClientType('shop'); // Default to shop if fetch fails
    }
  };

  const fetchNotes = async () => {
    if (!visitId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/notes/getByVisit?id=${visitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const notes = Array.isArray(response.data) ? response.data : [];
      setNotesCount(notes.length);
      
      setVisitData(prevData => ({
        ...prevData,
        notes: notes
      }));
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchBrandsProCons = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/visit/getProCons?visitId=${visitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const brandsProCons = Array.isArray(response.data) ? response.data : [];
      setVisitData(prevData => ({
        ...prevData,
        brandsProCons: brandsProCons
      }));
    } catch (error) {
      console.error('Error fetching brands pro-cons:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/task/getByVisit?type=complaint&visitId=${visitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const filteredComplaints = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'complaint')
        : [];
      setVisitData(prevData => ({
        ...prevData,
        complaints: filteredComplaints
      }));
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  const fetchRequirements = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/task/getByVisit?type=requirement&visitId=${visitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const filteredRequirements = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'requirement')
        : [];
      setVisitData(prevData => ({
        ...prevData,
        requirements: filteredRequirements
      }));
    } catch (error) {
      console.error('Error fetching requirements:', error);
    }
  };

  const fetchMonthlySales = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/monthly-sale/getByVisit?visitId=${visitId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const rawMonthlySale = response.data?.newMonthlySale ?? response.data?.monthlySale ?? 0;
      const parsedMonthlySale = Number(rawMonthlySale);
      const normalizedMonthlySale = Number.isFinite(parsedMonthlySale) && parsedMonthlySale > 0
        ? parsedMonthlySale
        : 0;

      // `visit/getById` already includes `monthlySale`. Some deployments of
      // the legacy monthly-sales endpoint return an empty value for the same
      // visit, so never let that response erase a valid saved sale.
      if (normalizedMonthlySale > 0) {
        setMonthlySale(normalizedMonthlySale.toString());
        setVisitData(prevData => ({
          ...prevData,
          monthlySales: normalizedMonthlySale,
        }));
        setVisit(prevVisit => prevVisit ? ({
          ...prevVisit,
          monthlySale: normalizedMonthlySale,
        }) : prevVisit);
      }
    } catch (error) {
      console.error('Error fetching monthly sale:', error);
    }
  };

  const fetchIntentLevel = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/intent-audit/getByVisit?id=${visitId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      console.log('Intent audit response:', response.data);

      if (Array.isArray(response.data) && response.data.length > 0) {
        // Find the latest intent level based on the highest id
        const latestIntentAudit = response.data.reduce((latest, current) => {
          return current.id > latest.id ? current : latest;
        });
        setIntentLevel(latestIntentAudit.newIntentLevel);
      } else {
        setIntentLevel(0);
      }
    } catch (error) {
      console.error('Error fetching intent level:', error.response || error);
      setIntentLevel(0);
    }
  };

  const getVisitStatus = (visitData) => {
    if (visitData.checkoutLatitude && visitData.checkoutLongitude && visitData.checkoutDate && visitData.checkoutTime) {
      return 'Completed';
    } else if (visitData.checkinLatitude && visitData.checkinLongitude && visitData.checkinDate && visitData.checkinTime) {
      return 'Ongoing';
    } else {
      return 'Assigned';
    }
  };

  const handleUpdateIntentLevel = async (newIntentLevel) => {
    const visitIntentV = newIntentLevel - 1;
    try {
      const response = await axios.put(
        `${API_BASE_URL}/visit/edit?id=${visit.id}`,
        { visitIntentValue: newIntentLevel },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        setIntentLevel(newIntentLevel);
        setVisit(prevVisit => ({
          ...prevVisit,
          intent: newIntentLevel
        }));
        setVisitData(prevData => ({
          ...prevData,
          intentLevel: newIntentLevel
        }));
        checkRequiredFields();
        fetchIntentLevel(); // Re-fetch intent audit after update
      } else {
        throw new Error('Failed to update intent level');
      }
    } catch (error) {
      console.error('Error updating intent level:', error);
      Alert.alert('Error', 'Failed to update intent level. Please try again.');
    }
  };

  const updateIntentLevel = useCallback(async (newIntentLevel) => {
    if (!visit) {
      console.warn('Visit data not loaded yet');
      return;
    }
    try {
      const response = await axios.put(
        `${API_BASE_URL}/visit/edit?id=${visit.id}`,
        { visitIntentValue: newIntentLevel },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        setVisit(prevVisit => ({
          ...prevVisit,
          intent: newIntentLevel
        }));
        setIntentLevel(newIntentLevel);
        // Update other state variables as needed
      } else {
        throw new Error('Failed to update intent level');
      }
    } catch (error) {
      console.error('Error updating intent level:', error);
      Alert.alert('Error', 'Failed to update intent level. Please try again.');
    }
  }, [visit, authToken]);

  const debouncedUpdateIntentLevel = useCallback(
    debounce((value) => {
      updateIntentLevel(value);
    }, 500),
    [updateIntentLevel]
  );

  const handleIntentLevelChange = (newLevel) => {
    setIntentLevel(newLevel);
    debouncedUpdateIntentLevel(newLevel);
  };

  const handleSaleUpdated = (newSale) => {
    const parsedMonthlySale = Number(newSale);
    const normalizedMonthlySale = Number.isFinite(parsedMonthlySale) && parsedMonthlySale > 0
      ? parsedMonthlySale
      : 0;

    setVisitData(prevData => ({
      ...prevData,
      monthlySales: normalizedMonthlySale
    }));
    setMonthlySale(normalizedMonthlySale ? normalizedMonthlySale.toString() : '');
  };

  const handleBrandAdded = (brands) => {
    setVisitData(prevData => ({
      ...prevData,
      brandsInUse: brands
    }));
  };

  const handleNotesUpdated = async () => {
    await fetchNotes(); // Refresh notes data immediately after update
  };

  const handleSitesUpdated = async () => {
    if (visit?.storeId) {
      await fetchSitesCount();
      await fetchVisitDetails(); // Refresh all visit data after sites update
    }
  };

  const openBottomSheet = (title, Component, props) => {
    setBottomSheetTitle(title);
    setBottomSheetContent(() =>
      <Component
        {...props}
        readOnly={visitStatus === 'Completed'}
        onSaleUpdated={handleSaleUpdated}
        onBrandAdded={handleBrandAdded}
        onIntentLevelChange={handleIntentLevelChange}
        onClose={closeBottomSheet}
        visitId={visitId}
        storeId={visit?.storeId}
        authToken={authToken}
      />
    );
    setBottomSheetVisible(true);
  };

  const closeBottomSheet = () => {
    setBottomSheetVisible(false);
  };

  const updateVisitData = (newData) => {
    setVisitData((prevData) => ({ ...prevData, ...newData }));
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (checkinDate, checkinTime, checkoutDate, checkoutTime) => {
    if (!checkinDate || !checkinTime || !checkoutDate || !checkoutTime) {
      return 'N/A';
    }

    const checkinMoment = moment(`${checkinDate} ${checkinTime}`, 'YYYY-MM-DD HH:mm:ss.SSS');
    const checkoutMoment = moment(`${checkoutDate} ${checkoutTime}`, 'YYYY-MM-DD HH:mm:ss.SSS');
    const duration = moment.duration(checkoutMoment.diff(checkinMoment));

    const hours = Math.floor(duration.asHours());
    const minutes = Math.floor(duration.asMinutes()) % 60;

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const getLocationErrorContent = (error, actionLabel) => {
    const code = error?.code;

    switch (code) {
      case 'permission_denied':
        return {
          title: 'Location Permission Needed',
          message: `${actionLabel} needs location permission. Allow location access for this app, then try again.`,
          canOpenSettings: error?.canOpenSettings,
        };
      case 'precise_required':
        return {
          title: 'Precise Location Needed',
          message: `Android has granted approximate location only. Please change this app's location permission to Precise so ${actionLabel.toLowerCase()} can capture accurate coordinates.`,
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
          message: 'We could not get a fresh location in time, and no recent accurate saved location was available. Try again near a window or outdoors.',
        };
      case 'location_accuracy_low':
        return {
          title: 'Location Accuracy Too Low',
          message: 'The current and saved locations are not accurate enough. Enable precise location and try again from a better signal area.',
          canOpenSettings: true,
        };
      case 'location_in_progress':
        return {
          title: 'Location Already Running',
          message: 'Another location request is still running. Please wait a moment and try again.',
        };
      default:
        return {
          title: `${actionLabel} Location Error`,
          message: 'Unable to get your location. Please try again from an area with better GPS or network signal.',
        };
    }
  };

  const resetCheckInState = () => {
    setIsCheckingIn(false);
    setCheckInStep(null);
  };

  const resetCheckOutState = () => {
    setIsCheckingOut(false);
    setCheckOutStep(null);
  };

  const isVisitLocationError = (error) => {
    const code = error?.code;
    return Boolean(
      error?.isLocationError ||
      code?.startsWith?.('location_') ||
      code === 'permission_denied' ||
      code === 'precise_required' ||
      code === 'services_disabled' ||
      code === 'provider_unavailable'
    );
  };

  const showVisitLocationError = (error, actionLabel, retryAction, resetAction) => {
    const content = getLocationErrorContent(error, actionLabel);
    const buttons = [];

    if (content.canOpenSettings) {
      buttons.push({
        text: 'Open Settings',
        onPress: () => {
          resetAction();
          Linking.openSettings();
        },
      });
    }

    buttons.push(
      {
        text: 'Retry',
        onPress: () => {
          resetAction();
          setTimeout(retryAction, 250);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: resetAction,
      }
    );

    Alert.alert(content.title, content.message, buttons);
  };

  const fetchVisitActionLocation = async (setStep) => getVisitActionLocation({
    ...VISIT_LOCATION_OPTIONS,
    onStatus: (status) => {
      setStep(LOCATION_STEP_LABELS[status] || 'Getting your location...');
    },
  });

  const handleCheckIn = async () => {
    if (!isCheckInImageUploaded) {
      Alert.alert('Error', 'Please add check-in images before checking in.');
      return;
    }

    if (isCheckingIn || isCheckingOut) {
      return;
    }

    setIsCheckingIn(true);
    try {
      // Step 1: Check ongoing visits
      setCheckInStep('Checking ongoing visits...');
      const hasOngoingVisits = await fetchOngoingVisits();
      if (hasOngoingVisits) {
        setConfirmationVisible(true);
        setIsCheckingIn(false);
        setCheckInStep(null);
        return;
      }

      // Step 2: Get one guarded location request with timeout/cached fallback.
      const location = await fetchVisitActionLocation(setCheckInStep);

      // Step 3: Send check-in request
      setCheckInStep('Submitting check-in...');
      const { latitude, longitude } = location.coords;
      console.log('Check-in location:', latitude, longitude);

      const checkinResponse = await axios.put(
        `${API_BASE_URL}/visit/checkin?id=${visitId}`,
        {
          checkinLatitude: latitude,
          checkinLongitude: longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          },
        }
      );

      if (typeof checkinResponse.data === 'string' && checkinResponse.data.includes('<!DOCTYPE html>')) {
        throw new Error('auth_expired');
      }

      if (checkinResponse.data === 'Checked In Successfully!') {
        setCheckInStep('Completing check-in...');
        setCheckedIn(true);
        setCheckinDateTime(moment().format('DD-MMM h:mm A'));
        setVisitStatus('Ongoing');
        await fetchVisitDetails();
      } else {
        throw new Error('check_in_failed');
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      if (isVisitLocationError(error)) {
        showVisitLocationError(error, 'Check-in', handleCheckIn, resetCheckInState);
        return;
      }

      let errorMessage = 'Failed to check in. Please try again.';
      let shouldNavigateToLogin = false;
      
      if (error.message === 'auth_expired' || 
          (error.response && error.response.status === 401) ||
          (error.response && error.response.status === 403)) {
        errorMessage = 'Your session has expired. Please log in again.';
        shouldNavigateToLogin = true;
      } else if (error.message === 'check_in_failed') {
        errorMessage = 'Check-in failed. Please try again.';
      } else if (error.message.includes('location')) {
        errorMessage = 'Unable to get your location. Please ensure:\n\n' +
          'â€¢ You are outdoors or near a window\n' +
          'â€¢ GPS is enabled\n' +
          'â€¢ You have a clear view of the sky\n' +
          'â€¢ Try moving to an area with better GPS signal';
      }
      
      Alert.alert(
        'Check-in Error',
        errorMessage,
        shouldNavigateToLogin ? 
        [{ 
          text: 'OK',
          onPress: () => {
            setIsCheckingIn(false);
            setCheckInStep(null);
            navigation.navigate('Login');
          }
        }] :
        [{ 
          text: 'Retry',
          onPress: () => {
            setIsCheckingIn(false);
            setCheckInStep(null);
            handleCheckIn();
          }
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setIsCheckingIn(false);
            setCheckInStep(null);
          }
        }]
      );
      return;
    }
    
    setIsCheckingIn(false);
    setCheckInStep(null);
  };

  const handleCheckOut = async () => {
    if (!isCheckoutEnabled) {
      Alert.alert(
        'Cannot Checkout',
        isGiftingVisit
          ? 'Please add the gift image before completing this gifting visit.'
          : getCheckoutRequirementsText() || 'Please complete the required visit details before checking out.'
      );
      return;
    }

    if (isCheckingOut || isCheckingIn) {
      return;
    }

    setIsCheckingOut(true);
    try {
      // Step 1: Get one guarded location request with timeout/cached fallback.
      const location = await fetchVisitActionLocation(setCheckOutStep);

      // Step 2: Send checkout request
      setCheckOutStep('Submitting checkout...');
      const { latitude, longitude } = location.coords;
      console.log('Check-out location:', latitude, longitude);

      const response = await axios.put(
        `${API_BASE_URL}/visit/checkout?id=${visitId}`,
        {
          checkoutLatitude: latitude,
          checkoutLongitude: longitude,
          outcome: isGiftingVisit ? 'gifted' : 'done',
          ...(isGiftingVisit ? {
            hasGift: true,
            giftName: 'Gift',
            giftQuantity: 1,
            giftRemarks: 'Gift image attached',
          } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data === 'Checked out Successfully!') {
        setCheckOutStep('Completing checkout...');
        const checkoutTime = moment().format('DD-MMM h:mm A');
        const duration = calculateDuration(
          visit.checkinDate,
          visit.checkinTime,
          moment().format('YYYY-MM-DD'),
          moment().format('HH:mm:ss.SSS')
        );

        setCheckedOut(true);
        setCheckoutDateTime(checkoutTime);
        setVisitStatus('Completed');
        setVisitData((prevData) => ({
          ...prevData,
          visitDuration: duration
        }));

        await fetchVisitDetails();
      } else {
        throw new Error(response.data || 'Failed to check out');
      }
    } catch (error) {
      console.error('Error during check-out:', error);
      if (isVisitLocationError(error)) {
        showVisitLocationError(error, 'Checkout', handleCheckOut, resetCheckOutState);
        return;
      }

      Alert.alert(
        'Checkout Error',
        error.response?.data || error.message || 'Failed to check out. Please try again.'
      );
    } finally {
      setIsCheckingOut(false);
      setCheckOutStep(null);
    }
  };

  const handleImageAdded = () => {
    setIsCheckInImagesDisabled(true);
    setIsCheckInButtonEnabled(true);
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const Header = () => (
    <View style={[styles.header, { backgroundColor: '#4f46e5' }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <Icon name="arrow-left" size={20} color="#fff" />
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Visit Summary</Text>
      <TouchableOpacity
        style={styles.storeButton}
        onPress={() => {
          navigation.navigate('Customer', {
            screen: 'CustomerDetails',
            params: { customerId: visit.storeId, authToken }
          });
        }}
      >
        <Text style={styles.buttonText}>View Store</Text>
      </TouchableOpacity>
    </View>
  );
  const InfoItem = ({ icon, title, value, containerStyle }) => (
    <View style={[styles.infoItem, containerStyle]}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={20} color="#4F46E5" />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const ViewButton = ({ onPress, text, count = 0 }) => (
    <TouchableOpacity style={styles.viewButton} onPress={onPress}>
      <Text style={styles.viewButtonText}>{text}</Text>
      {count > 0 && (
        <View style={styles.countIndicator}>
          <Text style={styles.countIndicatorText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const VisitInfo = () => (
    <View style={styles.visitInfoContainer}>
      <View style={styles.infoRow}>
        <InfoItem icon="phone" title="Contact" value={visit?.primaryContact || visit?.phone || 'N/A'} />
        <InfoItem icon="check-circle" title="Visit Status" value={visitStatus} containerStyle={styles.rightAlignedItem} />
      </View>
      <View style={styles.infoRow}>
        <InfoItem icon="calendar" title="Visit Date" value={visit ? format(new Date(visit.visit_date), 'yyyy-MM-dd') : 'N/A'} />
        <InfoItem icon="search" title="Purpose" value={visit?.purpose || 'N/A'} containerStyle={styles.rightAlignedItem} />
      </View>
      <View style={[styles.infoRow, styles.infoRowLast]}>
        <InfoItem icon="building" title="Firm" value={visit?.storeName || 'N/A'} />
        <InfoItem icon="user" title="Owner / Customer" value={visit?.customerName || visit?.ownerName || visit?.storeName || 'N/A'} containerStyle={styles.rightAlignedItem} />
      </View>
    </View>
  );

  const CardActions = () => {
    const ActionButton = ({ icon, text, onPress, disabled = false, badge = null }) => {
      const hasEntries = badge === '✓' || Number(badge) > 0;
      const recordStatus = badge === null || badge === undefined
        ? 'Open'
        : badge === '✓'
          ? 'Added'
          : Number(badge) > 0
            ? `${badge} added`
            : 'None yet';

      return (
        <TouchableOpacity
          style={[styles.actionBtn, disabled && styles.disabledBtn]}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={`${text}, ${recordStatus}`}
        >
          <View style={[styles.actionBtnIcon, disabled && styles.actionBtnIconDisabled]}>
            <Icon name={icon} size={18} color={disabled ? '#98A2B3' : '#4F46E5'} />
          </View>
          <View style={styles.actionBtnContent}>
            <Text style={[styles.actionText, disabled && styles.disabledText]} numberOfLines={2}>{text}</Text>
            <View style={styles.actionStatusRow}>
              <View style={[styles.actionStatusDot, hasEntries ? styles.actionStatusDotComplete : styles.actionStatusDotEmpty]} />
              <Text style={[styles.actionStatusText, hasEntries && styles.actionStatusTextComplete]}>
                {recordStatus}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#A0A7B4" />
        </TouchableOpacity>
      );
    };

    const renderAssignedActions = () => (
      <View style={styles.cardActionsContainer}>
        <View style={styles.checkInSection}>
          <View style={styles.checkInSteps}>
            <View style={[styles.stepIndicator, isCheckInImageUploaded && styles.stepCompleted]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepConnector} />
            <View style={[styles.stepIndicator, checkedIn && styles.stepCompleted]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
          </View>
          
          <View style={styles.checkInActions}>
            <View style={styles.actionStep}>
              <Text style={styles.stepTitle}>Upload Check-in Image</Text>
              <View style={[styles.actionCard, isCheckInImageUploaded && styles.actionCardCompleted]}>
                <CheckInImages
                  visitId={visitId}
                  authToken={authToken}
                  onImageAdded={async () => {
                    setIsCheckInImageUploaded(true);
                    await fetchVisitDetails();
                  }}
                  isDisabled={isCheckInImageUploaded || checkedIn}
                />
                {isCheckInImageUploaded && (
                  <View style={styles.completedOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={styles.completedText}>Image Uploaded</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actionStep}>
              <Text style={styles.stepTitle}>Check In</Text>
              <TouchableOpacity
                style={[
                  styles.checkInButton,
                  (!isCheckInImageUploaded || checkedIn) && styles.checkInButtonDisabled,
                  checkedIn && styles.checkInButtonCompleted
                ]}
                onPress={handleCheckIn}
                disabled={!isCheckInImageUploaded || checkedIn || isCheckingIn}
              >
                {isCheckingIn ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.checkInButtonText]}>{checkInStep || 'Checking in...'}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons 
                      name={checkedIn ? "checkmark-circle" : "location-outline"} 
                      size={24} 
                      color={checkedIn ? "#10B981" : "#FFFFFF"} 
                    />
                    <Text style={[
                      styles.checkInButtonText,
                      checkedIn && styles.checkInButtonTextCompleted
                    ]}>
                      {checkedIn ? 'Checked In' : 'Check In'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {checkedIn && (
          <View style={styles.checkinInfoCard}>
            <Ionicons name="time-outline" size={20} color="#4F46E5" />
            <Text style={styles.checkinInfoText}>Checked in at {checkinDateTime}</Text>
          </View>
        )}
      </View>
    );

    const renderOngoingActions = () => {
      if (isGiftingVisit) {
        return (
          <View style={styles.giftingCard}>
            <View style={styles.giftingHeader}>
              <View style={styles.giftingIcon}>
                <Ionicons name="gift-outline" size={20} color="#4F46E5" />
              </View>
              <View style={styles.giftingCopy}>
                <Text style={styles.giftingTitle}>Gift image required</Text>
                <Text style={styles.giftingDescription}>Take one clear photo of the gift to complete this visit.</Text>
              </View>
            </View>
            {!isGiftImageUploaded ? (
              <>
                <CheckInImages
                  visitId={visitId}
                  authToken={authToken}
                  imageTag="gift"
                  actionLabel="Take Gift Photo"
                  permissionLabel="gift image"
                  showConnectivity={false}
                  onImageAdded={async () => {
                    setIsGiftImageUploaded(true);
                    await fetchVisitDetails();
                  }}
                  isDisabled={isCheckingOut}
                />
                <View style={styles.giftingHint}>
                  <Ionicons name="information-circle-outline" size={16} color="#7C8494" />
                  <Text style={styles.giftingHintText}>Completion unlocks after the image is uploaded.</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.giftUploadedState}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.giftUploadedText}>Gift image uploaded</Text>
                </View>
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={handleCheckOut}
                  disabled={isCheckingOut}
                  activeOpacity={0.8}
                >
                  {isCheckingOut ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-done-outline" size={19} color="#FFFFFF" />}
                  <Text style={styles.checkoutButtonText}>{isCheckingOut ? (checkOutStep || 'Completing...') : 'Complete Gifting Visit'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      }
      const actionButtons = [];

      // Always add Brands and Notes for all client types
      actionButtons.push(
        <ActionButton
          key="brands"
          icon="tags"
          text="Brands"
          onPress={() => openBottomSheet('Brands', BrandsProCons, {
            visitId,
            storeId: visit.storeId,
            authToken,
            readOnly: false
          })}
          badge={visitData.brandsInUse?.length || 0}
        />
      );

      if (isSiteRelatedClient) {
        // For site-related clients
        actionButtons.push(
          <ActionButton
            key="sites"
            icon="building"
            text="Projects"
            onPress={() => openModal('Sites', Sites, {
              visitId,
              storeId: visit.storeId,
              authToken,
              onSitesUpdated: fetchSitesCount,
              clientType: clientType
            })}
            badge={sitesCount}
          />,
          <ActionButton
            key="contacts"
            icon="users"
            text="Contacts"
            onPress={() => openModal('Contacts', ContactsManager, {
              storeId: visit.storeId,
              authToken,
            })}
            badge={contactsCount}
          />
        );
      } else {
        // For non-site clients (including shops)
        actionButtons.push(
          <ActionButton
            key="monthlySales"
            icon="dollar"
            text="Monthly Sales"
            onPress={() => openBottomSheet('Monthly Sales', MonthlySales, {
              visitId,
              storeId: visit.storeId,
              authToken,
              initialMonthlySale: visitData.monthlySales,
              readOnly: false
            })}
            badge={Number(visitData.monthlySales) > 0 ? '✓' : null}
          />,
          <ActionButton
            key="requirements"
            icon="list"
            text="Requirements"
            onPress={() => openBottomSheet('Requirements', Requirements, {
              visitId,
              storeId: visit.storeId,
              authToken,
              readOnly: false
            })}
            badge={visitData.requirements?.length || 0}
          />,
          <ActionButton
            key="complaints"
            icon="exclamation-triangle"
            text="Complaints"
            onPress={() => openBottomSheet('Complaints', Complaints, {
              visitId,
              storeId: visit.storeId,
              authToken,
              readOnly: false
            })}
            badge={visitData.complaints?.length || 0}
          />
        );
      }

      // Add Notes button for all client types
      actionButtons.push(
        <ActionButton
          key="notes"
          icon="sticky-note"
          text="Notes"
          onPress={() => openBottomSheet('Notes', Notes, {
            visitId,
            storeId: visit.storeId,
            authToken,
            readOnly: false,
            onNotesUpdated: handleNotesUpdated
          })}
          badge={notesCount}
        />
      );

      const requirementsText = getCheckoutRequirementsText();

      return (
        <View>
          <View style={styles.actionButtonsGrid}>
            {actionButtons}
          </View>

          <View style={styles.intentContainer}>
            <Text style={styles.intentTitle}>Intent Level: {intentLevel}</Text>
            <IntentLevel
              level={intentLevel}
              onLevelChange={handleIntentLevelChange}
            />
          </View>

          <View style={styles.checkoutPanel}>
            <View style={styles.checkoutPanelHeader}>
              <View style={[styles.checkoutPanelIcon, isCheckoutEnabled ? styles.checkoutPanelIconReady : styles.checkoutPanelIconPending]}>
                <Ionicons
                  name={isCheckoutEnabled ? 'checkmark-circle-outline' : 'flag-outline'}
                  size={20}
                  color={isCheckoutEnabled ? '#059669' : '#4F46E5'}
                />
              </View>
              <View style={styles.checkoutPanelHeading}>
                <Text style={styles.checkoutPanelTitle}>Complete this visit</Text>
              </View>
              <View style={[styles.checkoutStatePill, isCheckoutEnabled ? styles.checkoutStatePillReady : styles.checkoutStatePillPending]}>
                <Text style={[styles.checkoutStateText, isCheckoutEnabled ? styles.checkoutStateTextReady : styles.checkoutStateTextPending]}>
                  {isCheckoutEnabled ? 'Ready' : 'Action needed'}
                </Text>
              </View>
            </View>

            {!isCheckoutEnabled && !!requirementsText && (
              <View style={styles.checkoutRequirementCard}>
                <Ionicons name="information-circle-outline" size={18} color="#D97706" />
                <Text style={styles.checkoutRequirementText}>{requirementsText}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.checkoutButton, !isCheckoutEnabled && styles.disabledCheckoutButton]}
              onPress={handleCheckOut}
              disabled={!isCheckoutEnabled || isCheckingOut}
              activeOpacity={0.8}
            >
              {isCheckingOut ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.checkoutButtonText}>{checkOutStep || 'Checking out...'}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={19} color={isCheckoutEnabled ? '#FFFFFF' : '#8C94A3'} />
                  <Text style={[styles.checkoutButtonText, !isCheckoutEnabled && styles.disabledCheckoutButtonText]}>
                    Complete Visit
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    const renderCompletedActions = () => {
      const durationText = visitData.visitDuration;
      const hasGiftImage = isGiftImageUploaded || visit?.attachmentResponse?.some((attachment) => attachment.tag === 'gift');
      
      const CompletedRecordItem = ({ icon, title, count, detail, emptyText, onPress, iconStyle, iconColor, isLast = false }) => {
        const hasRecords = Number(count) > 0;

        return (
          <TouchableOpacity
            style={[styles.completedItem, isLast && styles.completedItemLast]}
            onPress={onPress}
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${hasRecords ? detail : emptyText}`}
          >
            <View style={styles.completedItemHeader}>
              <View style={[styles.completedItemIcon, iconStyle]}>
                <Ionicons name={icon} size={20} color={iconColor || '#4F46E5'} />
              </View>
              <View style={styles.completedItemCopy}>
                <Text style={styles.completedItemTitle}>{title}</Text>
                <Text style={[styles.completedRecordValue, hasRecords && styles.completedRecordValueSuccess]}>
                  {hasRecords ? detail : emptyText}
                </Text>
              </View>
            </View>
            <View style={styles.completedItemAction}>
              <Text style={styles.completedItemActionText}>View</Text>
              <Ionicons name="chevron-forward" size={15} color="#4F46E5" />
            </View>
          </TouchableOpacity>
        );
      };

      if (isGiftingVisit) {
        return (
          <View style={styles.completedContainer}>
            <View style={styles.completedItemsContainer}>
              <View style={styles.completedItemsHeader}>
                <View style={styles.completedItemsHeaderIcon}>
                  <Ionicons name="folder-open-outline" size={18} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.completedItemsTitle}>Visit records</Text>
                  <Text style={styles.completedItemsSubtitle}>Review the details captured during this visit</Text>
                </View>
              </View>
              <CompletedRecordItem
                icon="gift-outline"
                title="Gift Image"
                count={hasGiftImage ? 1 : 0}
                detail="Gift image captured"
                emptyText="No gift image"
                iconStyle={{ backgroundColor: '#D1FAE5' }}
                iconColor="#059669"
                isLast={true}
                onPress={() => {
                  const giftAttachment = visit?.attachmentResponse?.find((att) => att.tag === 'gift');
                  if (giftAttachment && giftAttachment.fileDownloadUri) {
                    openBottomSheet('Gift Image', GiftImageViewer, { imageUrl: giftAttachment.fileDownloadUri });
                  } else {
                    Alert.alert('Not available', 'Gift image is not available yet.');
                  }
                }}
              />
            </View>
          </View>
        );
      }

      const complaintsCount = Array.isArray(visitData.complaints) ? visitData.complaints.length : 0;
      const requirementsCount = Array.isArray(visitData.requirements) ? visitData.requirements.length : 0;
      const brandsCount = Array.isArray(visitData.brandsInUse) ? visitData.brandsInUse.length : 0;
      const completedNotesCount = Array.isArray(visitData.notes) ? visitData.notes.length : notesCount;

      const SummaryMetric = ({ icon, label, value, iconStyle, iconColor = '#4F46E5' }) => (
        <View style={styles.summaryCard}>
          <View style={[styles.summaryMetricIcon, iconStyle]}>
            <Ionicons name={icon} size={17} color={iconColor} />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
          <Text style={styles.summaryLabel} numberOfLines={1}>{label}</Text>
        </View>
      );



      return (
        <View style={styles.completedContainer}>
          <View style={styles.summaryCardsContainer}>
            <SummaryMetric icon="time-outline" label="Duration" value={durationText || '0 minutes'} />
            <View style={styles.summaryDivider} />
            {!isSiteRelatedClient ? (
              <SummaryMetric
                icon="cash-outline"
                label="Monthly Sales"
                value={visitData.monthlySales ? `${visitData.monthlySales}T` : '0T'}
                iconStyle={styles.summaryMetricIconSuccess}
                iconColor="#059669"
              />
            ) : (
              <SummaryMetric
                icon="business-outline"
                label="Projects"
                value={String(sitesCount)}
                iconStyle={styles.summaryMetricIconBlue}
                iconColor="#2563EB"
              />
            )}
            <View style={styles.summaryDivider} />
            <SummaryMetric
              icon="trending-up-outline"
              label="Intent Level"
              value={`${intentLevel}/10`}
              iconStyle={styles.summaryMetricIconWarning}
              iconColor="#D97706"
            />
          </View>

          <View style={styles.completedItemsContainer}>
            <View style={styles.completedItemsHeader}>
              <View style={styles.completedItemsHeaderIcon}>
                <Ionicons name="folder-open-outline" size={18} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.completedItemsTitle}>Visit records</Text>
                <Text style={styles.completedItemsSubtitle}>Review the details captured during this visit</Text>
              </View>
            </View>
            {isSiteRelatedClient && (
              <>
                <CompletedRecordItem
                  icon="business-outline"
                  title="Projects"
                  count={sitesCount}
                  detail={`${sitesCount} ${sitesCount === 1 ? 'project' : 'projects'} added`}
                  emptyText="No projects added"
                  iconStyle={styles.completedItemIconBlue}
                  iconColor="#2563EB"
                  onPress={() => openModal('Sites', Sites, {
                    visitId,
                    storeId: visit.storeId,
                    authToken,
                    readOnly: true,
                    clientType: clientType
                  })}
                />
                <CompletedRecordItem
                  icon="people-outline"
                  title="Contacts"
                  count={contactsCount}
                  detail={`${contactsCount} ${contactsCount === 1 ? 'contact' : 'contacts'} added`}
                  emptyText="No contacts added"
                  iconStyle={styles.completedItemIconTeal}
                  iconColor="#0F766E"
                  onPress={() => openModal('Contacts', ContactsManager, {
                    storeId: visit.storeId,
                    authToken,
                    readOnly: true
                  })}
                />
              </>
            )}

            <CompletedRecordItem
              icon="warning-outline"
              title="Complaints"
              count={complaintsCount}
              detail={`${complaintsCount} ${complaintsCount === 1 ? 'complaint' : 'complaints'} recorded`}
              emptyText="No complaints received"
              iconStyle={styles.completedItemIconWarning}
              iconColor="#EA580C"
              onPress={() => openBottomSheet('Complaints', Complaints, {
                visitId,
                authToken,
                readOnly: true
              })}
            />

            <CompletedRecordItem
              icon="list-outline"
              title="Requirements"
              count={requirementsCount}
              detail={`${requirementsCount} ${requirementsCount === 1 ? 'requirement' : 'requirements'} collected`}
              emptyText="No requirements collected"
              iconStyle={styles.completedItemIconBlue}
              iconColor="#2563EB"
              onPress={() => openBottomSheet('Requirements', Requirements, {
                visitId,
                authToken,
                readOnly: true
              })}
            />

            <CompletedRecordItem
              icon="pricetags-outline"
              title="Brands"
              count={brandsCount}
              detail={`${brandsCount} ${brandsCount === 1 ? 'brand' : 'brands'} added`}
              emptyText="No brands added"
              iconStyle={styles.completedItemIconPurple}
              iconColor="#7C3AED"
              onPress={() => openBottomSheet('Brands', BrandsProCons, {
                visitId,
                authToken,
                readOnly: true
              })}
            />

            <CompletedRecordItem
              icon="document-text-outline"
              title="Notes"
              count={completedNotesCount}
              detail={`${completedNotesCount} ${completedNotesCount === 1 ? 'note' : 'notes'} added`}
              emptyText="No notes added"
              iconStyle={styles.completedItemIconIndigo}
              iconColor="#4F46E5"
              isLast={true}
              onPress={() => openBottomSheet('Notes', Notes, {
                visitId,
                storeId: visit.storeId,
                authToken,
                readOnly: true
              })}
            />
          </View>
        </View>
      );
    };

    return (
      <View style={styles.cardActionsContainer}>
        {visitStatus === 'Assigned' && renderAssignedActions()}
        {visitStatus === 'Ongoing' && renderOngoingActions()}
        {visitStatus === 'Completed' && renderCompletedActions()}
      </View>
    );
  };

  const getCheckoutRequirementsText = () => {
    if (isGiftingVisit) {
      return isGiftImageUploaded ? '' : 'Please add a gift image before checking out.';
    }
    const missingRequirements = [];

    if (!visitData.brandsInUse || visitData.brandsInUse.length === 0) {
      missingRequirements.push('add brands');
    }
    if (intentLevel === 0) {
      missingRequirements.push('set intent level');
    }
    if (!visitData.notes || visitData.notes.length === 0) {
      missingRequirements.push('add notes');
    }

    if (isSiteRelatedClient) {
      if (sitesCount === 0) {
        missingRequirements.push('add at least one site');
      }
    } else {
      if (!visitData.monthlySales || visitData.monthlySales <= 0) {
        missingRequirements.push('enter monthly sales');
      }
    }

    if (missingRequirements.length === 0) return '';

    const requirementsText = missingRequirements.join(', ');
    return `Please ${requirementsText} before checking out.`;
  };

  const openModal = (title, Component, props) => {
    if (!visit?.storeId) {
      console.log('Store ID not available yet');
      return;
    }
    setModalTitle(title);
    setModalContent(
      <Component
        {...props}
        onClose={() => setModalVisible(false)}
        setModalVisible={setModalVisible}
        storeId={visit.storeId}
        authToken={authToken}
        clientType={clientType}
        onSitesUpdated={handleSitesUpdated}
      />
    );
    setModalVisible(true);
  };

  // Add this useEffect after other useEffects
  useEffect(() => {
    const checkRequiredFields = () => {
      if (isGiftingVisit) {
        setIsCheckoutEnabled(isGiftImageUploaded);
        return;
      }
      const commonChecks = {
        hasBrands: visitData.brandsInUse?.length > 0,
        hasIntent: intentLevel > 0,
        hasNotes: visitData.notes?.length > 0
      };

      const specificCheck = isSiteRelatedClient 
        ? { hasSites: sitesCount > 0 }
        : { hasMonthlySales: visitData.monthlySales > 0 };

      const allChecks = { ...commonChecks, ...specificCheck };
      const shouldEnable = Object.values(allChecks).every(Boolean);
      
      console.log('Checkout requirements check:', {
        ...commonChecks,
        ...specificCheck,
        shouldEnable
      });
      
      setIsCheckoutEnabled(shouldEnable);
    };

    checkRequiredFields();
  }, [visitData, intentLevel, sitesCount, isSiteRelatedClient, isGiftingVisit, isGiftImageUploaded]);

  useEffect(() => {
    if (visit?.storeId) {
      fetchSitesCount();
    }
  }, [visit?.storeId]);

  const createVisitAPI = async () => {
    try {
      setIsCreatingVisit(true);
      // Add your API call here
      // Example:
      // const response = await axios.post('your-api-endpoint', {
      //   // your data
      // });
      setIsCreatingVisit(false);
      setConfirmationVisible(false);
    } catch (error) {
      console.error('Error creating visit:', error);
      setIsCreatingVisit(false);
    }
  };

  const ConfirmationBottomSheet = () => (
    <Modal
      visible={isConfirmationVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setConfirmationVisible(false)}
    >
      <View style={styles.confirmationContainer}>
        <View style={styles.confirmationContent}>
          <View style={styles.confirmationHeader}>
            <Text style={styles.confirmationTitle}>Ongoing Visits</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setConfirmationVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.bottomSheetScrollView}>
            {ongoingVisits.map((ongoingVisit, index) => (
              <View key={index} style={styles.existingVisitCard}>
                <View style={styles.existingVisitHeader}>
                  <Text style={styles.existingVisitStoreName}>{ongoingVisit.storeName}</Text>
                  <Text style={styles.existingVisitDate}>{format(new Date(ongoingVisit.visit_date), 'MMMM d, yyyy')}</Text>
                </View>
                <View style={styles.existingVisitDetails}>
                  <View style={styles.existingVisitItem}>
                    <Ionicons name="location-outline" size={20} color="#6200EE" />
                    <Text style={styles.existingVisitText}>{ongoingVisit.city}</Text>
                  </View>
                  <View style={styles.existingVisitItem}>
                    <Ionicons name="bookmark-outline" size={20} color="#6200EE" />
                    <Text style={styles.existingVisitText}>{ongoingVisit.purpose || 'N/A'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewVisitButton}
                  onPress={() => {
                    setConfirmationVisible(false);
                    navigation.navigate('VisitScreen', { visitId: ongoingVisit.id, authToken });
                  }}
                >
                  <Text style={styles.viewVisitButtonText}>View Visit</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.confirmationMessage}>{confirmationMessage}</Text>
          {!ongoingVisits.some(visit => visit.checkinDate && !visit.checkoutDate) && (
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.cancelButton]}
                onPress={() => setConfirmationVisible(false)}
              >
                <Text style={styles.confirmationButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmButton]}
                onPress={() => {
                  setConfirmationVisible(false);
                  createVisitAPI();
                }}
                disabled={isCreatingVisit}
              >
                {isCreatingVisit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createVisitButtonText}>Create Visit</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const fetchOngoingVisits = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd');
      
      const response = await axios.get(
        `${API_BASE_URL}/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${formattedDate}&end=${formattedDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const ongoingVisits = response.data.filter(
        (visit) => visit.checkinDate && !visit.checkoutDate
      );
      setOngoingVisits(ongoingVisits);
      return ongoingVisits.length > 0;
    } catch (error) {
      console.error('Error fetching ongoing visits:', error);
      return false;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView style={styles.bottomSheetScrollView}>
          {isBirthday && storeDetails && visitStatus === 'Completed' && (
            <View style={styles.birthdayCard}>
              <View style={styles.birthdayCardContent}>
                <Ionicons name="gift" size={32} color="#EC4899" />
                <View style={styles.birthdayTextContainer}>
                  <Text style={styles.birthdayTitle}>Happy Birthday!</Text>
                  <Text style={styles.birthdayMessage}>
                    Today is {storeDetails.clientFirstName} {storeDetails.clientLastName}'s birthday!
                  </Text>
                </View>
              </View>
            </View>
          )}
          {visit && <VisitInfo />}
          <CardActions />
        </ScrollView>
      )}
      <BottomSheet
        isVisible={bottomSheetVisible}
        onClose={closeBottomSheet}
        title={bottomSheetTitle}
        scrollable={false}
      >
        {bottomSheetContent}
      </BottomSheet>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            {modalContent}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <ConfirmationBottomSheet />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    padding: 15,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 5,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  storeButton: {
    // Styles for store button
  },
  bottomSheetContent: {
    padding: 20,
  },
  visitInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#E0E7FF',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  steelReminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E7E9EF',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  steelReminderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  steelReminderIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  steelReminderTitleWrap: {
    flex: 1,
  },
  steelReminderTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  steelReminderInputRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  steelReminderInputWrap: {
    flex: 1,
    marginRight: 10,
  },
  steelReminderLabel: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  steelReminderInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  steelReminderSaveButton: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
  },
  steelReminderSaveButtonDisabled: {
    opacity: 0.65,
  },
  steelReminderSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  steelReminderMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  steelReminderMetaText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
    marginTop: 4,
  },
  steelReminderSavedText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  materialCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 12,
  },
  materialRow: {
    marginBottom: 16,
  },
  materialField: {
    marginBottom: 12,
  },
  materialLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
    fontWeight: '500',
  },
  materialInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  materialInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  removeMaterialButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  addMaterialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addMaterialButtonText: {
    marginLeft: 6,
    color: '#4F46E5',
    fontWeight: '600',
  },
  saveMaterialButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveMaterialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  materialInfoNote: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  stageSection: {
    marginTop: 8,
  },
  stageOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  stageOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  stageOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  stageOptionText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '500',
  },
  stageOptionTextSelected: {
    color: '#4F46E5',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  rightAlignedItem: {
    marginLeft: 14,
  },
  infoIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoIconSuccess: {
    backgroundColor: '#EEF2FF',
  },
  infoTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  infoTitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '700',
    lineHeight: 17,
  },
  infoStatusValue: {
    color: '#059669',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  statusTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusValue: {
    backgroundColor: '#ffeb3b',
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  cardActionsContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    marginHorizontal: 10,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  ongoingActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    margin: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionBtn: {
    // Leave enough room for the fixed 10px grid gap after percentage rounding
    // so compact Android devices consistently keep two cards per row.
    width: '48%',
    minHeight: 74,
    flexDirection: 'row',
    backgroundColor: '#FAFAFF',
    borderRadius: 12,
    borderColor: '#E5E6F5',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  actionBtnIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEEFF',
    marginRight: 8,
  },
  actionBtnIconDisabled: {
    backgroundColor: '#F0F1F3',
  },
  actionBtnContent: {
    flex: 1,
    minWidth: 0,
  },
  actionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  actionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  actionStatusDotComplete: {
    backgroundColor: '#22C55E',
  },
  actionStatusDotEmpty: {
    backgroundColor: '#C3C8D0',
  },
  actionStatusText: {
    color: '#8A93A2',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  actionStatusTextComplete: {
    color: '#15803D',
  },
  checkoutButton: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 13,
  },
  disabledCheckoutButton: {
    backgroundColor: '#ECEEF3',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledCheckoutButtonText: {
    color: '#8C94A3',
  },
  visitKeyboardView: {
    flex: 1,
  },
  visitScrollContent: {
    paddingBottom: 16,
  },
  bottomSheetScrollView: {
    // Removed fixed maxHeight to avoid inner blank space at the bottom of the sheet
    paddingBottom: 0,
  },
  disabledBtn: {
    backgroundColor: '#F2F3F5',
    borderColor: '#E5E7EB',
    opacity: 0.72,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#2F3746',
    fontWeight: '700',
  },
  disabledText: {
    color: '#999',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  timerLarge: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#4A90E2',
  },
  intentRow: {
    marginTop: 15,
  },
  intentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    textAlign: 'center',
    marginTop: 5,
  },
  visitSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  visitSummaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  completedStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  completedStateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  completedStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  editButton: {
    color: '#4A90E2',
    fontSize: 14,
  },
  completedStateContent: {
    // Content styles
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeStatus: {
    backgroundColor: '#4F46E5',
  },
  inactiveStatus: {
    backgroundColor: '#D1D5DB',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
    marginBottom: 5,
    fontSize: 12,
  },
  proTag: {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
  conTag: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },

  orderItem: {
    marginBottom: 10,
  },
  orderTitle: {
    fontWeight: 'bold',
  },
  orderDescription: {
    color: '#666',
  },
  complaintItem: {
    marginBottom: 10,
  },
  complaintTitle: {
    fontWeight: 'bold',
  },
  complaintDescription: {
    color: '#666',
  },
  checkinInfo: {
    textAlign: 'center',
    marginTop: 10,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  completedStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  completedStateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completedStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 12,
    marginLeft: 36,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  summaryTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  viewButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  viewButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  viewButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  countBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  countIndicator: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  countIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  intentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#E0E7FF',
    borderWidth: 1,
    padding: 15,
    marginTop: 15,
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  intentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  sliderLabel: {
    color: '#4A148C',
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  ratingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  activeRatingButton: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  activeRatingText: {
    color: '#FFFFFF',
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 5,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  stockLeftContainer: {
    marginTop: 16,
  },
  stockLeftLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stockLeftInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C7D2FE',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    padding: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactsModalHeader: {
    minHeight: 58,
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomColor: '#E7EAF0',
  },
  contactsModalTitle: {
    fontSize: 18,
    color: '#202938',
    textAlign: 'center',
  },
  closeButton: {
    padding: 5,
  },
  contactsModalCloseButton: {
    position: 'absolute',
    right: 10,
  },
  modalScrollView: {
    flex: 1,
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 160,
  },
  contactsModalScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  ongoingRecordsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E9EF',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ongoingRecordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  ongoingRecordsHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEEFF',
    marginRight: 9,
  },
  ongoingRecordsHeading: {
    flex: 1,
  },
  ongoingRecordsTitle: {
    color: '#202938',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  actionButton: {
    width: `${100 / 2 - 5}%`, // 2 columns with gap consideration
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  visitDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkInSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 22,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  checkInSteps: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepNode: {
    alignItems: 'center',
    minWidth: 62,
  },
  stepIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  stepCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  stepLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 7,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#4F46E5',
  },
  stepConnector: {
    height: 2,
    width: 64,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 2,
    marginTop: 14,
  },
  checkInActions: {
    gap: 22,
  },
  actionStep: {
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  actionCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 0,
    overflow: 'visible',
    position: 'relative',
    width: '100%',
  },
  actionCardCompleted: {
    borderStyle: 'solid',
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  completedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(236, 253, 245, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  completedText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    minHeight: 56,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkInButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
  checkInButtonCompleted: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkInButtonTextCompleted: {
    color: '#059669',
  },
  checkinInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  checkinInfoText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  headerContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completedContainer: {
    gap: 12,
  },
  completedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  completedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  completedSectionTitle: {
    color: '#202938',
    fontSize: 14,
    fontWeight: '700',
  },
  completedSummarySection: {
    marginBottom: 0,
  },
  completedSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  completedSummaryLabel: {
    flex: 0.42,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    paddingRight: 12,
  },
  completedSummaryValue: {
    flex: 0.58,
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E9F2',
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  summaryMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginBottom: 7,
  },
  summaryMetricIconSuccess: {
    backgroundColor: '#ECFDF5',
  },
  summaryMetricIconBlue: {
    backgroundColor: '#EFF6FF',
  },
  summaryMetricIconWarning: {
    backgroundColor: '#FFF7ED',
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#ECEEF4',
    marginVertical: 3,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#7C8494',
    textAlign: 'center',
  },
  completedItemsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E9F2',
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  completedItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
  },
  completedItemsHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  completedItemsTitle: {
    color: '#202938',
    fontSize: 14,
    fontWeight: '700',
  },
  completedItemsSubtitle: {
    color: '#7C8494',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  completedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
  },
  completedItemLast: {
    paddingBottom: 13,
  },
  completedItemHeader: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  completedItemIconWarning: {
    backgroundColor: '#FFF3E9',
  },
  completedItemIconBlue: {
    backgroundColor: '#EFF6FF',
  },
  completedItemIconTeal: {
    backgroundColor: '#F0FDFA',
  },
  completedItemIconPurple: {
    backgroundColor: '#F5F3FF',
  },
  completedItemIconIndigo: {
    backgroundColor: '#EEF2FF',
  },
  completedItemCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  completedItemTitle: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#293241',
  },
  completedRecordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 10,
  },
  completedRecordValue: {
    color: '#7C8494',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    marginTop: 1,
  },
  completedRecordValueSuccess: {
    color: '#059669',
  },
  completedItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    height: 30,
    paddingHorizontal: 7,
    gap: 1,
    backgroundColor: '#F3F4FF',
    borderRadius: 9,
  },
  completedItemActionText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmationContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  confirmationContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  existingVisitCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  existingVisitHeader: {
    marginBottom: 8,
  },
  existingVisitStoreName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  existingVisitDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  existingVisitDetails: {
    marginBottom: 12,
  },
  existingVisitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  existingVisitText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  viewVisitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewVisitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  confirmationButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
  },
  cancelButton: {
    backgroundColor: '#D1D5DB',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
  },
  confirmationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  createVisitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  giftImageSection: {
    marginBottom: 20,
  },
  upcomingSiteCountSection: {
    marginBottom: 20,
  },
  discussionSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  fieldCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  fieldCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  fieldCardContent: {
    marginTop: 8,
  },
  numericInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  upcomingSiteInfoInput: {
    minHeight: 96,
    marginTop: 12,
  },
  discussionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    justifyContent: 'space-between',
  },
  discussionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  checkoutPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E9EF',
    padding: 14,
    marginTop: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  giftingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7F5',
    padding: 16,
    marginTop: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  giftingHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  giftingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginRight: 12,
  },
  giftingCopy: { flex: 1, paddingTop: 1 },
  giftingTitle: { color: '#202938', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  giftingDescription: { color: '#667085', fontSize: 13, lineHeight: 18, marginTop: 3 },
  giftingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
  },
  giftingHintText: { flex: 1, marginLeft: 7, color: '#7C8494', fontSize: 12, lineHeight: 16 },
  giftUploadedState: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
  },
  giftUploadedText: { marginLeft: 8, color: '#047857', fontSize: 14, fontWeight: '700' },
  checkoutPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutPanelIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  checkoutPanelIconReady: {
    backgroundColor: '#E8F8F1',
  },
  checkoutPanelIconPending: {
    backgroundColor: '#EFEEFF',
  },
  checkoutPanelHeading: {
    flex: 1,
    minWidth: 0,
  },
  checkoutPanelTitle: {
    color: '#202938',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  checkoutStatePill: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 7,
  },
  checkoutStatePillReady: {
    backgroundColor: '#E8F8F1',
  },
  checkoutStatePillPending: {
    backgroundColor: '#FFF5DF',
  },
  checkoutStateText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
  },
  checkoutStateTextReady: {
    color: '#047857',
  },
  checkoutStateTextPending: {
    color: '#B45309',
  },
  checkoutRequirementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 13,
    borderRadius: 10,
    backgroundColor: '#FFF9ED',
    borderWidth: 1,
    borderColor: '#F8E4B3',
  },
  checkoutRequirementText: {
    flex: 1,
    color: '#8A5A08',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  birthdayCard: {
    backgroundColor: '#FFF5F8',
    borderColor: '#FBCFE8',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  birthdayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  birthdayMessage: {
    color: '#9D174D',
    fontSize: 13,
    marginLeft: 10,
  },
  birthdayTextContainer: {
    flex: 1,
  },
  birthdayTitle: {
    color: '#831843',
    fontSize: 14,
    fontWeight: '700',
  },
  viewButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
});

export default VisitScreen;
