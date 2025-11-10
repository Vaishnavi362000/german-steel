import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator, Platform, Linking, TextInput, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import moment from 'moment';
import { useNavigation, CommonActions } from '@react-navigation/native';
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
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, isToday, isYesterday } from 'date-fns';
import ContactsManager from './ContactsManager';

// Add this constant before the component
const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

const CONSTRUCTION_STAGE_OPTIONS = [
  { label: 'Foundation', value: 'FOUNDATION' },
  { label: 'Slab 1', value: 'SLAB_1' },
  { label: 'Slab 2', value: 'SLAB_2' },
  { label: 'Plinth', value: 'PLINTH' },
  { label: 'Completing', value: 'COMPLETING' },
];

// Remove the task definition since we don't need background tracking anymore
const VisitScreen = ({ route }) => {
  const params = route?.params ?? {};
  const visitParam = params.visit;
  const visitId = params.visitId ?? visitParam?.id ?? visitParam?.visitId;
  const authToken = params.authToken;
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
  const [brandsProConsCount, setBrandsProConsCount] = useState(0);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isLocationTaskRunning, setIsLocationTaskRunning] = useState(false);
  const [checkInStep, setCheckInStep] = useState(null);
  const [checkOutStep, setCheckOutStep] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);
  const [awaitingPermissionFromSettings, setAwaitingPermissionFromSettings] = useState(false);

  const [constructionStage, setConstructionStage] = useState('');
  const [isSavingMaterialDetails, setIsSavingMaterialDetails] = useState(false);

  const shouldLogVisitApi = checkedIn && isCheckInImageUploaded;

  const logVisitApiRequest = useCallback(
    (label, { endpoint, method = 'GET', payload, forceLog = false }) => {
      if (!forceLog && !shouldLogVisitApi) {
        return;
      }
      console.log(`🛰️ [VISIT API][REQUEST][${label}] ${method.toUpperCase()} ${endpoint}`);
      if (payload !== undefined) {
        try {
          console.log(`🛰️ [VISIT API][PAYLOAD][${label}]`, JSON.stringify(payload, null, 2));
        } catch (stringifyError) {
          console.log(`🛰️ [VISIT API][PAYLOAD][${label}]`, payload);
        }
      }
    },
    [shouldLogVisitApi]
  );

  const logVisitApiResponse = useCallback(
    (label, { endpoint, status, data, forceLog = false }) => {
      if (!forceLog && !shouldLogVisitApi) {
        return;
      }
      console.log(`🛰️ [VISIT API][RESPONSE][${label}] ${endpoint} (status: ${status ?? 'unknown'})`);
      const serialized =
        typeof data === 'string'
          ? data
          : (() => {
              try {
                return JSON.stringify(data, null, 2);
              } catch (err) {
                return data;
              }
            })();
      console.log(`🛰️ [VISIT API][DATA][${label}]`, serialized);
    },
    [shouldLogVisitApi]
  );

  const logVisitApiError = useCallback(
    (label, { endpoint, error, forceLog = false }) => {
      if (!forceLog && !shouldLogVisitApi) {
        return;
      }
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.log(`🛰️ [VISIT API][ERROR][${label}] ${endpoint} (status: ${status ?? 'unknown'})`);
      if (data !== undefined) {
        try {
          console.log(`🛰️ [VISIT API][ERROR DATA][${label}]`, JSON.stringify(data, null, 2));
        } catch (stringifyError) {
          console.log(`🛰️ [VISIT API][ERROR DATA][${label}]`, data);
        }
      }
      console.log(`🛰️ [VISIT API][ERROR MESSAGE][${label}]`, error?.message);
    },
    [shouldLogVisitApi]
  );

  const fetchSitesCount = async (storeIdParam) => {
    const storeId = storeIdParam || visit?.storeId;
    if (!storeId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/site/getByStore?id=${storeId}`;
      logVisitApiRequest('fetchSitesCount', { endpoint });
      const response = await axios.get(
        endpoint,
        { 
          headers: { 
            Authorization: `Bearer ${token || authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          } 
        }
      );
      logVisitApiResponse('fetchSitesCount', { endpoint, status: response.status, data: response.data });
      
      // Check if response is HTML
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [VISIT SCREEN] Server returned HTML for sites count');
        setSitesCount(0);
        return;
      }
      
      const sites = Array.isArray(response.data) ? response.data : [];
      setSitesCount(sites.length);
    } catch (error) {
      logVisitApiError('fetchSitesCount', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/site/getByStore?id=${storeIdParam || visit?.storeId}`, error });
      console.error('Error fetching sites count:', error);
      setSitesCount(0);
    }
  };

  const fetchContactsCount = async (storeIdParam) => {
    const storeId = storeIdParam || visit?.storeId;
    if (!storeId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/professionals/getByStore?storeId=${storeId}`;
      logVisitApiRequest('fetchContactsCount', { endpoint });
      const response = await axios.get(
        endpoint,
        { 
          headers: { 
            Authorization: `Bearer ${token || authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          } 
        }
      );
      logVisitApiResponse('fetchContactsCount', { endpoint, status: response.status, data: response.data });
      setContactsCount(response.data.length);
    } catch (error) {
      logVisitApiError('fetchContactsCount', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/professionals/getByStore?storeId=${storeIdParam || visit?.storeId}`, error });
      console.error('Error fetching contacts count:', error);
      setContactsCount(0);
    }
  };

  const fetchVisitDetails = async () => {
    if (!visitId) {
      console.error('❌ [FETCH VISIT DETAILS] Missing visitId in route params:', params);
      setIsLoading(false);
      return;
    }
    console.log('🔵 [FETCH VISIT DETAILS] Starting fetch for visitId:', visitId);
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔵 [FETCH VISIT DETAILS] Using token:', token ? `${token.substring(0, 20)}...` : 'null');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getById?id=${visitId}`;
      console.log('🔵 [FETCH VISIT DETAILS] API URL:', endpoint);
      logVisitApiRequest('fetchVisitDetails', { endpoint });
      const visitResponse = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchVisitDetails', { endpoint, status: visitResponse.status, data: visitResponse.data });
      
      console.log('🔵 [FETCH VISIT DETAILS] Response status:', visitResponse.status);
      console.log('🔵 [FETCH VISIT DETAILS] Response data type:', typeof visitResponse.data);
      
      // Check if response is HTML
      if (typeof visitResponse.data === 'string' && 
          (visitResponse.data.includes('<!DOCTYPE html>') || visitResponse.data.includes('<html>'))) {
        console.log('⚠️ [FETCH VISIT DETAILS] Server returned HTML instead of JSON');
        console.log('⚠️ [FETCH VISIT DETAILS] First 200 chars:', visitResponse.data.substring(0, 200));
        setIsLoading(false);
        return;
      }
      
      const visitData = visitResponse.data;
      console.log('🔵 [FETCH VISIT DETAILS] Visit data received:', JSON.stringify(visitData, null, 2));
      if (visitData) {
        setVisit(visitData);
        setVisitStatus(getVisitStatus(visitData));
        setSliderValue(visitData.visitIntentValue || 0);
        // Initialize intent level from visitIntentValue, or convert rating to intent level
        const initialIntentLevel = visitData.visitIntentValue || (visitData.rating ? visitData.rating * 2 : 0);
        setIntentLevel(initialIntentLevel);

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

        setConstructionStage(visitData.constructionStage || '');


        // Only fetch client type if we have storeId
        if (visitData.storeId) {
          try {
            const storeEndpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getById?id=${visitData.storeId}`;
            logVisitApiRequest('fetchStoreForVisit', { endpoint: storeEndpoint });
            const storeResponse = await axios.get(storeEndpoint, {
              headers: {
                Authorization: `Bearer ${token || authToken}`,
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'IconMobile',
              },
            });
            logVisitApiResponse('fetchStoreForVisit', { endpoint: storeEndpoint, status: storeResponse.status, data: storeResponse.data });
            setClientType((storeResponse.data.clientType || 'shop').toLowerCase());
          } catch (error) {
            logVisitApiError('fetchStoreForVisit', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getById?id=${visitData.storeId}`, error });
            console.error('Error fetching store details:', error);
            setClientType('shop'); // Default to shop if fetch fails
          }
        }

        // Fetch additional data
        console.log('🔵 [FETCH VISIT DETAILS] Fetching additional data...');
        await Promise.all([
          fetchBrandsProCons(),
          fetchRequirements(),
          fetchComplaints(),
          fetchNotes(),
          fetchIntentLevel(),
          fetchSitesCount(visitData.storeId),
          fetchContactsCount(visitData.storeId),
          fetchMonthlySales(), // Add monthly sales fetch
        ]);
        console.log('✅ [FETCH VISIT DETAILS] All data fetched successfully');
      } else {
        console.log('⚠️ [FETCH VISIT DETAILS] No visit data received');
      }
    } catch (error) {
      logVisitApiError('fetchVisitDetails', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getById?id=${visitId}`, error });
      console.error('❌ [FETCH VISIT DETAILS] Error:', error);
      console.error('❌ [FETCH VISIT DETAILS] Error message:', error.message);
      console.error('❌ [FETCH VISIT DETAILS] Error response:', error.response?.data);
      console.error('❌ [FETCH VISIT DETAILS] Error status:', error.response?.status);
    } finally {
      console.log('🔵 [FETCH VISIT DETAILS] Fetch completed');
    }
  };

  const normalizedClientType = (clientType || '').toLowerCase();
  const isSiteRelatedClient = ['site visit', 'engineer', 'architect', 'contractor'].includes(normalizedClientType);
  const isDealerClient = normalizedClientType.includes('dealer');
  
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
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getById?id=${storeId}`;
      logVisitApiRequest('fetchClientType', { endpoint });
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchClientType', { endpoint, status: response.status, data: response.data });
      
      // Check if response is HTML
      if (typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'))) {
        console.log('⚠️ [VISIT SCREEN] Server returned HTML for client type');
        setClientType('shop');
        return;
      }
      
      setClientType((response.data.clientType || 'shop').toLowerCase());
    } catch (error) {
      logVisitApiError('fetchClientType', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getById?id=${storeId}`, error });
      console.error('Error fetching client type:', error);
      setClientType('shop'); // Default to shop if fetch fails
    }
  };

  const fetchNotes = async () => {
    if (!visitId) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/getByVisit?id=${visitId}`;
      logVisitApiRequest('fetchNotes', { endpoint });
      const response = await axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchNotes', { endpoint, status: response.status, data: response.data });
      const notes = Array.isArray(response.data) ? response.data : [];
      setNotesCount(notes.length);
      
      setVisitData(prevData => ({
        ...prevData,
        notes: notes
      }));
    } catch (error) {
      logVisitApiError('fetchNotes', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/notes/getByVisit?id=${visitId}`, error });
      console.error('Error fetching notes:', error);
    }
  };

  const fetchBrandsProCons = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getProCons?visitId=${visitId}`;
      logVisitApiRequest('fetchBrandsProCons', { endpoint });
      const response = await axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchBrandsProCons', { endpoint, status: response.status, data: response.data });
      
      // Check if response is HTML
      if (typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'))) {
        console.log('⚠️ [VISIT SCREEN] Server returned HTML for brands pro-cons');
        return;
      }
      
      const brandsProCons = Array.isArray(response.data) ? response.data : [];
      setBrandsProConsCount(brandsProCons.length);  // Set the count
      setVisitData(prevData => ({
        ...prevData,
        brandsProCons: brandsProCons,
        brandsInUse: brandsProCons
      }));
    } catch (error) {
      logVisitApiError('fetchBrandsProCons', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getProCons?visitId=${visitId}`, error });
      console.error('Error fetching brands pro-cons:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByVisit?type=complaint&visitId=${visitId}`;
      logVisitApiRequest('fetchComplaints', { endpoint });
      const response = await axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchComplaints', { endpoint, status: response.status, data: response.data });
      
      // Check if response is HTML
      if (typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'))) {
        console.log('⚠️ [VISIT SCREEN] Server returned HTML for complaints');
        return;
      }
      
      const filteredComplaints = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'complaint')
        : [];
      setVisitData(prevData => ({
        ...prevData,
        complaints: filteredComplaints
      }));
    } catch (error) {
      logVisitApiError('fetchComplaints', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByVisit?type=complaint&visitId=${visitId}`, error });
      console.error('Error fetching complaints:', error);
    }
  };

  const fetchRequirements = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByVisit?type=requirement&visitId=${visitId}`;
      logVisitApiRequest('fetchRequirements', { endpoint });
      const response = await axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchRequirements', { endpoint, status: response.status, data: response.data });
      const filteredRequirements = Array.isArray(response.data)
        ? response.data.filter(task => task && task.taskType === 'requirement')
        : [];
      setVisitData(prevData => ({
        ...prevData,
        requirements: filteredRequirements
      }));
    } catch (error) {
      logVisitApiError('fetchRequirements', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByVisit?type=requirement&visitId=${visitId}`, error });
      console.error('Error fetching requirements:', error);
    }
  };

  const fetchMonthlySales = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/monthly-sale/getByVisit?visitId=${visitId}`;
      logVisitApiRequest('fetchMonthlySales', { endpoint });
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchMonthlySales', { endpoint, status: response.status, data: response.data });
      
      // Check if response is HTML
      if (typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'))) {
        console.log('⚠️ [VISIT SCREEN] Server returned HTML for monthly sales');
        return;
      }
      
      // Backend returns an array of monthly sale records
      if (Array.isArray(response.data) && response.data.length > 0) {
        // Get the latest monthly sale (last item in array or highest id)
        const latestSale = response.data[response.data.length - 1];
        const monthlySaleValue = latestSale.newMonthlySale || 0;
        
        console.log('✅ [MONTHLY SALE] Fetched:', monthlySaleValue);
        setMonthlySale(monthlySaleValue.toString());
        setVisitData(prevData => ({
          ...prevData,
          monthlySales: monthlySaleValue
        }));
      } else {
        console.log('ℹ️ [MONTHLY SALE] No monthly sales found');
        setMonthlySale('');
        setVisitData(prevData => ({
          ...prevData,
          monthlySales: 0
        }));
      }
    } catch (error) {
      logVisitApiError('fetchMonthlySales', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/monthly-sale/getByVisit?visitId=${visitId}`, error });
      console.error('Error fetching monthly sale:', error);
    }
  };

  const fetchIntentLevel = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/intent-audit/getByVisit?id=${visitId}`;
      logVisitApiRequest('fetchIntentLevel', { endpoint });
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token || authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      logVisitApiResponse('fetchIntentLevel', { endpoint, status: response.status, data: response.data });
      
      // Check if response is HTML
      if (typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'))) {
        console.log('⚠️ [VISIT SCREEN] Server returned HTML for intent level');
        return;
      }
      
      console.log('Intent audit response:', response.data);

      if (Array.isArray(response.data) && response.data.length > 0) {
        // Find the latest intent level based on the highest id
        const latestIntentAudit = response.data.reduce((latest, current) => {
          return current.id > latest.id ? current : latest;
        });
        setIntentLevel(latestIntentAudit.newIntentLevel);
      } else {
        // Don't reset to 0 if no intent audit data - keep rating-based intent level
        console.log('No intent audit data found, keeping current intent level');
      }
    } catch (error) {
      logVisitApiError('fetchIntentLevel', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/intent-audit/getByVisit?id=${visitId}`, error });
      console.error('Error fetching intent level:', error.response || error);
      // Don't reset to 0 on error - keep rating-based intent level
      console.log('Error fetching intent audit, keeping current intent level');
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
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/edit?id=${visit.id}`;
      const payload = { visitIntentValue: newIntentLevel };
      logVisitApiRequest('handleUpdateIntentLevel', { endpoint, method: 'PUT', payload });
      const response = await axios.put(
        endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token || authToken}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      logVisitApiResponse('handleUpdateIntentLevel', { endpoint, status: response.status, data: response.data });

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
        throw new Error('Failed to update rating');
      }
    } catch (error) {
      logVisitApiError('handleUpdateIntentLevel', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/edit?id=${visit?.id}`, error });
      console.error('Error updating intent level:', error);
      Alert.alert('Error', 'Failed to update rating. Please try again.');
    }
  };

  const updateIntentLevel = useCallback(async (newIntentLevel) => {
    if (!visit) {
      console.warn('Visit data not loaded yet');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/edit?id=${visit.id}`;
      const payload = { visitIntentValue: newIntentLevel };
      logVisitApiRequest('updateIntentLevel', { endpoint, method: 'PUT', payload });
      const response = await axios.put(
        endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token || authToken}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      logVisitApiResponse('updateIntentLevel', { endpoint, status: response.status, data: response.data });

      if (response.status === 200) {
        setVisit(prevVisit => ({
          ...prevVisit,
          intent: newIntentLevel
        }));
        setIntentLevel(newIntentLevel);
        // Update other state variables as needed
      } else {
        throw new Error('Failed to update rating');
      }
    } catch (error) {
      logVisitApiError('updateIntentLevel', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/edit?id=${visit?.id}`, error });
      console.error('Error updating intent level:', error);
      Alert.alert('Error', 'Failed to update rating. Please try again.');
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

  const handleRatingChange = async (newRating) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/edit?id=${visit.id}`;
      const payload = { rating: newRating };
      logVisitApiRequest('handleRatingChange', { endpoint, method: 'PUT', payload });
      const response = await axios.put(
        endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token || authToken}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      logVisitApiResponse('handleRatingChange', { endpoint, status: response.status, data: response.data });

      if (response.status === 200) {
        // Update both visit rating and intent level for checkout validation
        const intentValue = newRating * 2; // Convert 1-5 star rating to 2-10 intent level
        setVisit(prevVisit => ({
          ...prevVisit,
          rating: newRating
        }));
        setIntentLevel(intentValue);
        console.log(`✅ Rating updated to ${newRating}, intent level set to ${intentValue}`);
      } else {
        throw new Error('Failed to update rating');
      }
    } catch (error) {
      logVisitApiError('handleRatingChange', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/edit?id=${visit?.id}`, error });
      console.error('Error updating rating:', error);
      Alert.alert('Error', 'Failed to update rating. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return 'today';
    } else if (isYesterday(date)) {
      return 'yesterday';
    } else {
      // Format as "8 Nov '25"
      return format(date, "d MMM ''yy");
    }
  };

  const handleSaleUpdated = async (newSale) => {
    setVisitData(prevData => ({
      ...prevData,
      monthlySales: newSale
    }));
    setMonthlySale(newSale.toString());
    // Re-fetch monthly sales to get latest data from backend
    await fetchMonthlySales();
    checkRequiredFields(); // Check if checkout should be enabled
  };

  const handleBrandAdded = (brands) => {
    const normalizedBrands = Array.isArray(brands) ? brands : [];
    setVisitData(prevData => ({
      ...prevData,
      brandsInUse: normalizedBrands
    }));
    setBrandsProConsCount(normalizedBrands.length);
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

  const handleComplaintAdded = async () => {
    // Refresh complaints data after a new complaint is added
    await fetchComplaints();
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
      // First read current permission state
      const current = await Location.getForegroundPermissionsAsync();
      console.log('🧭 [PERMISSION] Current foreground permission:', current);
      if (current?.status === 'granted') {
        return 'granted';
      }

      // If we can ask again, show the Android/iOS permission prompt in-app
      if (current?.canAskAgain !== false) {
        console.log('🧭 [PERMISSION] Requesting foreground permission...');
        const requested = await Location.requestForegroundPermissionsAsync();
        console.log('🧭 [PERMISSION] Request result:', requested);
        if (requested?.status === 'granted') {
          return 'granted';
        }
        // user actively denied
        Alert.alert(
          'Permission Needed',
          'Location permission is required for check-in.',
          [{ text: 'OK' }]
        );
        return 'denied';
      }

      // OS will not show the permission sheet anymore (user selected "Don\'t ask again")
      console.log('🧭 [PERMISSION] canAskAgain is false — permission likely blocked at OS level');
      Alert.alert(
        'Permission Blocked',
        'Location permission is blocked for this app. Please enable it from App Settings.',
        [
          { text: 'Open Settings', onPress: () => { setAwaitingPermissionFromSettings(true); Linking.openSettings(); } },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return 'blocked';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return 'error';
    }
  };

  // Ensure device location services are ON; try enabling in-app on Android
  const ensureLocationServicesEnabled = async () => {
    try {
      const before = await Location.hasServicesEnabledAsync();
      console.log('🧭 [SERVICES] Before enable check - hasServicesEnabledAsync =', before);
      if (before) return true;

      if (Platform.OS === 'android' && Location.enableNetworkProviderAsync) {
        try {
          console.log('🧭 [SERVICES] Trying enableNetworkProviderAsync() ...');
          await Location.enableNetworkProviderAsync();
          // Small delay to let the system apply change
          await new Promise((resolve) => setTimeout(resolve, 1000));
          let after = await Location.hasServicesEnabledAsync();
          console.log('🧭 [SERVICES] After first enable attempt - hasServicesEnabledAsync =', after);
          if (after) return true;

          console.log('🧭 [SERVICES] Retrying enableNetworkProviderAsync() ...');
          await Location.enableNetworkProviderAsync();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          after = await Location.hasServicesEnabledAsync();
          console.log('🧭 [SERVICES] After second enable attempt - hasServicesEnabledAsync =', after);
          return !!after;
        } catch (enableError) {
          console.log('🧭 [SERVICES] enableNetworkProviderAsync error:', enableError);
        }
      } else {
        console.log('🧭 [SERVICES] enableNetworkProviderAsync not available on this platform');
      }

      const finalState = await Location.hasServicesEnabledAsync();
      console.log('🧭 [SERVICES] Final state - hasServicesEnabledAsync =', finalState);
      return !!finalState;
    } catch (err) {
      console.log('🧭 [SERVICES] ensureLocationServicesEnabled error:', err);
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
      const permissionStatus = await requestLocationPermission();
      if (permissionStatus !== 'granted') {
        setIsCheckingIn(false);
        setCheckInStep(null);
        return;
      }

      // Check if location services are enabled; if not, try enabling in-app (Android)
      setCheckInStep('Checking device location...');
      let locationServicesEnabled = await ensureLocationServicesEnabled();
      console.log('🧭 [SERVICES] Result from ensureLocationServicesEnabled:', locationServicesEnabled);
      if (!locationServicesEnabled) {
        Alert.alert(
          'Location Required',
          'Please turn on device location to continue.',
          [
            { text: 'OK', style: 'default' }
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

      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/checkin?id=${visitId}`;
      const payload = {
        checkinLatitude: latitude,
        checkinLongitude: longitude,
      };
      logVisitApiRequest('handleCheckIn', { endpoint, method: 'PUT', payload, forceLog: true });
      const checkinResponse = await axios.put(
        endpoint,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token || authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          },
        }
      );
      logVisitApiResponse('handleCheckIn', { endpoint, status: checkinResponse.status, data: checkinResponse.data, forceLog: true });

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
      logVisitApiError('handleCheckIn', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/checkin?id=${visitId}`, error, forceLog: true });
      console.error('Error during check-in:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to check in. Please try again.';
      let shouldNavigateToLogin = false;
      
      // Check if backend returned a specific error message
      if (error.response?.data) {
        // If backend returns a string error message (like "You must complete a DEALER visit first...")
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } 
        // If backend returns an object with an error field
        else if (error.response.data.error || error.response.data.message) {
          errorMessage = error.response.data.error || error.response.data.message;
        }
      } else if (error.message === 'auth_expired' || 
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
          text: 'OK',
          onPress: () => {
            setIsCheckingIn(false);
            setCheckInStep(null);
          },
          style: 'cancel'
        }]
      );
      return;
    }
    
    setIsCheckingIn(false);
    setCheckInStep(null);
  };

  const handleCheckOut = async () => {
    if (!isCheckoutEnabled) {
      Alert.alert('Cannot Checkout', 'Please ensure you have added brands, set rating, and entered monthly sales.');
      return;
    }

    setIsCheckingOut(true);
    try {
      // Step 1: Check permissions
      setCheckOutStep('Checking location permissions...');
      const permissionStatus = await requestLocationPermission();
      if (permissionStatus !== 'granted') {
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

      const token = await AsyncStorage.getItem('userToken');

      const checkoutPayload = {
        checkoutLatitude: latitude,
        checkoutLongitude: longitude,
        outcome: 'done',
      };

      const ratingValue = visit?.rating || 0;
      if (ratingValue > 0) {
        checkoutPayload.rating = ratingValue;
      }

      if (isSiteRelatedClient && constructionStage) {
        checkoutPayload.constructionStage = constructionStage;
      }

      const endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/checkout?id=${visitId}`;
      logVisitApiRequest('handleCheckOut', { endpoint, method: 'PUT', payload: checkoutPayload });
      const response = await axios.put(
        endpoint,
        checkoutPayload,
        {
          headers: {
            Authorization: `Bearer ${token || authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      logVisitApiResponse('handleCheckOut', { endpoint, status: response.status, data: response.data });

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
      logVisitApiError('handleCheckOut', { endpoint: `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/checkout?id=${visitId}`, error });
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
          // First navigate to Customer tab, then to CustomerDetails
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
          text="Brands & Materials"
          onPress={() => openBottomSheet('Brands & Materials', BrandsProCons, {
            visitId,
            storeId: visit.storeId,
            authToken,
            readOnly: false,
            onBrandAdded: handleBrandAdded,
            constructionStage: constructionStage,  // Pass construction stage
            onConstructionStageChange: setConstructionStage,  // Pass setter
            isSiteRelatedClient: isSiteRelatedClient,  // Pass client type
          })}
          badge={visitData.brandsInUse?.length || brandsProConsCount || 0}
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
              readOnly: false,
              initialMonthlySale: visitData.monthlySales || monthlySale || 0,
            })}
            badge={visitData.monthlySales ? '✓' : null}
          />
        );
      }

      actionButtons.push(
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
            readOnly: false,
            onComplaintAdded: handleComplaintAdded
          })}
          badge={visitData.complaints?.length || 0}
        />
      );

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

          {/* Show Rating for Dealer/Shop only, hide for Professional and Site Visit */}
          {(clientType === 'dealer' || clientType === 'shop' || clientType === 'dealer/shop') && (
            <View style={styles.intentContainer}>
              <Text style={styles.intentTitle}>Rating: {visit.rating || 0} / 5</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      visit.rating >= rating ? styles.activeRatingButton : null,
                    ]}
                    onPress={() => handleRatingChange(rating)}
                  >
                    <Text style={[
                      styles.ratingText,
                      visit.rating >= rating ? styles.activeRatingText : null
                    ]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.ratingLabels}>
                <Text style={styles.ratingLabel}>Poor</Text>
                <Text style={styles.ratingLabel}>Excellent</Text>
              </View>
            </View>
          )}

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
              <Text style={styles.checkoutButtonText}>Complete Visit</Text>
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
      const isDealerClient =
        clientType === 'dealer' ||
        clientType === 'shop' ||
        clientType === 'dealer/shop';
      const rawRatingValue = visit?.rating ?? (intentLevel > 0 ? intentLevel / 2 : 0);
      const ratingValue =
        rawRatingValue > 0
          ? Number.isInteger(rawRatingValue)
            ? rawRatingValue
            : Number(rawRatingValue.toFixed(1))
          : 0;
      const totalBrands =
        (Array.isArray(visitData.brandsInUse) && visitData.brandsInUse.length) ||
        brandsProConsCount ||
        0;

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
            {isDealerClient && ratingValue > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{ratingValue}/5</Text>
                <Text style={styles.summaryLabel}>Rating</Text>
              </View>
            )}
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
                readOnly: true,
                onComplaintAdded: () => {} // No-op for read-only
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
              onPress={() => openBottomSheet('Brands & Materials', BrandsProCons, {
                visitId,
                authToken,
                readOnly: true,
                onBrandAdded: () => {}, // No-op for read-only
                constructionStage: constructionStage,
                onConstructionStageChange: () => {},  // No-op for read-only
                isSiteRelatedClient: isSiteRelatedClient,
              })}
            >
              <View style={styles.completedItemHeader}>
                <Ionicons name="pricetags-outline" size={24} color="#4F46E5" />
                <Text style={styles.completedItemTitle}>Brands & Materials ({totalBrands})</Text>
              </View>
              <View style={styles.viewButtonContainer}>
                <Text style={styles.viewButtonText}>View</Text>
              </View>
            </TouchableOpacity>
            {totalBrands === 0 && (
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
    // Only require rating for Dealer clients
    if (intentLevel === 0 && (clientType === 'dealer' || clientType === 'shop' || clientType === 'dealer/shop')) {
      missingRequirements.push('set rating');
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

  // Re-check permissions when coming back from Settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && awaitingPermissionFromSettings) {
        console.log('🧭 [PERMISSION] App returned to foreground, re-checking permission after Settings...');
        setAwaitingPermissionFromSettings(false);
        try {
          const after = await Location.getForegroundPermissionsAsync();
          console.log('🧭 [PERMISSION] Foreground permission after Settings:', after);
          if (after?.status === 'granted') {
            // Optionally resume pending action: attempt check-in again if we were mid-flow
            if (!checkedIn && isCheckInImageUploaded) {
              console.log('🧭 [PERMISSION] Permission granted after Settings — retrying check-in flow');
              handleCheckIn();
            }
          }
        } catch (err) {
          console.log('🧭 [PERMISSION] Error re-checking permission after Settings:', err);
        }
      }
    });
    return () => subscription.remove();
  }, [awaitingPermissionFromSettings, checkedIn, isCheckInImageUploaded]);

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
        hasNotes: visitData.notes?.length > 0
      };

      // Only require rating for Dealer clients
      const isDealerClient = clientType === 'dealer' || clientType === 'shop' || clientType === 'dealer/shop';
      if (isDealerClient) {
        commonChecks.hasIntent = intentLevel > 0;
      }

      const specificCheck = isSiteRelatedClient
        ? { hasSites: sitesCount > 0 }
        : { hasMonthlySales: visitData.monthlySales > 0 };

      const allChecks = { ...commonChecks, ...specificCheck };
      const shouldEnable = Object.values(allChecks).every(Boolean);
      
      console.log('Checkout requirements check:', {
        clientType,
        intentLevel,
        isDealerClient,
        ...commonChecks,
        ...specificCheck,
        shouldEnable
      });
      
      setIsCheckoutEnabled(shouldEnable);
    };

    checkRequiredFields();
  }, [visitData, intentLevel, sitesCount, isSiteRelatedClient, clientType]);

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
                  <Text style={styles.existingVisitDate}>{formatDate(ongoingVisit.visit_date)}</Text>
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
    let endpoint;
    let employeeId;
    try {
      const token = await AsyncStorage.getItem('userToken');
      employeeId = await AsyncStorage.getItem('employeeId');
      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd');
      
      endpoint = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${formattedDate}&end=${formattedDate}`;
      logVisitApiRequest('fetchOngoingVisits', { endpoint });
      const response = await axios.get(
        endpoint,
        {
          headers: {
            Authorization: `Bearer ${token || authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      logVisitApiResponse('fetchOngoingVisits', { endpoint, status: response.status, data: response.data });

      // Check if response is HTML
      if (typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'))) {
        console.log('⚠️ [VISIT SCREEN] Server returned HTML for ongoing visits');
        setOngoingVisits([]);
        return false;
      }

      const visitsData = Array.isArray(response.data) ? response.data : [];
      const ongoingVisits = visitsData.filter(
        (visit) => visit.checkinDate && !visit.checkoutDate
      );
      setOngoingVisits(ongoingVisits);
      return ongoingVisits.length > 0;
    } catch (error) {
      logVisitApiError('fetchOngoingVisits', { endpoint: endpoint || 'fetchOngoingVisits', error });
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
        <ScrollView 
          style={styles.bottomSheetScrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
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
    // Removed fixed maxHeight to avoid inner blank space at the bottom of the sheet
    paddingBottom: 0,
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  activeRatingButton: {
    backgroundColor: '#FCD34D',
    borderColor: '#F59E0B',
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
