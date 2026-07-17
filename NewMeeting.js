import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import MeetingAttendeePicker from './MeetingAttendeePicker';
import MeetingDealerShopPicker from './MeetingDealerShopPicker';
import MeetingTimePicker, {
  formatMeetingTimeDisplay,
  isValidMeetingTime,
} from './MeetingTimePicker';
import DatePicker from './DatePicker';
import { INDIAN_STATE_OPTIONS, getCityOptionsForState } from './stateAndCityData';
import {
  createMeetingDraft,
  DEFAULT_MEETING_TYPES,
  deriveAttendeeCategoryOptions,
  getAttendeeMaster,
  getDealerShops,
  getExpenseHeads,
  getGiftItems,
  getMeetingId,
  getMeetingTypes,
  submitMeeting,
} from './utils/meetingApi';

const formatDateForInput = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayString = () => formatDateForInput(new Date());

const initialRequest = {
  meetingType: '',
  meetingDate: todayString(),
  meetingTime: '',
  city: '',
  state: '',
  location: '',
  storeId: '',
  storeName: '',
  referenceName: '',
  purpose: '',
  expectedBusinessImpact: '',
  expectedTurnout: '',
  expectedBudget: '',
  companyContribution: '',
  dealerContribution: '',
  budgetRemarks: '',
  expectedMaterials: '',
  remarks: '',
};

const initialAttendee = {
  name: '',
  mobile: '',
  category: '',
  cityArea: '',
  company: '',
};

const initialPlannedExpense = {
  expenseHead: '',
  amount: '',
};

const initialPlannedGift = {
  giftItem: '',
  quantity: '1',
  estimatedAmount: '',
};

const mergeOptions = (...groups) => {
  const seen = new Set();
  return groups
    .flat()
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const getCategoryStyles = (category) => {
  const normalized = String(category || '').trim().toLowerCase();
  switch (normalized) {
    case 'counter':
      return { bg: '#F1F5F9', text: '#475569', avatarBg: '#E2E8F0', avatarText: '#475569' };
    case 'dealer':
      return { bg: '#EEF2FF', text: '#4F46E5', avatarBg: '#C7D2FE', avatarText: '#4F46E5' };
    case 'mason':
      return { bg: '#ECFDF5', text: '#059669', avatarBg: '#A7F3D0', avatarText: '#059669' };
    case 'contractor':
      return { bg: '#FFFBEB', text: '#D97706', avatarBg: '#FDE68A', avatarText: '#D97706' };
    case 'engineer':
      return { bg: '#FFF1F2', text: '#E11D48', avatarBg: '#FECDD3', avatarText: '#E11D48' };
    case 'architect':
      return { bg: '#F5F3FF', text: '#7C3AED', avatarBg: '#DDD6FE', avatarText: '#7C3AED' };
    case 'customer':
      return { bg: '#ECFEFF', text: '#0891B2', avatarBg: '#CFFAFE', avatarText: '#0891B2' };
    default:
      return { bg: '#FDF2F8', text: '#C026D3', avatarBg: '#FBCFE8', avatarText: '#C026D3' };
  }
};

const steps = ['Request', 'Attendees', 'Review'];

const formatLocationAddress = (place, coords) => {
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

const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      keyboardType={keyboardType}
      multiline={multiline}
      blurOnSubmit={false}
      autoCorrect={false}
    />
  </View>
);

const SelectField = ({ label, value, placeholder, options = [], onSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const safeOptions = Array.isArray(options) ? options : [];
  const filteredOptions = safeOptions.filter((option) =>
    String(option || '').toLowerCase().includes(searchText.trim().toLowerCase())
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectField, disabled && styles.selectFieldDisabled]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <TouchableOpacity style={styles.selectSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.selectSheetHeader}>
              <Text style={styles.selectSheetTitle}>{label}</Text>
              <TouchableOpacity style={styles.sheetCloseButton} onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            {safeOptions.length > 8 ? (
              <TextInput
                style={styles.selectSearchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor="#94A3B8"
                autoCorrect={false}
              />
            ) : null}
            {safeOptions.length === 0 ? (
              <View style={styles.selectEmptyState}>
                <Text style={styles.selectEmptyText}>No options returned from API.</Text>
              </View>
            ) : (
              <ScrollView style={styles.selectOptionsList} keyboardShouldPersistTaps="handled">
                {filteredOptions.length === 0 ? (
                  <View style={styles.selectEmptyState}>
                    <Text style={styles.selectEmptyText}>No matching options.</Text>
                  </View>
                ) : filteredOptions.map((option) => {
                  const isSelected = value === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                      onPress={() => {
                        onSelect(option);
                        setSearchText('');
                        setIsOpen(false);
                      }}
                    >
                      <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>{option}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const LocationField = ({ value, onChangeText, onUseCurrentLocation, isLocating }) => (
  <View style={styles.field}>
    <View style={styles.fieldHeader}>
      <Text style={styles.label}>Location</Text>
      <TouchableOpacity style={styles.locationButton} onPress={onUseCurrentLocation} disabled={isLocating}>
        {isLocating ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : (
          <Ionicons name="navigate-outline" size={15} color="#4F46E5" />
        )}
        <Text style={styles.locationButtonText}>{isLocating ? 'Finding' : 'Use current'}</Text>
      </TouchableOpacity>
    </View>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Venue, counter, site, or address"
      placeholderTextColor="#94A3B8"
      blurOnSubmit={false}
      autoCorrect={false}
    />
  </View>
);

const StepHeader = ({ currentStep }) => (
  <View style={styles.stepHeader}>
    {steps.map((step, index) => {
      const isActive = currentStep === index;
      const isDone = currentStep > index;
      return (
        <View key={step} style={styles.stepItem}>
          <View style={styles.stepTrackWrap}>
            <View style={[
              styles.stepTrack,
              index === 0 && styles.stepTrackSpacer,
              index > 0 && isDone && styles.stepTrackActive,
            ]} />
            <View style={[styles.stepCircle, (isActive || isDone) && styles.stepCircleActive]}>
              {isDone ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{index + 1}</Text>
              )}
            </View>
            <View style={[
              styles.stepTrack,
              index === steps.length - 1 && styles.stepTrackSpacer,
              index < steps.length - 1 && currentStep > index && styles.stepTrackActive,
            ]} />
          </View>
          <Text style={[styles.stepText, isActive && styles.stepTextActive]}>{step}</Text>
        </View>
      );
    })}
  </View>
);

const NewMeeting = ({ route, authToken }) => {
  const navigation = useNavigation();
  const initialRequestFromRoute = route?.params?.initialRequest || {};
  const initialAttendeesFromRoute = route?.params?.initialAttendees || [];
  const [currentStep, setCurrentStep] = useState(0);
  const [request, setRequest] = useState({ ...initialRequest, ...initialRequestFromRoute });
  const [attendees, setAttendees] = useState(initialAttendeesFromRoute);
  const [attendeeDraft, setAttendeeDraft] = useState(initialAttendee);
  const [plannedExpenses, setPlannedExpenses] = useState(route?.params?.initialPlannedExpenses || []);
  const [plannedExpenseDraft, setPlannedExpenseDraft] = useState(initialPlannedExpense);
  const [plannedGifts, setPlannedGifts] = useState(route?.params?.initialPlannedGifts || []);
  const [plannedGiftDraft, setPlannedGiftDraft] = useState(initialPlannedGift);
  const [attendeeMaster, setAttendeeMaster] = useState([]);
  const [attendeeCategoryOptions, setAttendeeCategoryOptions] = useState([]);
  const [meetingTypes, setMeetingTypes] = useState(DEFAULT_MEETING_TYPES);
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [giftItems, setGiftItems] = useState([]);
  const [dealerShops, setDealerShops] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMeetingDatePickerOpen, setIsMeetingDatePickerOpen] = useState(false);
  const [isAttendeePickerOpen, setIsAttendeePickerOpen] = useState(false);
  const [isDealerPickerOpen, setIsDealerPickerOpen] = useState(false);
  const [isAttendeeFormOpen, setIsAttendeeFormOpen] = useState(false);
  const [isPlannedExpenseFormOpen, setIsPlannedExpenseFormOpen] = useState(false);
  const [isPlannedGiftFormOpen, setIsPlannedGiftFormOpen] = useState(false);
  const [isLoadingAttendeeMaster, setIsLoadingAttendeeMaster] = useState(false);
  const [isLoadingDealers, setIsLoadingDealers] = useState(false);
  const [hasLoadedAttendeeMaster, setHasLoadedAttendeeMaster] = useState(false);
  const [hasLoadedDealers, setHasLoadedDealers] = useState(false);
  const cityOptions = getCityOptionsForState(request.state);

  useEffect(() => {
    let isMounted = true;

    const fetchAttendeeCategories = async () => {
      try {
        const data = await getAttendeeMaster({ authToken });
        if (!isMounted) return;
        setAttendeeMaster(data);
        setAttendeeCategoryOptions(deriveAttendeeCategoryOptions(data));
        setHasLoadedAttendeeMaster(true);
      } catch (error) {
        console.warn('Unable to fetch attendee categories:', error.message);
      }
    };

    fetchAttendeeCategories();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  useEffect(() => {
    let isMounted = true;

    const fetchMeetingTypes = async () => {
      const types = await getMeetingTypes({ authToken });
      if (isMounted) setMeetingTypes(types);
    };

    fetchMeetingTypes();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  useEffect(() => {
    let isMounted = true;

    const fetchPlanConfig = async () => {
      const [heads, gifts] = await Promise.all([
        getExpenseHeads({ authToken }),
        getGiftItems({ authToken }),
      ]);
      if (!isMounted) return;
      setExpenseHeads(heads);
      setGiftItems(gifts);
    };

    fetchPlanConfig();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  const updateRequest = (field, value) => {
    setRequest((prev) => ({ ...prev, [field]: value }));
  };

  const selectMeetingState = (value) => {
    const nextCityOptions = getCityOptionsForState(value);
    setRequest((prev) => ({
      ...prev,
      state: value,
      city: nextCityOptions.includes(prev.city) ? prev.city : '',
    }));
  };

  const updateAttendee = (field, value) => {
    setAttendeeDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updatePlannedExpense = (field, value) => {
    setPlannedExpenseDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updatePlannedGift = (field, value) => {
    setPlannedGiftDraft((prev) => ({ ...prev, [field]: value }));
  };

  const requestMissingFields = () => {
    const requiredFields = [
      ['meetingType', 'meeting type'],
      ['meetingDate', 'date'],
      ['meetingTime', 'time'],
      ['city', 'city'],
      ['state', 'state'],
      ['location', 'location'],
      ['purpose', 'purpose/objective'],
      ['expectedBusinessImpact', 'expected business impact'],
      ['expectedTurnout', 'expected turnout'],
      ['expectedBudget', 'expected budget'],
    ];

    return requiredFields
      .filter(([field]) => !String(request[field] || '').trim())
      .map(([, label]) => label);
  };

  const validateRequest = () => {
    const missing = requestMissingFields();
    if (missing.length > 0) {
      Alert.alert('Missing details', `Please add ${missing.join(', ')}.`);
      return false;
    }

    const selectedTypeIsActive = meetingTypes.some(
      (type) => String(type).toLowerCase() === String(request.meetingType).toLowerCase()
    );
    if (!selectedTypeIsActive) {
      Alert.alert('Invalid meeting type', 'Please select an active meeting type from the list.');
      return false;
    }

    if (['dealer', 'counter'].some((type) => String(request.meetingType || '').toLowerCase().includes(type)) && !request.storeId) {
      Alert.alert('Dealer / shop required', 'Select a dealer/shop from the customer database for Dealer or Counter meetings.');
      return false;
    }

    const expectedTurnout = Number(request.expectedTurnout);
    if (Number.isNaN(expectedTurnout) || expectedTurnout <= 0) {
      Alert.alert('Invalid turnout', 'Expected turnout should be greater than zero.');
      return false;
    }

    if (expectedTurnout < attendees.length) {
      Alert.alert('Invalid turnout', 'Expected turnout cannot be lower than named attendees added.');
      return false;
    }

    if (Number.isNaN(Number(request.expectedBudget)) || Number(request.expectedBudget) < 0) {
      Alert.alert('Invalid budget', 'Expected budget should be a valid amount.');
      return false;
    }

    if (!isValidMeetingTime(request.meetingTime)) {
      Alert.alert('Invalid time', 'Please select a valid meeting time.');
      return false;
    }

    return true;
  };

  const plannedExpenseTotal = plannedExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const plannedGiftTotal = plannedGifts.reduce((sum, item) => sum + Number(item.estimatedAmount || 0), 0);
  const plannedTotal = plannedExpenseTotal + plannedGiftTotal;

  const validatePlanForSubmit = () => {
    if (plannedExpenses.length === 0) {
      Alert.alert('Planned expenses required', 'Add at least one planned expense before submitting for approval.');
      return false;
    }

    if (plannedGifts.length === 0) {
      Alert.alert('Planned gifts required', 'Add at least one planned gift/material before submitting for approval.');
      return false;
    }

    const contributionFields = [
      ['companyContribution', 'company contribution'],
      ['dealerContribution', 'dealer contribution'],
    ];
    const missingContributions = contributionFields
      .filter(([field]) => !String(request[field] ?? '').trim())
      .map(([, label]) => label);

    if (missingContributions.length > 0) {
      Alert.alert('Contribution split required', `Please add ${missingContributions.join(' and ')}. Use 0 if not applicable.`);
      return false;
    }

    const expectedBudget = Number(request.expectedBudget || 0);
    const companyContribution = Number(request.companyContribution || 0);
    const dealerContribution = Number(request.dealerContribution || 0);

    if ([companyContribution, dealerContribution].some((amount) => Number.isNaN(amount) || amount < 0)) {
      Alert.alert('Invalid contribution', 'Company and dealer contribution should be valid non-negative amounts.');
      return false;
    }

    const contributionTotal = companyContribution + dealerContribution;
    if (Math.abs(contributionTotal - expectedBudget) > 0.009) {
      Alert.alert(
        'Budget mismatch',
        `Company + dealer contribution must equal expected budget. Expected Rs. ${expectedBudget}, currently Rs. ${contributionTotal}.`
      );
      return false;
    }

    return true;
  };

  const validateSubmit = () => {
    if (!validateRequest()) return false;
    if (!validatePlanForSubmit()) return false;
    if (attendees.length === 0) {
      Alert.alert('Attendees required', 'Add expected attendees before submitting for approval.');
      return false;
    }
    return true;
  };

  const normalizeMobile = (value) => value.replace(/\D/g, '');

  const addAttendee = () => {
    const mobile = normalizeMobile(attendeeDraft.mobile);
    if (!attendeeDraft.name.trim()) {
      Alert.alert('Missing attendee name', 'Please enter attendee name.');
      return;
    }

    if (!attendeeDraft.category.trim()) {
      Alert.alert('Missing category', 'Please select or enter attendee category.');
      return;
    }

    if (mobile.length !== 10) {
      Alert.alert('Invalid mobile number', 'Mobile number should be 10 digits.');
      return;
    }

    const isDuplicate = attendees.some((attendee) => normalizeMobile(attendee.mobile) === mobile);
    if (isDuplicate) {
      Alert.alert('Duplicate mobile number', 'This mobile number already exists in this meeting.');
      return;
    }

    setAttendees((prev) => [
      ...prev,
      {
        ...attendeeDraft,
        id: `${Date.now()}-${mobile}`,
        mobile,
      },
    ]);
    setAttendeeDraft(initialAttendee);
    setIsAttendeeFormOpen(false);
  };

  const removeAttendee = (attendeeId) => {
    setAttendees((prev) => prev.filter((attendee) => attendee.id !== attendeeId));
  };

  const addPlannedExpense = () => {
    const amount = Number(plannedExpenseDraft.amount || 0);
    if (!plannedExpenseDraft.expenseHead || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid planned expense', 'Select an expense head and enter a valid amount.');
      return;
    }

    setPlannedExpenses((prev) => [
      ...prev,
      {
        id: `plan-expense-${Date.now()}`,
        expenseHead: plannedExpenseDraft.expenseHead,
        amount,
      },
    ]);
    setPlannedExpenseDraft(initialPlannedExpense);
    setIsPlannedExpenseFormOpen(false);
  };

  const removePlannedExpense = (id) => {
    setPlannedExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const addPlannedGift = () => {
    const quantity = Number(plannedGiftDraft.quantity || 0);
    const estimatedAmount = Number(plannedGiftDraft.estimatedAmount || 0);
    if (!plannedGiftDraft.giftItem || Number.isNaN(quantity) || quantity <= 0 || Number.isNaN(estimatedAmount) || estimatedAmount <= 0) {
      Alert.alert('Invalid planned gift', 'Select a gift item and enter valid quantity and estimated amount.');
      return;
    }

    setPlannedGifts((prev) => [
      ...prev,
      {
        id: `plan-gift-${Date.now()}`,
        giftItem: plannedGiftDraft.giftItem,
        quantity,
        estimatedAmount,
      },
    ]);
    setPlannedGiftDraft(initialPlannedGift);
    setIsPlannedGiftFormOpen(false);
  };

  const removePlannedGift = (id) => {
    setPlannedGifts((prev) => prev.filter((item) => item.id !== id));
  };

  const addExistingAttendee = (attendee) => {
    const mobile = normalizeMobile(attendee.mobile || attendee.mobileNumber);
    if (!mobile) {
      Alert.alert('Missing mobile number', 'Selected attendee does not have a mobile number.');
      return;
    }

    if (attendees.some((item) => normalizeMobile(item.mobile) === mobile)) {
      Alert.alert('Already added', 'This attendee is already added to this meeting.');
      return;
    }

    setAttendees((prev) => [
      ...prev,
      {
        name: attendee.name || '',
        mobile,
        email: attendee.email || '',
        category: attendee.category || '',
        cityArea: attendee.cityArea || '',
        company: attendee.company || attendee.companyShopProject || '',
        id: `master-${attendee.id || attendee.attendeeId || mobile}`,
      },
    ]);
    setAttendeeCategoryOptions((prev) => mergeOptions(prev, [attendee.category]));
    setIsAttendeePickerOpen(false);
  };

  const openAttendeePicker = async () => {
    setIsAttendeePickerOpen(true);
    if (hasLoadedAttendeeMaster) return;

    try {
      setIsLoadingAttendeeMaster(true);
      const data = await getAttendeeMaster({ authToken });
      setAttendeeMaster(data);
      setAttendeeCategoryOptions((prev) => mergeOptions(prev, deriveAttendeeCategoryOptions(data)));
    } catch (error) {
      console.warn('Unable to fetch attendee master:', error.message);
    } finally {
      setHasLoadedAttendeeMaster(true);
      setIsLoadingAttendeeMaster(false);
    }
  };

  const fetchDealerShops = async (search = '') => {
    try {
      setIsLoadingDealers(true);
      const employeeId = await AsyncStorage.getItem('employeeId');
      const data = await getDealerShops({ authToken, employeeId, search });
      setDealerShops(data);
    } catch (error) {
      console.warn('Unable to fetch dealer/shop list:', error.message);
    } finally {
      setHasLoadedDealers(true);
      setIsLoadingDealers(false);
    }
  };

  const openDealerPicker = async () => {
    setIsDealerPickerOpen(true);
    if (!hasLoadedDealers) {
      await fetchDealerShops();
    }
  };

  const selectDealerShop = (shop) => {
    setRequest((prev) => ({
      ...prev,
      storeId: shop.storeId,
      storeName: shop.storeName,
    }));
    setIsDealerPickerOpen(false);
  };

  const openCustomerCreation = () => {
    setIsDealerPickerOpen(false);
    navigation.navigate('Customer', {
      screen: 'CustomerListScreen',
      params: { openCreateCustomer: true, source: 'meeting' },
    });
  };

  const useCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Please allow location access to fill the meeting location.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = position.coords;
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      const locationLabel = formatLocationAddress(place, coords);

      setRequest((prev) => ({
        ...prev,
        location: locationLabel,
        city: prev.city || place?.city || place?.subregion || '',
        state: prev.state || place?.region || '',
      }));
    } catch (error) {
      console.error('Error getting current location:', error.message);
      Alert.alert('Location unavailable', 'Unable to fetch current location. Please enter it manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const buildPayload = async () => {
    const employeeId = await AsyncStorage.getItem('employeeId');
    return {
      creatorId: employeeId,
      request: {
        ...request,
        expectedTurnout: request.expectedTurnout,
        namedAttendeeCount: attendees.length,
      },
      expectedAttendees: attendees.map(({ id, ...attendee }) => attendee),
      plannedExpenses: plannedExpenses.map(({ id, ...item }) => item),
      plannedGifts: plannedGifts.map(({ id, ...item }) => item),
    };
  };

  const saveMeeting = async (shouldSubmit) => {
    if (shouldSubmit && !validateSubmit()) return;

    try {
      setIsSaving(true);
      const payload = await buildPayload();
      const responseData = await createMeetingDraft({ authToken, payload });
      const meetingId = getMeetingId(responseData);

      if (shouldSubmit) {
        if (!meetingId) {
          Alert.alert('Draft saved', 'Draft was created, but the backend did not return a meeting id for submission.');
          navigation.navigate('MeetingsList');
          return;
        }

        await submitMeeting({ authToken, meetingId });
        Alert.alert('Submitted', 'Meeting request sent for approval.');
        navigation.replace('MeetingDetail', { meetingId, authToken });
        return;
      }

      Alert.alert('Draft saved', 'Meeting request saved as draft.');
      if (meetingId) {
        navigation.replace('MeetingDetail', { meetingId, authToken });
      } else {
        navigation.navigate('MeetingsList');
      }
    } catch (error) {
      console.error('Error saving meeting:', error.response?.data || error.message);
      if (error.failedStep === 'ATTENDEES' && error.meetingId) {
        const status = error.response?.status;
        Alert.alert(
          'Draft incomplete on backend',
          `Meeting #${error.meetingId} was created, but linked attendee saving failed${status ? ` with ${status}` : ''}. The new atomic save endpoint is needed to prevent partial records.`
        );
        navigation.replace('MeetingDetail', { meetingId: error.meetingId, authToken });
        return;
      }
      Alert.alert('Error', 'Unable to save meeting request. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => {
    if (currentStep === 0) {
      navigation.goBack();
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const renderRequestStep = () => (
    <View style={styles.section}>
      <Text style={styles.sectionEyebrow}>Step 1 of 3</Text>
      <Text style={styles.sectionTitle}>Meeting Request</Text>
      <Text style={styles.sectionSubtitle}>Capture the basic plan first. Attendees come next.</Text>
      <SelectField
        label="Meeting Type"
        placeholder="Select meeting type"
        options={meetingTypes}
        value={request.meetingType}
        onSelect={(value) => updateRequest('meetingType', value)}
      />
      <View style={styles.twoColumn}>
        <View style={styles.halfField}>
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateSelectField}
              onPress={() => setIsMeetingDatePickerOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.selectValue, !request.meetingDate && styles.selectPlaceholder]} numberOfLines={1}>
                {request.meetingDate || 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.halfField}>
          <MeetingTimePicker
            label="Time"
            value={request.meetingTime}
            onChange={(value) => updateRequest('meetingTime', value)}
          />
        </View>
      </View>
      <View style={styles.twoColumn}>
        <View style={styles.halfField}>
          <SelectField
            label="State"
            placeholder="Select state"
            options={INDIAN_STATE_OPTIONS}
            value={request.state}
            onSelect={selectMeetingState}
          />
        </View>
        <View style={styles.halfField}>
          <SelectField
            label="City"
            placeholder={request.state ? 'Select city' : 'Select state first'}
            options={cityOptions}
            value={request.city}
            onSelect={(value) => updateRequest('city', value)}
            disabled={!request.state}
          />
        </View>
      </View>
      <LocationField
        value={request.location}
        onChangeText={(value) => updateRequest('location', value)}
        onUseCurrentLocation={useCurrentLocation}
        isLocating={isLocating}
      />
      <View style={styles.field}>
        <Text style={styles.label}>Dealer / Shop</Text>
        <TouchableOpacity style={styles.dealerSelectButton} onPress={openDealerPicker}>
          <View style={styles.dealerSelectIcon}>
            <Ionicons name="storefront-outline" size={18} color="#4F46E5" />
          </View>
          <View style={styles.dealerSelectTextWrap}>
            <Text style={[styles.dealerSelectTitle, !request.storeName && styles.dealerSelectPlaceholder]} numberOfLines={1}>
              {request.storeName || 'Select dealer / shop'}
            </Text>
            <Text style={styles.dealerSelectSubtitle}>Linked to customer database</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      <Field
        label="Additional Customer Reference"
        value={request.referenceName}
        onChangeText={(value) => updateRequest('referenceName', value)}
        placeholder="Optional extra context"
      />
      <Field
        label="Purpose / Objective"
        value={request.purpose}
        onChangeText={(value) => updateRequest('purpose', value)}
        placeholder="What should this meeting achieve?"
        multiline
      />
      <Field
        label="Expected Business Impact"
        value={request.expectedBusinessImpact}
        onChangeText={(value) => updateRequest('expectedBusinessImpact', value)}
        placeholder="Example: Generate five contractor leads and 20 tonnes expected monthly demand."
        multiline
      />
      <Field
        label="Expected Turnout"
        value={request.expectedTurnout}
        onChangeText={(value) => updateRequest('expectedTurnout', value.replace(/\D/g, ''))}
        placeholder="Planned total attendees"
        keyboardType="numeric"
      />
      <Field
        label="Expected Budget"
        value={request.expectedBudget}
        onChangeText={(value) => updateRequest('expectedBudget', value)}
        placeholder="Amount"
        keyboardType="numeric"
      />
      <Field
        label="Gift / Material Notes"
        value={request.expectedMaterials}
        onChangeText={(value) => updateRequest('expectedMaterials', value)}
        placeholder="Optional notes, e.g. brochures or samples to carry"
        multiline
      />
      <View style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <View>
            <Text style={styles.planCardTitle}>Budget Contribution</Text>
            <Text style={styles.planCardSubtitle}>Company + dealer should equal expected budget.</Text>
          </View>
          <Text style={styles.planBadge}>Rs. {Number(request.expectedBudget || 0)}</Text>
        </View>
        <View style={styles.twoColumn}>
          <View style={styles.halfField}>
            <Field
              label="Company Contribution"
              value={request.companyContribution}
              onChangeText={(value) => updateRequest('companyContribution', value.replace(/[^\d.]/g, ''))}
              placeholder="Company"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <Field
              label="Dealer Contribution"
              value={request.dealerContribution}
              onChangeText={(value) => updateRequest('dealerContribution', value.replace(/[^\d.]/g, ''))}
              placeholder="Dealer"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Field
          label="Budget Remarks"
          value={request.budgetRemarks}
          onChangeText={(value) => updateRequest('budgetRemarks', value)}
          placeholder="Contribution notes"
          multiline
        />
      </View>

      <View style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <View>
            <Text style={styles.planCardTitle}>Planned Expenses</Text>
            <Text style={styles.planCardSubtitle}>Required before submit for approval.</Text>
          </View>
          <Text style={styles.planBadge}>Rs. {plannedExpenseTotal}</Text>
        </View>
        {isPlannedExpenseFormOpen ? (
          <View style={styles.inlineFormCard}>
            <View style={styles.inlineFormHeader}>
              <Text style={styles.inlineFormTitle}>New Planned Expense</Text>
              <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsPlannedExpenseFormOpen(false)}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <SelectField
              label="Expense Head"
              placeholder="Select expense head"
              options={expenseHeads}
              value={plannedExpenseDraft.expenseHead}
              onSelect={(value) => updatePlannedExpense('expenseHead', value)}
            />
            <Field
              label="Amount"
              value={plannedExpenseDraft.amount}
              onChangeText={(value) => updatePlannedExpense('amount', value.replace(/[^\d.]/g, ''))}
              placeholder="Planned amount"
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={addPlannedExpense}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#4F46E5" />
              <Text style={styles.secondaryButtonText}>Save Planned Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsPlannedExpenseFormOpen(true)}>
            <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
            <Text style={styles.addInlineButtonText}>Add Planned Expense</Text>
          </TouchableOpacity>
        )}
        {plannedExpenses.length === 0 ? (
          <Text style={styles.planEmptyText}>No planned expenses added.</Text>
        ) : plannedExpenses.map((item) => (
          <View key={item.id} style={styles.planLine}>
            <View style={styles.planLineMain}>
              <Text style={styles.planLineTitle}>{item.expenseHead}</Text>
              <Text style={styles.planLineMeta}>Rs. {item.amount}</Text>
            </View>
            <TouchableOpacity style={styles.planDeleteButton} onPress={() => removePlannedExpense(item.id)}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <View>
            <Text style={styles.planCardTitle}>Planned Gifts / Materials</Text>
            <Text style={styles.planCardSubtitle}>Enter expected gifts here with item, quantity, and estimated amount.</Text>
          </View>
          <Text style={styles.planBadge}>Rs. {plannedGiftTotal}</Text>
        </View>
        {isPlannedGiftFormOpen ? (
          <View style={styles.inlineFormCard}>
            <View style={styles.inlineFormHeader}>
              <Text style={styles.inlineFormTitle}>New Planned Gift</Text>
              <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsPlannedGiftFormOpen(false)}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <SelectField
              label="Gift Item"
              placeholder="Select gift item"
              options={giftItems}
              value={plannedGiftDraft.giftItem}
              onSelect={(value) => updatePlannedGift('giftItem', value)}
            />
            <View style={styles.twoColumn}>
              <View style={styles.halfField}>
                <Field
                  label="Quantity"
                  value={plannedGiftDraft.quantity}
                  onChangeText={(value) => updatePlannedGift('quantity', value.replace(/\D/g, ''))}
                  placeholder="Qty"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Field
                  label="Estimated Amount"
                  value={plannedGiftDraft.estimatedAmount}
                  onChangeText={(value) => updatePlannedGift('estimatedAmount', value.replace(/[^\d.]/g, ''))}
                  placeholder="Amount"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={addPlannedGift}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#4F46E5" />
              <Text style={styles.secondaryButtonText}>Save Planned Gift</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsPlannedGiftFormOpen(true)}>
            <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
            <Text style={styles.addInlineButtonText}>Add Planned Gift</Text>
          </TouchableOpacity>
        )}
        {plannedGifts.length === 0 ? (
          <Text style={styles.planEmptyText}>No planned gifts/materials added.</Text>
        ) : plannedGifts.map((item) => (
          <View key={item.id} style={styles.planLine}>
            <View style={styles.planLineMain}>
              <Text style={styles.planLineTitle}>{item.giftItem} x {item.quantity}</Text>
              <Text style={styles.planLineMeta}>Estimated Rs. {item.estimatedAmount}</Text>
            </View>
            <TouchableOpacity style={styles.planDeleteButton} onPress={() => removePlannedGift(item.id)}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <Field
        label="Remarks"
        value={request.remarks}
        onChangeText={(value) => updateRequest('remarks', value)}
        placeholder="Optional notes"
        multiline
      />
      <MeetingDealerShopPicker
        visible={isDealerPickerOpen}
        shops={dealerShops}
        isLoading={isLoadingDealers}
        selectedStoreId={request.storeId}
        onClose={() => setIsDealerPickerOpen(false)}
        onSearch={fetchDealerShops}
        onSelect={selectDealerShop}
        onAddNew={openCustomerCreation}
      />
      <DatePicker
        isVisible={isMeetingDatePickerOpen}
        onClose={() => setIsMeetingDatePickerOpen(false)}
        onSelect={(date) => updateRequest('meetingDate', formatDateForInput(date))}
      />
    </View>
  );

  const renderAttendeeStep = () => (
    <View style={styles.section}>
      <Text style={styles.sectionEyebrow}>Step 2 of 3</Text>
      <Text style={styles.sectionTitle}>Expected Attendees</Text>
      <Text style={styles.sectionSubtitle}>Expected turnout: {request.expectedTurnout || 0}. Add named attendees separately; mobile numbers must stay unique.</Text>
      <TouchableOpacity style={styles.existingButton} onPress={openAttendeePicker}>
        <Ionicons name="search-outline" size={18} color="#4F46E5" />
        <Text style={styles.existingButtonText}>Select Existing Attendee</Text>
      </TouchableOpacity>
      {isAttendeeFormOpen ? (
        <View style={styles.inlineFormCard}>
          <View style={styles.inlineFormHeader}>
            <Text style={styles.inlineFormTitle}>Add New Attendee</Text>
            <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsAttendeeFormOpen(false)}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Field label="Name" value={attendeeDraft.name} onChangeText={(value) => updateAttendee('name', value)} placeholder="Attendee name" />
          <Field
            label="Mobile Number"
            value={attendeeDraft.mobile}
            onChangeText={(value) => updateAttendee('mobile', normalizeMobile(value))}
            placeholder="10 digit mobile"
            keyboardType="phone-pad"
          />
          {attendeeCategoryOptions.length > 0 ? (
            <SelectField
              label="Category"
              placeholder="Select category"
              options={attendeeCategoryOptions}
              value={attendeeDraft.category}
              onSelect={(value) => updateAttendee('category', value)}
            />
          ) : (
            <Field
              label="Category"
              value={attendeeDraft.category}
              onChangeText={(value) => updateAttendee('category', value)}
              placeholder="Category from attendee master"
            />
          )}
          <Field label="City / Area" value={attendeeDraft.cityArea} onChangeText={(value) => updateAttendee('cityArea', value)} placeholder="Area or locality" />
          <Field
            label="Company / Shop / Project"
            value={attendeeDraft.company}
            onChangeText={(value) => updateAttendee('company', value)}
            placeholder="Optional"
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={addAttendee}>
            <Ionicons name="person-add-outline" size={18} color="#4F46E5" />
            <Text style={styles.secondaryButtonText}>Add Attendee</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsAttendeeFormOpen(true)}>
          <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
          <Text style={styles.addInlineButtonText}>Add New Attendee</Text>
        </TouchableOpacity>
      )}

      <View style={styles.attendeeList}>
        <Text style={styles.subTitle}>Added Attendees ({attendees.length})</Text>
        {attendees.length === 0 ? (
          <Text style={styles.emptyText}>No expected attendees added yet.</Text>
        ) : (
          attendees.map((attendee) => {
            const catStyle = getCategoryStyles(attendee.category);
            const initial = String(attendee.name || 'A').trim().charAt(0).toUpperCase();
            return (
              <View key={attendee.id} style={styles.attendeeCard}>
                <View style={[styles.avatarCircle, { backgroundColor: catStyle.avatarBg }]}>
                  <Text style={[styles.avatarText, { color: catStyle.avatarText }]}>{initial}</Text>
                </View>
                <View style={styles.attendeeInfo}>
                  <View style={styles.attendeeHeaderRow}>
                    <Text style={styles.attendeeName} numberOfLines={1}>{attendee.name}</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
                      <Text style={[styles.categoryBadgeText, { color: catStyle.text }]}>{attendee.category}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={13} color="#64748B" style={styles.metaIcon} />
                    <Text style={styles.attendeeMeta}>{attendee.mobile}</Text>
                  </View>
                  
                  {(attendee.cityArea || attendee.company) ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={13} color="#64748B" style={styles.metaIcon} />
                      <Text style={styles.attendeeMeta} numberOfLines={1}>
                        {attendee.cityArea || 'No area'}{attendee.company ? ` - ${attendee.company}` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => removeAttendee(attendee.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
      <MeetingAttendeePicker
        visible={isAttendeePickerOpen}
        attendees={attendeeMaster}
        isLoading={isLoadingAttendeeMaster}
        selectedMobiles={attendees.map((attendee) => attendee.mobile)}
        onClose={() => setIsAttendeePickerOpen(false)}
        onSelect={addExistingAttendee}
      />
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.section}>
      <Text style={styles.sectionEyebrow}>Step 3 of 3</Text>
      <Text style={styles.sectionTitle}>Review & Submit</Text>
      <Text style={styles.sectionSubtitle}>Check the request before saving draft or submitting for approval.</Text>
      
      <View style={styles.reviewGroupCard}>
        <Text style={styles.reviewGroupTitle}>Meeting Details</Text>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTypeTitle}>{(request.meetingType || 'Meeting') + ' Meeting'}</Text>
        </View>
        
        <View style={styles.reviewDetailRow}>
          <Ionicons name="calendar-outline" size={15} color="#4F46E5" style={styles.reviewDetailIcon} />
          <Text style={styles.reviewDetailText}>
            {request.meetingDate} at {formatMeetingTimeDisplay(request.meetingTime)}
          </Text>
        </View>
        
        <View style={styles.reviewDetailRow}>
          <Ionicons name="business-outline" size={15} color="#4F46E5" style={styles.reviewDetailIcon} />
          <Text style={styles.reviewDetailText}>
            {request.city}, {request.state}
          </Text>
        </View>
        
        {request.location ? (
          <View style={styles.reviewDetailRow}>
            <Ionicons name="location-outline" size={15} color="#4F46E5" style={styles.reviewDetailIcon} />
            <Text style={styles.reviewDetailText}>{request.location}</Text>
          </View>
        ) : null}
        {request.storeName ? (
          <View style={styles.reviewDetailRow}>
            <Ionicons name="storefront-outline" size={15} color="#4F46E5" style={styles.reviewDetailIcon} />
            <Text style={styles.reviewDetailText}>{request.storeName}</Text>
          </View>
        ) : null}
      </View>
      
      <View style={styles.reviewGroupCard}>
        <Text style={styles.reviewGroupTitle}>Objectives & Resources</Text>
        
        <View style={styles.reviewFieldBlock}>
          <Text style={styles.reviewFieldLabel}>Purpose / Objective</Text>
          <Text style={styles.reviewFieldValue}>{request.purpose || 'No purpose added'}</Text>
        </View>

        <View style={styles.reviewDivider} />

        <View style={styles.reviewFieldBlock}>
          <Text style={styles.reviewFieldLabel}>Expected Business Impact</Text>
          <Text style={styles.reviewFieldValue}>{request.expectedBusinessImpact || 'No expected impact added'}</Text>
        </View>
        
        <View style={styles.reviewDivider} />
        
        <View style={styles.reviewTwoColumn}>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Expected Turnout</Text>
            <Text style={styles.reviewFieldValue}>{request.expectedTurnout || 0}</Text>
          </View>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Named Attendees</Text>
            <Text style={styles.reviewFieldValue}>{attendees.length}</Text>
          </View>
        </View>

        <View style={styles.reviewDivider} />

        <View style={styles.reviewTwoColumn}>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Expected Budget</Text>
            <Text style={[styles.reviewFieldValue, styles.reviewBudgetText]}>Rs. {request.expectedBudget || 0}</Text>
          </View>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Gift / Material Notes</Text>
            <Text style={styles.reviewFieldValue}>{request.expectedMaterials || 'None added'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.reviewGroupCard}>
        <Text style={styles.reviewGroupTitle}>Budget Plan</Text>
        <View style={styles.reviewTwoColumn}>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Company</Text>
            <Text style={styles.reviewFieldValue}>Rs. {request.companyContribution || 0}</Text>
          </View>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Dealer</Text>
            <Text style={styles.reviewFieldValue}>Rs. {request.dealerContribution || 0}</Text>
          </View>
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewTwoColumn}>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Planned Expenses</Text>
            <Text style={styles.reviewFieldValue}>Rs. {plannedExpenseTotal}</Text>
          </View>
          <View style={styles.reviewHalfField}>
            <Text style={styles.reviewFieldLabel}>Planned Gifts</Text>
            <Text style={styles.reviewFieldValue}>Rs. {plannedGiftTotal}</Text>
          </View>
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewFieldBlock}>
          <Text style={styles.reviewFieldLabel}>Planned Total</Text>
          <Text style={styles.reviewFieldValue}>Rs. {plannedTotal}</Text>
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewFieldBlock}>
          <Text style={styles.reviewFieldLabel}>Planned Expense Details</Text>
          {plannedExpenses.length === 0 ? (
            <Text style={styles.reviewFieldValue}>No planned expenses added</Text>
          ) : plannedExpenses.map((item) => (
            <Text key={item.id} style={styles.reviewFieldValue}>- {item.expenseHead}: Rs. {item.amount}</Text>
          ))}
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewFieldBlock}>
          <Text style={styles.reviewFieldLabel}>Planned Gift Details</Text>
          {plannedGifts.length === 0 ? (
            <Text style={styles.reviewFieldValue}>No planned gifts added</Text>
          ) : plannedGifts.map((item) => (
            <Text key={item.id} style={styles.reviewFieldValue}>- {item.giftItem} x {item.quantity}: Rs. {item.estimatedAmount}</Text>
          ))}
        </View>
        {request.budgetRemarks ? (
          <>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewFieldBlock}>
              <Text style={styles.reviewFieldLabel}>Budget Remarks</Text>
              <Text style={styles.reviewFieldValue}>{request.budgetRemarks}</Text>
            </View>
          </>
        ) : null}
      </View>
      
      <View style={styles.reviewGroupCard}>
        <Text style={styles.reviewGroupTitle}>Named Expected Attendees ({attendees.length})</Text>
        <View style={styles.reviewAttendeeList}>
          {attendees.length === 0 ? (
            <Text style={styles.emptyText}>No named attendees added yet.</Text>
          ) : attendees.map((attendee) => {
            const catStyle = getCategoryStyles(attendee.category);
            const initial = String(attendee.name || 'A').trim().charAt(0).toUpperCase();
            return (
              <View key={attendee.id} style={styles.reviewAttendeeRow}>
                <View style={[styles.reviewAvatarCircle, { backgroundColor: catStyle.avatarBg }]}>
                  <Text style={[styles.reviewAvatarText, { color: catStyle.avatarText }]}>{initial}</Text>
                </View>
                <View style={styles.reviewAttendeeInfo}>
                  <View style={styles.reviewAttendeeHeader}>
                    <Text style={styles.reviewAttendeeName} numberOfLines={1}>{attendee.name}</Text>
                    <View style={[styles.reviewCategoryBadge, { backgroundColor: catStyle.bg }]}>
                      <Text style={[styles.reviewCategoryBadgeText, { color: catStyle.text }]}>{attendee.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewAttendeeMobile}>{attendee.mobile}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      
      <TouchableOpacity style={styles.submitButton} onPress={() => saveMeeting(true)} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit For Approval</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.draftButton} onPress={() => saveMeeting(false)} disabled={isSaving}>
        <Text style={styles.draftButtonText}>Save As Draft</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Meeting</Text>
          <TouchableOpacity style={styles.saveHeaderButton} onPress={() => saveMeeting(false)} disabled={isSaving}>
            <Text style={styles.saveHeaderText}>Draft</Text>
          </TouchableOpacity>
        </View>
        <StepHeader currentStep={currentStep} />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {currentStep === 0 && renderRequestStep()}
          {currentStep === 1 && renderAttendeeStep()}
          {currentStep === 2 && renderReviewStep()}
        </ScrollView>
        {currentStep < steps.length - 1 && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerSecondary} onPress={goBack}>
              <Text style={styles.footerSecondaryText}>{currentStep === 0 ? 'Cancel' : 'Back'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerPrimary} onPress={goNext}>
              <Text style={styles.footerPrimaryText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  saveHeaderButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
  },
  saveHeaderText: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  stepHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.015,
    shadowRadius: 3,
    elevation: 0,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepTrackWrap: {
    width: '100%',
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTrack: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  stepTrackActive: {
    backgroundColor: '#4F46E5',
  },
  stepTrackSpacer: {
    backgroundColor: 'transparent',
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepCircleActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 124,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 5,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 15,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfField: {
    width: '48%',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    color: '#374151',
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  selectField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSelectField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldDisabled: {
    opacity: 0.68,
    backgroundColor: '#F1F5F9',
  },
  selectValue: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  selectPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  selectSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '78%',
  },
  selectSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 6,
  },
  selectSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  sheetCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  selectSearchInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  selectOptionsList: {
    maxHeight: 320,
  },
  selectOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  selectOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  selectOptionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  selectOptionTextActive: {
    color: '#4F46E5',
  },
  selectEmptyState: {
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  selectEmptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  locationButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
  },
  locationButtonText: {
    marginLeft: 5,
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },
  planCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planCardTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  planCardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 210,
  },
  planBadge: {
    overflow: 'hidden',
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
  },
  planEmptyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  planLine: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  planLineMain: {
    flex: 1,
    paddingRight: 8,
  },
  planLineTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  planLineMeta: {
    color: '#64748B',
    fontSize: 12.5,
    marginTop: 3,
  },
  planDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  dealerSelectButton: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#D7DCEA',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealerSelectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginRight: 10,
  },
  dealerSelectTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  dealerSelectTitle: {
    color: '#111827',
    fontSize: 14.5,
    fontWeight: '800',
  },
  dealerSelectPlaceholder: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  dealerSelectSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  existingButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  existingButtonText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontSize: 14.5,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 8,
  },
  secondaryButtonText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 14.5,
  },
  addInlineButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.3,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  addInlineButtonText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '900',
  },
  inlineFormCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 14,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inlineFormTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  inlineCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  attendeeList: {
    marginTop: 20,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  attendeeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  attendeeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 5,
  },
  attendeeMeta: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14.5,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  reviewGroupCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewGroupTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4F46E5',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewTypeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  reviewDetailIcon: {
    marginRight: 8,
  },
  reviewDetailText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  reviewFieldBlock: {
    marginBottom: 10,
  },
  reviewFieldLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  reviewFieldValue: {
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 19,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  reviewTwoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewHalfField: {
    width: '48%',
  },
  reviewBudgetText: {
    color: '#059669',
    fontWeight: '800',
  },
  reviewAttendeeList: {
    marginTop: 4,
  },
  reviewAttendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reviewAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  reviewAttendeeInfo: {
    flex: 1,
  },
  reviewAttendeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAttendeeName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  reviewCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  reviewCategoryBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  reviewAttendeeMobile: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  draftButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  draftButtonText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  footerSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginRight: 10,
  },
  footerSecondaryText: {
    color: '#334155',
    fontWeight: '800',
  },
  footerPrimary: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  footerPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default NewMeeting;
