import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import * as TaskManager from 'expo-task-manager';

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

// Add this constant before the component
const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// Remove the task definition since we don't need background tracking anymore
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
  const [isLocationTaskRunning, setIsLocationTaskRunning] = useState(false);
  const [checkInStep, setCheckInStep] = useState(null);
  const [checkOutStep, setCheckOutStep] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);

  const fetchSitesCount = async (storeIdParam) => {
    const storeId = storeIdParam || visit?.storeId;
    if (!storeId) return;
    try {
      const response = await axios.get(
        `https://api.gajkesaristeels.in/site/getByStore?id=${storeId}`,
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
      const visitResponse = await axios.get(`https://api.gajkesaristeels.in/visit/getById?id=${visitId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      const visitData = visitResponse.data;
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
            const storeResponse = await axios.get(`https://api.gajkesaristeels.in/store/getById?id=${visitData.storeId}`, {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            });
            setClientType((storeResponse.data.clientType || 'shop').toLowerCase());
          } catch (error) {
            console.error('Error fetching store details:', error);
            setClientType('shop'); // Default to shop if fetch fails
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
      }
    } catch (error) {
      console.error('Error fetching visit details:', error);
    }
  };

  const isSiteRelatedClient = ['site visit', 'engineer', 'architect', 'builder'].includes((clientType || '').toLowerCase());
  
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
      const response = await axios.get(`https://api.gajkesaristeels.in/store/getById?id=${storeId}`, {
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
      const response = await axios.get(`https://api.gajkesaristeels.in/notes/getByVisit?id=${visitId}`, {
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
      const response = await axios.get(`https://api.gajkesaristeels.in/visit/getProCons?visitId=${visitId}`, {
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
      const response = await axios.get(`https://api.gajkesaristeels.in/task/getByVisit?type=complaint&visitId=${visitId}`, {
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
      const response = await axios.get(`https://api.gajkesaristeels.in/task/getByVisit?type=requirement&visitId=${visitId}`, {
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
      const response = await axios.get(`https://api.gajkesaristeels.in/monthly-sale/getByVisit?visitId=${visitId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setMonthlySale(response.data.newMonthlySale?.toString() || '');
    } catch (error) {
      console.error('Error fetching monthly sale:', error);
      Alert.alert('Error', 'Failed to fetch monthly sale. Please try again.');
    }
  };

  const fetchIntentLevel = async () => {
    try {
      const response = await axios.get(`https://api.gajkesaristeels.in/intent-audit/getByVisit?id=${visitId}`, {
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
        `https://api.gajkesaristeels.in/visit/edit?id=${visit.id}`,
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
        `https://api.gajkesaristeels.in/visit/edit?id=${visit.id}`,
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
    setVisitData(prevData => ({
      ...prevData,
      monthlySales: newSale
    }));
    setMonthlySale(newSale.toString());
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

  const requestLocationPermission = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for check-in.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  };

  const handleCheckIn = async () => {
    if (!isCheckInImageUploaded) {
      Alert.alert('Error', 'Please add check-in images before checking in.');
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

      // Step 2: Check permissions and location services
      setCheckInStep('Checking location permissions...');
      const hasLocationPermission = await requestLocationPermission();
      if (!hasLocationPermission) {
        setIsCheckingIn(false);
        setCheckInStep(null);
        return;
      }

      // Check if location services are enabled
      const locationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!locationServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to check in.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        setIsCheckingIn(false);
        setCheckInStep(null);
        return;
      }

      // Step 3: Get Location with new optimized method
      setCheckInStep('Getting your location...');
      console.log('Getting location with optimized method...');
      const location = await getLocationWithFallback();

      // Step 4: Send check-in request
      setCheckInStep('Checking in...');
      const { latitude, longitude } = location.coords;
      console.log('Check-in location:', latitude, longitude);

      const checkinResponse = await axios.put(
        `https://api.gajkesaristeels.in/visit/checkin?id=${visitId}`,
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
          '• You are outdoors or near a window\n' +
          '• GPS is enabled\n' +
          '• You have a clear view of the sky\n' +
          '• Try moving to an area with better GPS signal';
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
      Alert.alert('Cannot Checkout', 'Please ensure you have added brands, set intent level, and entered monthly sales.');
      return;
    }

    setIsCheckingOut(true);
    try {
      // Step 1: Check permissions
      setCheckOutStep('Checking location permissions...');
      const hasLocationPermission = await requestLocationPermission();
      if (!hasLocationPermission) {
        setIsCheckingOut(false);
        return;
      }

      // Step 2: Get Location
      setCheckOutStep('Getting your location...');
      console.log('Getting location for checkout...');
      const location = await getLocationWithFallback();

      if (!location) {
        throw new Error('Could not get location');
      }

      // Step 3: Send checkout request
      setCheckOutStep('Checking out...');
      const { latitude, longitude } = location.coords;
      console.log('Check-out location:', latitude, longitude);

      const response = await axios.put(
        `https://api.gajkesaristeels.in/visit/checkout?id=${visitId}`,
        {
          checkoutLatitude: latitude,
          checkoutLongitude: longitude,
          outcome: 'done',
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
        <Icon name={icon} size={20} color="#4A90E2" />
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
        <InfoItem icon="calendar" title="Visit Date" value={visit ? format(new Date(visit.visit_date), 'yyyy-MM-dd') : 'N/A'} />
        <InfoItem icon="search" title="Purpose" value={visit ? visit.purpose : 'N/A'} containerStyle={styles.rightAlignedItem} />
      </View>
      <View style={styles.infoRow}>
        <InfoItem icon="user" title="Customer" value={visit ? visit.storeName : 'N/A'} />
        <InfoItem icon="info-circle" title="Visit Status" value={visitStatus} containerStyle={styles.rightAlignedItem} />
      </View>
    </View>
  );

  const CardActions = () => {
    const ActionButton = ({ icon, text, onPress, disabled = false, badge = null }) => (
      <TouchableOpacity
        style={[styles.actionBtn, disabled && styles.disabledBtn]}
        onPress={onPress}
        disabled={disabled}
      >
        <Icon name={icon} size={24} color={disabled ? "#A9A9A9" : "#4A90E2"} />
        <Text style={[styles.actionText, disabled && styles.disabledText]}>{text}</Text>
        {badge !== null && badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );

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
            icon="people"
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
              readOnly: false
            })}
            badge={visitData.monthlySales ? '✓' : null}
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

          <TouchableOpacity
            style={[styles.checkoutButton, !isCheckoutEnabled && styles.disabledCheckoutButton]}
            onPress={handleCheckOut}
            disabled={!isCheckoutEnabled || isCheckingOut}
          >
            {isCheckingOut ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.checkoutButtonText}>{checkOutStep || 'Checking out...'}</Text>
              </>
            ) : (
              <Text style={styles.checkoutButtonText}>Check Out</Text>
            )}
          </TouchableOpacity>

          {!isCheckoutEnabled && (
            <Text style={styles.warningText}>
              {getCheckoutRequirementsText()}
            </Text>
          )}
        </View>
      );
    };

    const renderCompletedActions = () => {
      const durationText = visitData.visitDuration;

      return (
        <View style={styles.completedContainer}>
          <View style={styles.summaryCardsContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{durationText || '0 minutes'}</Text>
              <Text style={styles.summaryLabel}>Duration</Text>
            </View>
            {!isSiteRelatedClient ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{visitData.monthlySales ? `${visitData.monthlySales}T` : '0T'}</Text>
                <Text style={styles.summaryLabel}>Monthly Sales</Text>
              </View>
            ) : (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{sitesCount} Projects</Text>
                <Text style={styles.summaryLabel}>Sites</Text>
              </View>
            )}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{intentLevel}/10</Text>
              <Text style={styles.summaryLabel}>Intent Level</Text>
            </View>
          </View>

          <View style={styles.completedItemsContainer}>
            {isSiteRelatedClient && (
              <>
                <TouchableOpacity 
                  style={styles.completedItem}
                  onPress={() => openModal('Sites', Sites, {
                    visitId,
                    storeId: visit.storeId,
                    authToken,
                    readOnly: true,
                    clientType: clientType
                  })}
                >
                  <View style={styles.completedItemHeader}>
                    <Ionicons name="business-outline" size={24} color="#4F46E5" />
                    <Text style={styles.completedItemTitle}>Projects ({sitesCount})</Text>
                  </View>
                  <View style={styles.viewButtonContainer}>
                    <Text style={styles.viewButtonText}>View</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.completedItem}
                  onPress={() => openModal('Contacts', ContactsManager, {
                    storeId: visit.storeId,
                    authToken,
                    readOnly: true
                  })}
                >
                  <View style={styles.completedItemHeader}>
                    <Ionicons name="people-outline" size={24} color="#4F46E5" />
                    <Text style={styles.completedItemTitle}>Contacts ({contactsCount})</Text>
                  </View>
                  <View style={styles.viewButtonContainer}>
                    <Text style={styles.viewButtonText}>View</Text>
                  </View>
                </TouchableOpacity>
                {contactsCount === 0 && (
                  <Text style={styles.noDataText}>No contacts added</Text>
                )}
              </>
            )}

            <TouchableOpacity 
              style={styles.completedItem}
              onPress={() => openBottomSheet('Complaints', Complaints, {
                visitId,
                authToken,
                readOnly: true
              })}
            >
              <View style={styles.completedItemHeader}>
                <Ionicons name="warning-outline" size={24} color="#4F46E5" />
                <Text style={styles.completedItemTitle}>Complaints ({visitData.complaints?.length || 0})</Text>
              </View>
              <View style={styles.viewButtonContainer}>
                <Text style={styles.viewButtonText}>View</Text>
              </View>
            </TouchableOpacity>
            {visitData.complaints?.length === 0 && (
              <Text style={styles.noDataText}>No complaints received</Text>
            )}

            <TouchableOpacity 
              style={styles.completedItem}
              onPress={() => openBottomSheet('Requirements', Requirements, {
                visitId,
                authToken,
                readOnly: true
              })}
            >
              <View style={styles.completedItemHeader}>
                <Ionicons name="list-outline" size={24} color="#4F46E5" />
                <Text style={styles.completedItemTitle}>Requirements ({visitData.requirements?.length || 0})</Text>
              </View>
              <View style={styles.viewButtonContainer}>
                <Text style={styles.viewButtonText}>View</Text>
              </View>
            </TouchableOpacity>
            {visitData.requirements?.length === 0 && (
              <Text style={styles.noDataText}>No requirements collected</Text>
            )}

            <TouchableOpacity 
              style={styles.completedItem}
              onPress={() => openBottomSheet('Brands', BrandsProCons, {
                visitId,
                authToken,
                readOnly: true
              })}
            >
              <View style={styles.completedItemHeader}>
                <Ionicons name="pricetags-outline" size={24} color="#4F46E5" />
                <Text style={styles.completedItemTitle}>Brands ({visitData.brandsInUse?.length || 0})</Text>
              </View>
              <View style={styles.viewButtonContainer}>
                <Text style={styles.viewButtonText}>View</Text>
              </View>
            </TouchableOpacity>
            {visitData.brandsInUse?.length === 0 && (
              <Text style={styles.noDataText}>No brands added</Text>
            )}

            <TouchableOpacity 
              style={styles.completedItem}
              onPress={() => openBottomSheet('Notes', Notes, {
                visitId,
                storeId: visit.storeId,
                authToken,
                readOnly: true
              })}
            >
              <View style={styles.completedItemHeader}>
                <Ionicons name="document-text-outline" size={24} color="#4F46E5" />
                <Text style={styles.completedItemTitle}>Notes ({visitData.notes?.length || 0})</Text>
              </View>
              <View style={styles.viewButtonContainer}>
                <Text style={styles.viewButtonText}>View</Text>
              </View>
            </TouchableOpacity>
            {visitData.notes?.length === 0 && (
              <Text style={styles.noDataText}>No notes added</Text>
            )}
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

  useEffect(() => {
    return () => {
      // Cleanup location tracking when component unmounts
      stopLocationTracking().catch(error => {
        console.error('Error in location cleanup:', error);
      });
    };
  }, []);

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
  }, [visitData, intentLevel, sitesCount, isSiteRelatedClient]);

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
        `https://api.gajkesaristeels.in/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${formattedDate}&end=${formattedDate}`,
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

  const stopLocationTracking = async () => {
    try {
      // Remove any location subscriptions or tracking
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
      setIsLocationTaskRunning(false);
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };

  const getLocationWithFallback = async () => {
    try {
      // First try with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000
      });
      return location;
    } catch (error) {
      console.log('Error getting high accuracy location, trying with lower accuracy:', error);
      try {
        // Fallback to lower accuracy if high accuracy fails
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000
        });
        return location;
      } catch (error) {
        console.error('Error getting location:', error);
        throw new Error('location_error');
      }
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
          {visit && <VisitInfo />}
          <CardActions />
        </ScrollView>
      )}
      <BottomSheet
        isVisible={bottomSheetVisible}
        onClose={closeBottomSheet}
        title={bottomSheetTitle}
      >
        <ScrollView style={styles.bottomSheetScrollView}>
          {bottomSheetContent}
        </ScrollView>
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
    borderRadius: 20,
    padding: 15,
    margin: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    flexWrap: 'wrap',  // Ensure text wraps properly
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    margin: 10,
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
    width: '23%', // Adjust to fit 4 buttons in a row with gap
    aspectRatio: 1,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  checkoutButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledCheckoutButton: {
    backgroundColor: '#A0AEC0',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSheetScrollView: {
    maxHeight: '90%', // Adjust this value as needed
  },
  disabledBtn: {
    backgroundColor: '#e0e0e0',
  },
  actionText: {
    fontSize: 10,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
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
    padding: 15,
    marginTop: 15,
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
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    flex: 1,
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
    justifyContent: 'space-between',
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  checkInSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  stepConnector: {
    height: 2,
    width: 60,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  checkInActions: {
    gap: 20,
  },
  actionStep: {
    gap: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  actionCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
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
    paddingVertical: 16,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  completedItemsContainer: {
    marginTop: 16,
  },
  completedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  completedItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedItemTitle: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  viewButtonContainer: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 12,
    marginLeft: 36,
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
});

export default VisitScreen;
