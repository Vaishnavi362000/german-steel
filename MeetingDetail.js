import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import MeetingAttendeePicker from './MeetingAttendeePicker';
import MeetingTimePicker, {
  formatMeetingTimeDisplay,
  isValidMeetingTime,
} from './MeetingTimePicker';
import {
  MEETING_STATUSES,
  addWalkInAttendee as createWalkInAttendance,
  cancelMeeting,
  deriveAttendeeCategoryOptions,
  editMeeting,
  getAttendeeMaster,
  getMeetingById,
  getStatusColor,
  getStatusLabel,
  isTabUnlocked,
  markMeetingAttendance,
  saveMeetingGifts,
  startMeetingExecution,
  submitMeetingExpenses,
  submitMeetingReport,
  submitMeeting,
} from './utils/meetingApi';

const tabs = [
  { key: 'request', label: 'Request', icon: 'clipboard-outline' },
  { key: 'attendees', label: 'Attendees', icon: 'people-outline' },
  { key: 'execution', label: 'Attendance', icon: 'checkbox-outline' },
  { key: 'gifts', label: 'Gifts', icon: 'gift-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'receipt-outline' },
  { key: 'finalReport', label: 'Report', icon: 'document-text-outline' },
];

const emptyRequest = {
  meetingType: '',
  meetingDate: '',
  meetingTime: '',
  city: '',
  state: '',
  location: '',
  referenceName: '',
  purpose: '',
  expectedBudget: '',
  expectedMaterials: '',
  remarks: '',
};

const emptyAttendee = {
  name: '',
  mobile: '',
  category: '',
  cityArea: '',
  company: '',
};

const emptyWalkInAttendee = {
  name: '',
  mobile: '',
  category: '',
  cityArea: '',
  company: '',
};

const todayString = () => new Date().toISOString().split('T')[0];

const emptyGiftDraft = {
  meetingAttendeeIds: [],
  giftItem: '',
  quantity: '1',
  remarks: '',
};

const emptyExpenseDraft = {
  expenseHead: '',
  amount: '',
  expenseDate: todayString(),
  remarks: '',
};

const emptyReportDraft = {
  meetingSummary: '',
  keyDiscussionPoints: '',
  leadsGenerated: '',
  interestedCustomers: '',
  competitorInformation: '',
  finalRemarks: '',
};

const normalizeMobile = (value) => String(value || '').replace(/\D/g, '');
const getRequest = (meeting) => meeting?.request || meeting || {};
const getStatus = (meeting) => meeting?.status || meeting?.meetingStatus || MEETING_STATUSES.DRAFT;

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

const isExecutionCompleteStatus = (status) => [
  MEETING_STATUSES.EXECUTED,
  MEETING_STATUSES.EXPENSE_SUBMITTED,
  MEETING_STATUSES.REPORT_SUBMITTED,
  MEETING_STATUSES.CLOSED,
].includes(status);

const createExecutionDraft = (meeting, request) => ({
  actualMeetingDate: meeting?.actualMeetingDate || meeting?.execution?.actualMeetingDate || request.meetingDate || todayString(),
  actualMeetingTime: meeting?.actualMeetingTime || meeting?.execution?.actualMeetingTime || request.meetingTime || '10:00:00',
  actualLocation: meeting?.actualLocation || meeting?.execution?.actualLocation || request.location || '',
});

const mapAttendeeForExecution = (attendee, index) => {
  const mobile = attendee.mobile || attendee.mobileNumber || '';
  return {
    ...attendee,
    id: attendee.id || attendee.meetingAttendeeId || `actual-${index}`,
    name: attendee.name || '',
    mobile,
    category: attendee.category || '',
    cityArea: attendee.cityArea || '',
    company: attendee.company || attendee.companyShopProject || '',
    source: attendee.expected === false ? 'walkIn' : 'expected',
    attended: Boolean(attendee.present || attendee.attended || attendee.actualAttendance),
  };
};

const getMeetingAttendeeId = (attendee = {}) => attendee.meetingAttendeeId || attendee.id;
const getGiftRecipientId = (attendee = {}) => String(getMeetingAttendeeId(attendee) || '');

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

const SelectField = ({ label, value, placeholder, options, onSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectField, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={styles.selectSheet}>
            <View style={styles.selectSheetHeader}>
              <Text style={styles.selectSheetTitle}>{label}</Text>
              <TouchableOpacity style={styles.sheetCloseButton} onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            {options.length === 0 ? (
              <View style={styles.selectEmptyState}>
                <Text style={styles.selectEmptyText}>No options returned from API.</Text>
              </View>
            ) : options.map((option) => {
              const isSelected = value === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                  onPress={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>{option}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
                </TouchableOpacity>
              );
            })}
          </View>
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
      value={String(value || '')}
      onChangeText={onChangeText}
      placeholder="Meeting location"
      placeholderTextColor="#9CA3AF"
      blurOnSubmit={false}
      autoCorrect={false}
    />
  </View>
);

const MeetingDetail = ({ route, authToken: propAuthToken }) => {
  const navigation = useNavigation();
  const authToken = propAuthToken || route?.params?.authToken;
  const meetingId = route?.params?.meetingId;

  const [meeting, setMeeting] = useState(null);
  const [activeTab, setActiveTab] = useState('request');
  const [requestDraft, setRequestDraft] = useState(emptyRequest);
  const [expectedAttendees, setExpectedAttendees] = useState([]);
  const [attendeeDraft, setAttendeeDraft] = useState(emptyAttendee);
  const [executionDraft, setExecutionDraft] = useState(createExecutionDraft(null, emptyRequest));
  const [actualAttendance, setActualAttendance] = useState([]);
  const [walkInDraft, setWalkInDraft] = useState(emptyWalkInAttendee);
  const [isExecutionStarted, setIsExecutionStarted] = useState(false);
  const [isExecutionSubmitted, setIsExecutionSubmitted] = useState(false);
  const [giftLines, setGiftLines] = useState([]);
  const [giftDraft, setGiftDraft] = useState(emptyGiftDraft);
  const [hasGiftChanges, setHasGiftChanges] = useState(false);
  const [expenseLines, setExpenseLines] = useState([]);
  const [expenseDraft, setExpenseDraft] = useState(emptyExpenseDraft);
  const [expenseRemarks, setExpenseRemarks] = useState('');
  const [reportDraft, setReportDraft] = useState(emptyReportDraft);
  const [isCancelPanelOpen, setIsCancelPanelOpen] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [attendeeMaster, setAttendeeMaster] = useState([]);
  const [attendeeCategoryOptions, setAttendeeCategoryOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAttendeePickerOpen, setIsAttendeePickerOpen] = useState(false);
  const [isLoadingAttendeeMaster, setIsLoadingAttendeeMaster] = useState(false);
  const [hasLoadedAttendeeMaster, setHasLoadedAttendeeMaster] = useState(false);
  const [error, setError] = useState('');

  const status = getStatus(meeting);
  const request = getRequest(meeting);
  const backendTabs = meeting?.tabs || {};
  const allowedActions = Array.isArray(meeting?.allowedActions) ? meeting.allowedActions : [];
  const hasAllowedActions = allowedActions.length > 0;
  const isEditable = [MEETING_STATUSES.DRAFT, MEETING_STATUSES.CORRECTION_REQUIRED].includes(status);
  const isActionAllowed = (actions, fallback = false) => {
    const actionList = Array.isArray(actions) ? actions : [actions];
    if (hasAllowedActions) {
      return actionList.some((action) => allowedActions.includes(action));
    }
    return fallback;
  };
  const isWorkflowTabAvailable = (tabKey) => {
    if (Object.prototype.hasOwnProperty.call(backendTabs, tabKey)) {
      return Boolean(backendTabs[tabKey]);
    }
    return isTabUnlocked(tabKey, status);
  };
  const isExecutionUnlocked = isWorkflowTabAvailable('execution');
  const canCancelMeeting = [
    MEETING_STATUSES.DRAFT,
    MEETING_STATUSES.CORRECTION_REQUIRED,
    MEETING_STATUSES.PENDING_APPROVAL,
    MEETING_STATUSES.APPROVED,
  ].includes(status);

  const hydrateMeeting = useCallback((data) => {
    const hydratedRequest = { ...emptyRequest, ...getRequest(data) };
    const expectedSource = Array.isArray(data?.expectedAttendees) ? data.expectedAttendees : [];
    const allAttendeeSource = Array.isArray(data?.attendees) && data.attendees.length > 0
      ? data.attendees
      : expectedSource;
    const normalizedExpectedAttendees = expectedSource.map((attendee, index) => ({
      ...attendee,
      id: attendee.id || `expected-${index}`,
    }));
    const normalizedActualAttendees = allAttendeeSource.map((attendee, index) => ({
      ...attendee,
      id: attendee.id || attendee.meetingAttendeeId || `actual-${index}`,
    }));
    const currentStatus = getStatus(data);
    const executionDraftData = createExecutionDraft(data, hydratedRequest);

    setMeeting(data);
    setRequestDraft({
      ...hydratedRequest,
      expectedBudget: String(hydratedRequest.expectedBudget || ''),
    });
    setExpectedAttendees(normalizedExpectedAttendees);
    setExecutionDraft(executionDraftData);
    setActualAttendance(normalizedActualAttendees.map(mapAttendeeForExecution));
    setGiftLines(Array.isArray(data?.gifts) ? data.gifts : []);
    setHasGiftChanges(false);
    setExpenseLines(Array.isArray(data?.expenses) ? data.expenses : []);
    setAttendeeCategoryOptions((prev) => mergeOptions(
      prev,
      deriveAttendeeCategoryOptions(normalizedExpectedAttendees),
      deriveAttendeeCategoryOptions(normalizedActualAttendees)
    ));
    setExpenseRemarks(data?.expenseRemarks || data?.expenseSubmissionRemarks || '');
    setReportDraft({
      meetingSummary: data?.meetingSummary || '',
      keyDiscussionPoints: data?.keyDiscussionPoints || '',
      leadsGenerated: String(data?.leadsGenerated || ''),
      interestedCustomers: data?.interestedCustomers || '',
      competitorInformation: data?.competitorInformation || '',
      finalRemarks: data?.finalRemarks || '',
    });
    setIsExecutionStarted(Boolean(data?.actualMeetingDate || data?.actualLocation || isExecutionCompleteStatus(currentStatus)));
    setIsExecutionSubmitted(isExecutionCompleteStatus(currentStatus));
  }, []);

  const fetchMeeting = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getMeetingById({ authToken, meetingId });
      hydrateMeeting(data);
    } catch (fetchError) {
      console.error('Error fetching meeting:', fetchError.message);
      setError('Meeting details are unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, hydrateMeeting, meetingId]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  useEffect(() => {
    let isMounted = true;

    const fetchAttendeeCategories = async () => {
      try {
        const data = await getAttendeeMaster({ authToken });
        if (!isMounted) return;
        setAttendeeMaster(data);
        setAttendeeCategoryOptions((prev) => mergeOptions(prev, deriveAttendeeCategoryOptions(data)));
        setHasLoadedAttendeeMaster(true);
      } catch (attendeeMasterError) {
        console.warn('Unable to fetch attendee categories:', attendeeMasterError.message);
      }
    };

    fetchAttendeeCategories();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  const attendeeCount = useMemo(() => expectedAttendees.length, [expectedAttendees]);
  const attendedCount = useMemo(
    () => actualAttendance.filter((attendee) => attendee.attended).length,
    [actualAttendance]
  );
  const walkInCount = useMemo(
    () => actualAttendance.filter((attendee) => attendee.source === 'walkIn').length,
    [actualAttendance]
  );
  const presentAttendees = useMemo(
    () => actualAttendance.filter((attendee) => attendee.attended || attendee.present),
    [actualAttendance]
  );
  const expenseTotal = useMemo(
    () => expenseLines.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenseLines]
  );
  const expectedBudget = Number(request.expectedBudget || 0);
  const expensesExceedBudget = expenseTotal > expectedBudget;

  const updateRequest = (field, value) => {
    setRequestDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateExecution = (field, value) => {
    setExecutionDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateWalkIn = (field, value) => {
    setWalkInDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateGiftDraft = (field, value) => {
    setGiftDraft((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGiftRecipient = (attendeeId) => {
    const normalizedId = String(attendeeId || '');
    if (!normalizedId) return;

    setGiftDraft((prev) => {
      const selectedIds = new Set(prev.meetingAttendeeIds || []);
      if (selectedIds.has(normalizedId)) {
        selectedIds.delete(normalizedId);
      } else {
        selectedIds.add(normalizedId);
      }
      return { ...prev, meetingAttendeeIds: [...selectedIds] };
    });
  };

  const toggleAllGiftRecipients = () => {
    const allPresentIds = presentAttendees.map(getGiftRecipientId).filter(Boolean);
    setGiftDraft((prev) => {
      const selectedIds = prev.meetingAttendeeIds || [];
      const shouldClear = allPresentIds.length > 0 && selectedIds.length === allPresentIds.length;
      return { ...prev, meetingAttendeeIds: shouldClear ? [] : allPresentIds };
    });
  };

  const updateExpenseDraft = (field, value) => {
    setExpenseDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateReportDraft = (field, value) => {
    setReportDraft((prev) => ({ ...prev, [field]: value }));
  };

  const validateRequest = () => {
    const requiredFields = [
      ['meetingType', 'meeting type'],
      ['meetingDate', 'date'],
      ['meetingTime', 'time'],
      ['city', 'city'],
      ['state', 'state'],
      ['location', 'location'],
      ['purpose', 'purpose'],
      ['expectedBudget', 'expected budget'],
    ];

    const missingFields = requiredFields
      .filter(([field]) => !String(requestDraft[field] || '').trim())
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      Alert.alert('Missing details', `Please add ${missingFields.join(', ')}.`);
      return false;
    }

    if (Number.isNaN(Number(requestDraft.expectedBudget)) || Number(requestDraft.expectedBudget) < 0) {
      Alert.alert('Invalid budget', 'Expected budget should be a valid amount.');
      return false;
    }

    if (!isValidMeetingTime(requestDraft.meetingTime)) {
      Alert.alert('Invalid time', 'Please select a valid meeting time.');
      return false;
    }

    if (expectedAttendees.length === 0) {
      Alert.alert('Attendees required', 'Add expected attendees before saving/submitting.');
      return false;
    }

    return true;
  };

  const saveMeeting = async (showSuccess = true) => {
    if (!validateRequest()) return false;

    try {
      setIsSaving(true);
      await editMeeting({
        authToken,
        meetingId,
        payload: {
          request: {
            ...requestDraft,
            expectedBudget: Number(requestDraft.expectedBudget || 0),
            expectedAttendeeCount: expectedAttendees.length,
          },
          expectedAttendees: expectedAttendees.map(({ id, ...attendee }) => attendee),
        },
      });
      if (showSuccess) {
        Alert.alert('Saved', 'Meeting request updated.');
      }
      await fetchMeeting();
      return true;
    } catch (saveError) {
      console.error('Error saving meeting:', saveError.message);
      Alert.alert('Error', 'Unable to save meeting.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const submitForApproval = async () => {
    const saved = await saveMeeting(false);
    if (!saved) return;

    try {
      setIsSaving(true);
      await submitMeeting({ authToken, meetingId });
      Alert.alert('Submitted', 'Meeting request submitted for approval.');
      await fetchMeeting();
      setActiveTab('request');
    } catch (submitError) {
      console.error('Error submitting meeting:', submitError.message);
      Alert.alert('Error', 'Unable to submit meeting.');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelCurrentMeeting = async () => {
    if (!cancelRemarks.trim()) {
      Alert.alert('Remarks required', 'Add cancellation remarks before cancelling this meeting.');
      return;
    }

    try {
      setIsSaving(true);
      await cancelMeeting({ authToken, meetingId, remarks: cancelRemarks });
      setCancelRemarks('');
      setIsCancelPanelOpen(false);
      Alert.alert('Cancelled', 'Meeting request cancelled.');
      await fetchMeeting();
      setActiveTab('request');
    } catch (cancelError) {
      console.error('Error cancelling meeting:', cancelError.response?.data || cancelError.message);
      Alert.alert('Error', 'Unable to cancel this meeting. Please confirm cancellation is allowed for this status.');
    } finally {
      setIsSaving(false);
    }
  };

  const addAttendee = () => {
    const mobile = normalizeMobile(attendeeDraft.mobile);
    if (!attendeeDraft.name.trim() || mobile.length !== 10) {
      Alert.alert('Invalid attendee', 'Add attendee name and a 10 digit mobile number.');
      return;
    }
    if (!attendeeDraft.category.trim()) {
      Alert.alert('Missing category', 'Select or enter attendee category.');
      return;
    }
    if (expectedAttendees.some((attendee) => normalizeMobile(attendee.mobile) === mobile)) {
      Alert.alert('Duplicate mobile number', 'This mobile number already exists in this meeting.');
      return;
    }
    setExpectedAttendees((prev) => [...prev, { ...attendeeDraft, mobile, id: `expected-${Date.now()}` }]);
    setAttendeeDraft(emptyAttendee);
  };

  const addExistingAttendee = (attendee) => {
    const mobile = normalizeMobile(attendee.mobile || attendee.mobileNumber);
    if (!mobile) {
      Alert.alert('Missing mobile number', 'Selected attendee does not have a mobile number.');
      return;
    }

    if (expectedAttendees.some((item) => normalizeMobile(item.mobile) === mobile)) {
      Alert.alert('Already added', 'This attendee is already added to this meeting.');
      return;
    }

    setExpectedAttendees((prev) => [
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
    } catch (attendeeMasterError) {
      console.warn('Unable to fetch attendee master:', attendeeMasterError.message);
    } finally {
      setHasLoadedAttendeeMaster(true);
      setIsLoadingAttendeeMaster(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
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

      setRequestDraft((prev) => ({
        ...prev,
        location: locationLabel,
        city: prev.city || place?.city || place?.subregion || '',
        state: prev.state || place?.region || '',
      }));
    } catch (locationError) {
      console.error('Error getting current location:', locationError.message);
      Alert.alert('Location unavailable', 'Unable to fetch current location. Please enter it manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const useCurrentExecutionLocation = async () => {
    try {
      setIsLocating(true);
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        Alert.alert('Location permission needed', 'Please allow location access to fill the actual meeting location.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = position.coords;
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      const locationLabel = formatLocationAddress(place, coords);

      setExecutionDraft((prev) => ({
        ...prev,
        actualLocation: locationLabel,
      }));
    } catch (locationError) {
      console.error('Error getting current execution location:', locationError.message);
      Alert.alert('Location unavailable', 'Unable to fetch current location. Please enter it manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const toggleActualAttendance = (attendeeId) => {
    setActualAttendance((prev) => prev.map((attendee) => (
      attendee.id === attendeeId
        ? { ...attendee, attended: !attendee.attended }
        : attendee
    )));
  };

  const addWalkInAttendee = () => {
    const mobile = normalizeMobile(walkInDraft.mobile);
    if (!walkInDraft.name.trim() || mobile.length !== 10) {
      Alert.alert('Invalid attendee', 'Add walk-in name and a 10 digit mobile number.');
      return;
    }

    if (!walkInDraft.category.trim()) {
      Alert.alert('Missing category', 'Select or enter walk-in category.');
      return;
    }

    if (actualAttendance.some((attendee) => normalizeMobile(attendee.mobile) === mobile)) {
      Alert.alert('Duplicate mobile number', 'This mobile number already exists in this meeting.');
      return;
    }

    setActualAttendance((prev) => [
      ...prev,
      {
        ...walkInDraft,
        id: `walk-in-${Date.now()}`,
        mobile,
        source: 'walkIn',
        expected: false,
        attended: true,
      },
    ]);
    setWalkInDraft(emptyWalkInAttendee);
  };

  const submitExecution = async () => {
    const missingFields = [
      ['actualMeetingDate', 'actual date'],
      ['actualMeetingTime', 'actual time'],
      ['actualLocation', 'actual location'],
    ]
      .filter(([field]) => !String(executionDraft[field] || '').trim())
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      Alert.alert('Missing execution details', `Please add ${missingFields.join(', ')}.`);
      return;
    }

    if (!isValidMeetingTime(executionDraft.actualMeetingTime)) {
      Alert.alert('Invalid time', 'Please select a valid actual meeting time.');
      return;
    }

    const selectedAttendanceCount = actualAttendance.filter((attendee) => attendee.attended).length;
    if (selectedAttendanceCount === 0) {
      Alert.alert('Attendance required', 'Mark at least one actual attendee before submitting execution.');
      return;
    }

    const expectedAttendancePayload = actualAttendance
      .filter((attendee) => attendee.source !== 'walkIn')
      .map((attendee) => {
        const attendanceId = attendee.meetingAttendeeId || attendee.id;
        return {
          id: attendanceId,
          present: Boolean(attendee.attended),
          attendanceSource: 'MANUAL',
          remarks: attendee.attended ? 'Present' : 'Absent',
        };
      })
      .filter((attendee) => !String(attendee.id || '').startsWith('expected-') && !String(attendee.id || '').startsWith('actual-'));

    if (expectedAttendees.length > 0 && expectedAttendancePayload.length === 0) {
      Alert.alert('Attendance unavailable', 'Expected attendee ids are missing. Refresh the meeting and try again.');
      return;
    }

    const walkInAttendees = actualAttendance.filter((attendee) => attendee.source === 'walkIn' && attendee.attended);

    try {
      setIsSaving(true);
      await startMeetingExecution({
        authToken,
        meetingId,
        payload: {
          actualMeetingDate: executionDraft.actualMeetingDate,
          actualMeetingTime: executionDraft.actualMeetingTime,
          actualLocation: executionDraft.actualLocation,
          executionRemarks: 'Meeting execution submitted from mobile',
        },
      });

      for (const attendee of walkInAttendees) {
        if (String(attendee.id || '').startsWith('walk-in-')) {
          await createWalkInAttendance({
            authToken,
            meetingId,
            attendee: {
              ...attendee,
              mobileNumber: attendee.mobile,
              attendanceSource: 'FORM',
              remarks: 'Walk-in attendee',
            },
          });
        }
      }

      if (expectedAttendancePayload.length > 0) {
        await markMeetingAttendance({
          authToken,
          meetingId,
          attendees: expectedAttendancePayload,
        });
      }

      setIsExecutionSubmitted(true);
      setIsExecutionStarted(true);
      Alert.alert('Execution submitted', 'Meeting execution and actual attendance are saved.');
      await fetchMeeting();
      setActiveTab('gifts');
    } catch (executionError) {
      console.error('Error submitting execution:', executionError.response?.data || executionError.message);
      Alert.alert('Error', 'Unable to submit meeting execution.');
    } finally {
      setIsSaving(false);
    }
  };

  const addGiftLine = () => {
    const selectedRecipientIds = (giftDraft.meetingAttendeeIds || []).filter(Boolean);
    const selectedAttendees = presentAttendees.filter((attendee) => selectedRecipientIds.includes(getGiftRecipientId(attendee)));
    const quantity = Number(giftDraft.quantity || 0);
    const giftItem = giftDraft.giftItem.trim();

    if (selectedAttendees.length === 0) {
      Alert.alert('Attendees required', 'Select one or more actual attendees before adding a gift.');
      return;
    }

    if (!giftItem || Number.isNaN(quantity) || quantity <= 0) {
      Alert.alert('Invalid gift', 'Enter a gift item and valid quantity.');
      return;
    }

    const existingGiftKeys = new Set(
      giftLines.map((gift) => `${String(gift.meetingAttendeeId || '')}|${String(gift.giftItem || '').trim().toLowerCase()}`)
    );
    const newGiftLines = selectedAttendees
      .map((attendee) => ({
        meetingAttendeeId: getGiftRecipientId(attendee),
        attendeeName: attendee.name,
        giftItem,
        quantity,
        remarks: giftDraft.remarks,
      }))
      .filter((gift) => !existingGiftKeys.has(`${String(gift.meetingAttendeeId)}|${gift.giftItem.toLowerCase()}`));

    if (newGiftLines.length === 0) {
      Alert.alert('Already added', 'This gift is already added for the selected attendees.');
      return;
    }

    setGiftLines((prev) => [
      ...prev,
      ...newGiftLines,
    ]);
    setHasGiftChanges(true);
    setGiftDraft({ ...emptyGiftDraft });
  };

  const removeGiftLine = (index) => {
    setGiftLines((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setHasGiftChanges(true);
  };

  const submitGifts = async () => {
    if (giftLines.length === 0) {
      Alert.alert('Gifts required', 'Add at least one gift issue before submitting.');
      return;
    }

    try {
      setIsSaving(true);
      await saveMeetingGifts({
        authToken,
        meetingId,
        gifts: giftLines.map((gift) => ({
          meetingAttendeeId: Number(gift.meetingAttendeeId),
          giftItem: gift.giftItem,
          quantity: Number(gift.quantity || 1),
          remarks: gift.remarks,
        })),
      });
      Alert.alert('Saved', 'Gift issues saved.');
      await fetchMeeting();
      setHasGiftChanges(false);
      setActiveTab('expenses');
    } catch (giftError) {
      console.error('Error saving gifts:', giftError.response?.data || giftError.message);
      Alert.alert('Error', 'Unable to save gifts.');
    } finally {
      setIsSaving(false);
    }
  };

  const addExpenseLine = () => {
    const amount = Number(expenseDraft.amount || 0);
    if (!expenseDraft.expenseHead || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid expense', 'Select an expense head and enter a valid amount.');
      return;
    }

    setExpenseLines((prev) => [
      ...prev,
      {
        expenseHead: expenseDraft.expenseHead,
        amount,
        expenseDate: expenseDraft.expenseDate || todayString(),
        remarks: expenseDraft.remarks,
      },
    ]);
    setExpenseDraft({
      ...emptyExpenseDraft,
      expenseDate: expenseDraft.expenseDate || todayString(),
    });
  };

  const submitExpenses = async () => {
    if (expenseLines.length === 0) {
      Alert.alert('Expenses required', 'Add at least one expense line before submitting.');
      return;
    }

    if (expensesExceedBudget && !expenseRemarks.trim()) {
      Alert.alert('Remarks required', 'Actual expense is higher than approved budget. Add remarks before submitting.');
      return;
    }

    try {
      setIsSaving(true);
      await submitMeetingExpenses({
        authToken,
        meetingId,
        payload: {
          remarks: expenseRemarks,
          expenses: expenseLines.map((expense) => ({
            expenseHead: expense.expenseHead,
            amount: Number(expense.amount || 0),
            expenseDate: expense.expenseDate || todayString(),
            remarks: expense.remarks,
          })),
        },
      });
      Alert.alert('Submitted', 'Actual expenses submitted.');
      await fetchMeeting();
      setActiveTab('finalReport');
    } catch (expenseError) {
      console.error('Error submitting expenses:', expenseError.response?.data || expenseError.message);
      Alert.alert('Error', 'Unable to submit expenses.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitFinalReport = async () => {
    if (!reportDraft.meetingSummary.trim() || !reportDraft.finalRemarks.trim()) {
      Alert.alert('Report details required', 'Add meeting summary and final remarks before submitting.');
      return;
    }

    try {
      setIsSaving(true);
      await submitMeetingReport({ authToken, meetingId, payload: reportDraft });
      Alert.alert('Submitted', 'Final meeting report submitted.');
      await fetchMeeting();
    } catch (reportError) {
      console.error('Error submitting final report:', reportError.response?.data || reportError.message);
      Alert.alert('Error', 'Unable to submit final report.');
    } finally {
      setIsSaving(false);
    }
  };

  const Field = useCallback(({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, editable = true }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea, !editable && styles.inputDisabled]}
        value={String(value || '')}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        blurOnSubmit={false}
        autoCorrect={false}
      />
    </View>
  ), []);

  const InfoRow = useCallback(({ label, value, icon }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon || 'ellipse-outline'} size={16} color="#4F46E5" />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not added'}</Text>
      </View>
    </View>
  ), []);

  const PrimaryButton = ({ label, onPress, color = '#4F46E5', disabled = false }) => (
    <TouchableOpacity
      style={[styles.primaryButton, { backgroundColor: disabled ? '#CBD5E1' : color }]}
      onPress={onPress}
      disabled={disabled || isSaving}
    >
      {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </TouchableOpacity>
  );

  const renderRequestTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Meeting Request</Text>
      {isEditable ? (
        <>
          <Field
            label="Meeting Type"
            value={requestDraft.meetingType}
            onChangeText={(value) => updateRequest('meetingType', value)}
            placeholder="Counter, Dealer, Mason, Contractor, etc."
          />
          <View style={styles.twoColumn}>
            <View style={styles.halfField}>
              <Field label="Date" value={requestDraft.meetingDate} onChangeText={(value) => updateRequest('meetingDate', value)} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.halfField}>
              <MeetingTimePicker label="Time" value={requestDraft.meetingTime} onChange={(value) => updateRequest('meetingTime', value)} />
            </View>
          </View>
          <View style={styles.twoColumn}>
            <View style={styles.halfField}>
              <Field label="City" value={requestDraft.city} onChangeText={(value) => updateRequest('city', value)} placeholder="City" />
            </View>
            <View style={styles.halfField}>
              <Field label="State" value={requestDraft.state} onChangeText={(value) => updateRequest('state', value)} placeholder="State" />
            </View>
          </View>
          <LocationField value={requestDraft.location} onChangeText={(value) => updateRequest('location', value)} onUseCurrentLocation={useCurrentLocation} isLocating={isLocating} />
          <Field label="Dealer / Customer Reference" value={requestDraft.referenceName} onChangeText={(value) => updateRequest('referenceName', value)} placeholder="Optional" />
          <Field label="Purpose / Objective" value={requestDraft.purpose} onChangeText={(value) => updateRequest('purpose', value)} placeholder="Purpose" multiline />
          <Field label="Expected Budget" value={requestDraft.expectedBudget} onChangeText={(value) => updateRequest('expectedBudget', value)} placeholder="Amount" keyboardType="numeric" />
          <Field label="Expected Gifts / Materials" value={requestDraft.expectedMaterials} onChangeText={(value) => updateRequest('expectedMaterials', value)} placeholder="Caps, brochures, samples, etc." multiline />
          <Field label="Remarks" value={requestDraft.remarks} onChangeText={(value) => updateRequest('remarks', value)} placeholder="Remarks" multiline />
          <PrimaryButton label="Save Draft Changes" onPress={saveMeeting} />
          <PrimaryButton label="Submit For Approval" onPress={submitForApproval} color="#10B981" />
        </>
      ) : (
        <>
          <View style={styles.requestSummary}>
            <View style={styles.requestSummaryIcon}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.requestSummaryText}>
              <Text style={styles.requestSummaryLabel}>Meeting Overview</Text>
              <Text style={styles.requestSummaryValue}>
                {request.meetingType || 'Meeting'} Meeting
              </Text>
            </View>
          </View>

          <View style={styles.detailGroupCard}>
            <Text style={styles.groupCardTitle}>Schedule & Location</Text>
            <InfoRow label="Date & Time" value={[request.meetingDate, formatMeetingTimeDisplay(request.meetingTime)].filter(Boolean).join(' at ') || 'Schedule pending'} icon="calendar-outline" />
            <InfoRow label="City / State" value={[request.city, request.state].filter(Boolean).join(', ') || 'No city/state'} icon="business-outline" />
            <InfoRow label="Location" value={request.location || 'Location pending'} icon="location-outline" />
          </View>

          <View style={styles.detailGroupCard}>
            <Text style={styles.groupCardTitle}>Meeting Objectives</Text>
            <InfoRow label="Reference Name" value={request.referenceName || 'No reference added'} icon="person-circle-outline" />
            <InfoRow label="Purpose / Objective" value={request.purpose || 'No purpose added'} icon="flag-outline" />
          </View>

          <View style={styles.detailGroupCard}>
            <Text style={styles.groupCardTitle}>Resources & Budget</Text>
            <InfoRow label="Expected Budget" value={`Rs. ${request.expectedBudget || 0}`} icon="wallet-outline" />
            <InfoRow label="Expected Gifts / Materials" value={request.expectedMaterials || 'None requested'} icon="gift-outline" />
          </View>

          {request.remarks ? (
            <View style={styles.detailGroupCard}>
              <Text style={styles.groupCardTitle}>Remarks & Notes</Text>
              <InfoRow label="Additional Remarks" value={request.remarks} icon="chatbox-ellipses-outline" />
            </View>
          ) : null}
        </>
      )}
      {canCancelMeeting ? (
        <View style={styles.cancelPanel}>
          {isCancelPanelOpen ? (
            <>
              <Text style={styles.cancelTitle}>Cancel Meeting</Text>
              <Field
                label="Cancellation Remarks"
                value={cancelRemarks}
                onChangeText={setCancelRemarks}
                placeholder="Why is this meeting being cancelled?"
                multiline
              />
              <PrimaryButton label="Confirm Cancellation" onPress={cancelCurrentMeeting} color="#DC2626" />
              <TouchableOpacity style={styles.cancelTextButton} onPress={() => setIsCancelPanelOpen(false)} disabled={isSaving}>
                <Text style={styles.cancelTextButtonText}>Keep Meeting</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.cancelOutlineButton} onPress={() => setIsCancelPanelOpen(true)} disabled={isSaving}>
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.cancelOutlineText}>Cancel Meeting</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );

  const AttendeeCard = ({ attendee, onRemove }) => {
    const catStyle = getCategoryStyles(attendee.category);
    const initial = String(attendee.name || 'A').trim().charAt(0).toUpperCase();
    return (
      <View style={styles.listCard}>
        <View style={[styles.avatarCircle, { backgroundColor: catStyle.avatarBg }]}>
          <Text style={[styles.avatarText, { color: catStyle.avatarText }]}>{initial}</Text>
        </View>
        <View style={styles.listCardText}>
          <View style={styles.listCardTitleRow}>
            <Text style={styles.listCardTitle} numberOfLines={1}>{attendee.name}</Text>
            <View style={[styles.categoryPill, { backgroundColor: catStyle.bg }]}>
              <Text style={[styles.categoryPillText, { color: catStyle.text }]}>{attendee.category || 'Attendee'}</Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={13} color="#64748B" style={styles.metaIcon} />
            <Text style={styles.listCardMeta}>{attendee.mobile || 'Mobile not added'}</Text>
          </View>
          
          {(attendee.cityArea || attendee.company) ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color="#64748B" style={styles.metaIcon} />
              <Text style={styles.listCardMeta} numberOfLines={1}>
                {attendee.cityArea || 'No area'}{attendee.company ? ` - ${attendee.company}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
        {onRemove && (
          <TouchableOpacity style={styles.deleteButton} onPress={onRemove}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const ExecutionAttendeeCard = ({ attendee }) => {
    const catStyle = getCategoryStyles(attendee.category);
    const initial = String(attendee.name || 'A').trim().charAt(0).toUpperCase();
    const isPresent = Boolean(attendee.attended);
    return (
      <TouchableOpacity
        style={[styles.executionAttendeeCard, isPresent && styles.executionAttendeeCardActive]}
        onPress={() => !isExecutionSubmitted && toggleActualAttendance(attendee.id)}
        activeOpacity={0.85}
        disabled={isExecutionSubmitted}
      >
        <View style={[styles.avatarCircle, { backgroundColor: isPresent ? '#DCFCE7' : catStyle.avatarBg }]}>
          <Text style={[styles.avatarText, { color: isPresent ? '#15803D' : catStyle.avatarText }]}>{initial}</Text>
        </View>
        <View style={styles.listCardText}>
          <View style={styles.listCardTitleRow}>
            <Text style={styles.listCardTitle} numberOfLines={1}>{attendee.name}</Text>
            <View style={[styles.sourcePill, attendee.source === 'walkIn' && styles.sourcePillWalkIn]}>
              <Text style={[styles.sourcePillText, attendee.source === 'walkIn' && styles.sourcePillTextWalkIn]}>
                {attendee.source === 'walkIn' ? 'Walk-in' : 'Expected'}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="call-outline" size={13} color="#64748B" style={styles.metaIcon} />
            <Text style={styles.listCardMeta}>{attendee.mobile || 'Mobile not added'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={13} color="#64748B" style={styles.metaIcon} />
            <Text style={styles.listCardMeta}>{attendee.category || 'Attendee'}</Text>
          </View>
        </View>
        <View style={[styles.attendanceToggle, isPresent && styles.attendanceToggleActive]}>
          <Ionicons
            name={isPresent ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={isPresent ? '#16A34A' : '#94A3B8'}
          />
          <Text style={[styles.attendanceToggleText, isPresent && styles.attendanceToggleTextActive]}>
            {isPresent ? 'Present' : 'Mark'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAttendeesTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Expected Attendees ({attendeeCount})</Text>
      {isEditable && (
        <>
          <TouchableOpacity style={styles.existingButton} onPress={openAttendeePicker}>
            <Ionicons name="search-outline" size={18} color="#4F46E5" />
            <Text style={styles.existingButtonText}>Select Existing Attendee</Text>
          </TouchableOpacity>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or add new</Text>
            <View style={styles.dividerLine} />
          </View>
          <Field label="Name" value={attendeeDraft.name} onChangeText={(value) => setAttendeeDraft((prev) => ({ ...prev, name: value }))} placeholder="Attendee name" />
          <Field label="Mobile" value={attendeeDraft.mobile} onChangeText={(value) => setAttendeeDraft((prev) => ({ ...prev, mobile: normalizeMobile(value) }))} placeholder="10 digit mobile" keyboardType="phone-pad" />
          {attendeeCategoryOptions.length > 0 ? (
            <SelectField label="Category" placeholder="Select category" options={attendeeCategoryOptions} value={attendeeDraft.category} onSelect={(value) => setAttendeeDraft((prev) => ({ ...prev, category: value }))} />
          ) : (
            <Field label="Category" value={attendeeDraft.category} onChangeText={(value) => setAttendeeDraft((prev) => ({ ...prev, category: value }))} placeholder="Category from attendee master" />
          )}
          <Field label="City / Area" value={attendeeDraft.cityArea} onChangeText={(value) => setAttendeeDraft((prev) => ({ ...prev, cityArea: value }))} placeholder="Area" />
          <Field label="Company / Shop / Project" value={attendeeDraft.company} onChangeText={(value) => setAttendeeDraft((prev) => ({ ...prev, company: value }))} placeholder="Optional" />
          <PrimaryButton label="Add Expected Attendee" onPress={addAttendee} color="#2563EB" />
        </>
      )}
      {expectedAttendees.length === 0 ? (
        <Text style={styles.emptyText}>No expected attendees added.</Text>
      ) : (
        expectedAttendees.map((attendee) => (
          <AttendeeCard
            key={attendee.id}
            attendee={attendee}
            onRemove={isEditable ? () => setExpectedAttendees((prev) => prev.filter((item) => item.id !== attendee.id)) : null}
          />
        ))
      )}
      {isEditable && <PrimaryButton label="Save Attendee List" onPress={saveMeeting} />}
      <MeetingAttendeePicker
        visible={isAttendeePickerOpen}
        attendees={attendeeMaster}
        isLoading={isLoadingAttendeeMaster}
        selectedMobiles={expectedAttendees.map((attendee) => attendee.mobile)}
        onClose={() => setIsAttendeePickerOpen(false)}
        onSelect={addExistingAttendee}
      />
    </View>
  );

  const renderExecutionTab = () => {
    const canSubmitExecution = isActionAllowed(['EXECUTE', 'MARK_ATTENDANCE'], status === MEETING_STATUSES.APPROVED);
    const canAddWalkIns = request.allowWalkInAttendees !== false && !isExecutionSubmitted && canSubmitExecution;
    const executionStateLabel = isExecutionSubmitted ? 'Submitted' : isExecutionStarted ? 'In Progress' : 'Ready';
    const executionStateColor = isExecutionSubmitted ? '#16A34A' : isExecutionStarted ? '#7C3AED' : '#2563EB';

    if (!isExecutionUnlocked) {
      return (
        <View style={styles.section}>
          <View style={styles.lockedPanel}>
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.lockedTitle}>Execution Locked</Text>
            <Text style={styles.lockedText}>Execution unlocks only after this meeting is approved.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Execution & Attendance</Text>
        <View style={styles.executionHero}>
          <View style={styles.executionHeroIcon}>
            <Ionicons name="checkbox-outline" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.executionHeroText}>
            <Text style={styles.executionHeroEyebrow}>Execution + Attendance</Text>
            <Text style={styles.executionHeroTitle}>{executionStateLabel}</Text>
            <Text style={styles.executionHeroSubtitle}>
              Confirm actual details, mark present attendees, and add walk-ins.
            </Text>
          </View>
          <View style={[styles.executionStateBadge, { backgroundColor: executionStateColor }]}>
            <Text style={styles.executionStateBadgeText}>{executionStateLabel}</Text>
          </View>
        </View>

        {!isExecutionStarted && !isExecutionSubmitted ? (
          <View style={styles.readyPanel}>
            <View style={styles.readyIcon}>
              <Ionicons name="calendar-outline" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.readyTitle}>Approved meeting is ready to execute</Text>
            <Text style={styles.readyText}>
              Start execution when the meeting is happening. The next screen section opens actual location, mark attendance, and walk-in attendee entry.
            </Text>
            {canSubmitExecution ? (
              <PrimaryButton label="Start Execution & Mark Attendance" onPress={() => setIsExecutionStarted(true)} color="#2563EB" />
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.detailGroupCard}>
              <Text style={styles.groupCardTitle}>Actual Meeting Details</Text>
              {isExecutionSubmitted ? (
                <>
                  <InfoRow
                    label="Actual Date & Time"
                    value={[executionDraft.actualMeetingDate, formatMeetingTimeDisplay(executionDraft.actualMeetingTime)].filter(Boolean).join(' at ')}
                    icon="calendar-outline"
                  />
                  <InfoRow
                    label="Actual Location"
                    value={executionDraft.actualLocation}
                    icon="location-outline"
                  />
                </>
              ) : (
                <>
                  <View style={styles.twoColumn}>
                    <View style={styles.halfField}>
                      <Field
                        label="Actual Date"
                        value={executionDraft.actualMeetingDate}
                        onChangeText={(value) => updateExecution('actualMeetingDate', value)}
                        placeholder="YYYY-MM-DD"
                      />
                    </View>
                    <View style={styles.halfField}>
                      <MeetingTimePicker
                        label="Actual Time"
                        value={executionDraft.actualMeetingTime}
                        onChange={(value) => updateExecution('actualMeetingTime', value)}
                      />
                    </View>
                  </View>
                  <LocationField
                    value={executionDraft.actualLocation}
                    onChangeText={(value) => updateExecution('actualLocation', value)}
                    onUseCurrentLocation={useCurrentExecutionLocation}
                    isLocating={isLocating}
                  />
                </>
              )}
            </View>

            <View style={styles.executionStatsRow}>
              <View style={styles.executionStatCard}>
                <Text style={styles.executionStatValue}>{expectedAttendees.length}</Text>
                <Text style={styles.executionStatLabel}>Expected</Text>
              </View>
              <View style={styles.executionStatCard}>
                <Text style={styles.executionStatValue}>{attendedCount}</Text>
                <Text style={styles.executionStatLabel}>Present</Text>
              </View>
              <View style={styles.executionStatCard}>
                <Text style={styles.executionStatValue}>{walkInCount}</Text>
                <Text style={styles.executionStatLabel}>Walk-ins</Text>
              </View>
            </View>

            <View style={styles.detailGroupCard}>
              <View style={styles.executionSectionHeader}>
                <Text style={styles.groupCardTitle}>Mark Actual Attendance</Text>
                <Text style={styles.executionCountText}>{attendedCount} marked</Text>
              </View>
              {actualAttendance.length === 0 ? (
                <Text style={styles.emptyText}>No attendees available to mark.</Text>
              ) : (
                actualAttendance.map((attendee) => (
                  <ExecutionAttendeeCard key={attendee.id} attendee={attendee} />
                ))
              )}
            </View>

            {canAddWalkIns ? (
              <View style={styles.detailGroupCard}>
                <Text style={styles.groupCardTitle}>Add Walk-in Attendee</Text>
                <Field
                  label="Name"
                  value={walkInDraft.name}
                  onChangeText={(value) => updateWalkIn('name', value)}
                  placeholder="Walk-in attendee name"
                />
                <Field
                  label="Mobile"
                  value={walkInDraft.mobile}
                  onChangeText={(value) => updateWalkIn('mobile', normalizeMobile(value))}
                  placeholder="10 digit mobile"
                  keyboardType="phone-pad"
                />
                {attendeeCategoryOptions.length > 0 ? (
                  <SelectField
                    label="Category"
                    placeholder="Select category"
                    options={attendeeCategoryOptions}
                    value={walkInDraft.category}
                    onSelect={(value) => updateWalkIn('category', value)}
                  />
                ) : (
                  <Field
                    label="Category"
                    value={walkInDraft.category}
                    onChangeText={(value) => updateWalkIn('category', value)}
                    placeholder="Category from attendee master"
                  />
                )}
                <Field
                  label="City / Area"
                  value={walkInDraft.cityArea}
                  onChangeText={(value) => updateWalkIn('cityArea', value)}
                  placeholder="Area"
                />
                <Field
                  label="Company / Shop / Project"
                  value={walkInDraft.company}
                  onChangeText={(value) => updateWalkIn('company', value)}
                  placeholder="Optional"
                />
                <TouchableOpacity style={styles.addWalkInButton} onPress={addWalkInAttendee}>
                  <Ionicons name="person-add-outline" size={18} color="#2563EB" />
                  <Text style={styles.addWalkInText}>Add Walk-in</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {isExecutionSubmitted ? (
              <View style={styles.executionCompletePanel}>
                <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                <View style={styles.executionCompleteText}>
                  <Text style={styles.executionCompleteTitle}>Execution submitted</Text>
                  <Text style={styles.executionCompleteSubtitle}>Gifts and expenses can be handled in the next stage.</Text>
                </View>
              </View>
            ) : canSubmitExecution ? (
              <PrimaryButton label="Submit Execution & Attendance" onPress={submitExecution} color="#16A34A" />
            ) : null}
          </>
        )}
      </View>
    );
  };

  const renderGiftsTab = () => {
    const canSubmitGifts = isActionAllowed(['ISSUE_GIFTS', 'SAVE_GIFTS'], status === MEETING_STATUSES.EXECUTED);
    const selectedRecipientIds = giftDraft.meetingAttendeeIds || [];
    const allPresentSelected = presentAttendees.length > 0 && selectedRecipientIds.length === presentAttendees.length;
    const canAddGiftIssue = canSubmitGifts && giftLines.length === 0;
    const hasSavedGiftLines = canSubmitGifts && giftLines.length > 0 && !hasGiftChanges;
    const canSubmitGiftChanges = canSubmitGifts && giftLines.length > 0 && hasGiftChanges;

    if (!isWorkflowTabAvailable('gifts')) {
      return (
        <View style={styles.section}>
          <View style={styles.lockedPanel}>
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.lockedTitle}>Gifts Locked</Text>
            <Text style={styles.lockedText}>Gifts unlock after meeting execution and actual attendance.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gift Issue</Text>
        <View style={styles.detailGroupCard}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.groupCardTitle, styles.groupCardTitleInline]}>Eligible Attendees</Text>
            {canAddGiftIssue && presentAttendees.length > 0 ? (
              <TouchableOpacity style={styles.smallPillButton} onPress={toggleAllGiftRecipients}>
                <Text style={styles.smallPillButtonText}>{allPresentSelected ? 'Clear' : 'Select All'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.giftHelperText}>Select one or more present attendees for this gift batch.</Text>
          {presentAttendees.length === 0 ? (
            <Text style={styles.emptyText}>No actual attendees marked present yet.</Text>
          ) : (
            presentAttendees.map((attendee) => {
              const attendeeId = getGiftRecipientId(attendee);
              const isSelected = selectedRecipientIds.includes(attendeeId);
              return (
                <TouchableOpacity
                  key={attendeeId}
                  style={[styles.recipientCard, isSelected && styles.recipientCardActive]}
                  onPress={() => canAddGiftIssue && toggleGiftRecipient(attendeeId)}
                  activeOpacity={0.85}
                  disabled={!canAddGiftIssue}
                >
                  <View style={styles.recipientInfo}>
                    <Text style={styles.recipientName}>{attendee.name}</Text>
                    <Text style={styles.recipientMeta}>{attendee.mobile || 'Mobile not added'} - {attendee.category || 'Attendee'}</Text>
                  </View>
                  <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={isSelected ? '#16A34A' : '#94A3B8'} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {presentAttendees.length > 0 && canAddGiftIssue ? (
          <View style={styles.detailGroupCard}>
            <View style={styles.executionSectionHeader}>
              <Text style={[styles.groupCardTitle, styles.groupCardTitleInline]}>Gift Details</Text>
              <Text style={styles.executionCountText}>{selectedRecipientIds.length} selected</Text>
            </View>
            <Field
              label="Gift / Item"
              value={giftDraft.giftItem}
              onChangeText={(value) => updateGiftDraft('giftItem', value)}
              placeholder="Gift item name"
            />
            <Field
              label="Quantity"
              value={giftDraft.quantity}
              onChangeText={(value) => updateGiftDraft('quantity', value.replace(/\D/g, ''))}
              placeholder="Quantity"
              keyboardType="numeric"
            />
            <Field
              label="Remarks"
              value={giftDraft.remarks}
              onChangeText={(value) => updateGiftDraft('remarks', value)}
              placeholder="Optional remarks"
            />
            <TouchableOpacity style={styles.addWalkInButton} onPress={addGiftLine}>
              <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
              <Text style={styles.addWalkInText}>Add Gift Issue</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.detailGroupCard}>
          <View style={styles.executionSectionHeader}>
            <Text style={styles.groupCardTitle}>Gift Summary</Text>
            <Text style={styles.executionCountText}>{giftLines.length} item(s)</Text>
          </View>
          {giftLines.length === 0 ? (
            <Text style={styles.emptyText}>No gifts added yet.</Text>
          ) : (
            <>
              {giftLines.map((gift, index) => (
                <View key={`${gift.meetingAttendeeId}-${gift.giftItem}-${index}`} style={styles.summaryLine}>
                  <View style={styles.summaryLineIcon}>
                    <Ionicons name="gift-outline" size={16} color="#4F46E5" />
                  </View>
                  <View style={styles.summaryLineText}>
                    <Text style={styles.summaryLineTitle}>{gift.giftItem} x {gift.quantity}</Text>
                    <Text style={styles.summaryLineMeta}>{gift.attendeeName || gift.name || `Attendee #${gift.meetingAttendeeId}`}</Text>
                  </View>
                  {canSubmitGifts ? (
                    <TouchableOpacity onPress={() => removeGiftLine(index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {canSubmitGiftChanges ? (
                <Text style={styles.helperText}>Gift changes are not submitted yet.</Text>
              ) : hasSavedGiftLines ? (
                <View style={styles.savedStatePanel}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={styles.savedStateText}>Gift issues are already saved. Continue with Expenses.</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {canSubmitGiftChanges ? <PrimaryButton label="Submit Gift Changes" onPress={submitGifts} color="#7C3AED" /> : null}
      </View>
    );
  };

  const renderExpensesTab = () => {
    const canSubmitActualExpenses = isActionAllowed(['SUBMIT_EXPENSES'], status === MEETING_STATUSES.EXECUTED);

    if (!isWorkflowTabAvailable('expenses')) {
      return (
        <View style={styles.section}>
          <View style={styles.lockedPanel}>
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.lockedTitle}>Expenses Locked</Text>
            <Text style={styles.lockedText}>Expenses unlock after the meeting is executed.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actual Expenses</Text>
        <View style={styles.executionStatsRow}>
          <View style={styles.executionStatCard}>
            <Text style={styles.executionStatValue}>Rs. {expectedBudget || 0}</Text>
            <Text style={styles.executionStatLabel}>Approved</Text>
          </View>
          <View style={styles.executionStatCard}>
            <Text style={styles.executionStatValue}>Rs. {expenseTotal}</Text>
            <Text style={styles.executionStatLabel}>Actual</Text>
          </View>
          <View style={styles.executionStatCard}>
            <Text style={[styles.executionStatValue, expensesExceedBudget && styles.overBudgetText]}>
              {expensesExceedBudget ? 'High' : 'OK'}
            </Text>
            <Text style={styles.executionStatLabel}>Budget</Text>
          </View>
        </View>

        {canSubmitActualExpenses ? (
          <View style={styles.detailGroupCard}>
            <Text style={styles.groupCardTitle}>Add Expense</Text>
            <Field
              label="Expense Head"
              value={expenseDraft.expenseHead}
              onChangeText={(value) => updateExpenseDraft('expenseHead', value)}
              placeholder="venue, food/snacks, travel, etc."
            />
            <Field
              label="Amount"
              value={expenseDraft.amount}
              onChangeText={(value) => updateExpenseDraft('amount', value.replace(/[^\d.]/g, ''))}
              placeholder="Amount"
              keyboardType="numeric"
            />
            <Field
              label="Expense Date"
              value={expenseDraft.expenseDate}
              onChangeText={(value) => updateExpenseDraft('expenseDate', value)}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="Remarks"
              value={expenseDraft.remarks}
              onChangeText={(value) => updateExpenseDraft('remarks', value)}
              placeholder="Optional line remarks"
            />
            <TouchableOpacity style={styles.addWalkInButton} onPress={addExpenseLine}>
              <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
              <Text style={styles.addWalkInText}>Add Expense Line</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.detailGroupCard}>
          <View style={styles.executionSectionHeader}>
            <Text style={styles.groupCardTitle}>Expense Summary</Text>
            <Text style={styles.executionCountText}>Rs. {expenseTotal}</Text>
          </View>
          {expenseLines.length === 0 ? (
            <Text style={styles.emptyText}>No expenses added yet.</Text>
          ) : (
            expenseLines.map((expense, index) => (
              <View key={`${expense.expenseHead}-${index}`} style={styles.summaryLine}>
                <View style={styles.summaryLineIcon}>
                  <Ionicons name="receipt-outline" size={16} color="#0891B2" />
                </View>
                <View style={styles.summaryLineText}>
                  <Text style={styles.summaryLineTitle}>{expense.expenseHead} - Rs. {expense.amount}</Text>
                  <Text style={styles.summaryLineMeta}>{expense.expenseDate || todayString()}{expense.remarks ? ` - ${expense.remarks}` : ''}</Text>
                </View>
                {canSubmitActualExpenses ? (
                  <TouchableOpacity onPress={() => setExpenseLines((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>

        {expensesExceedBudget ? (
          <Field
            label="Over Budget Remarks"
            value={expenseRemarks}
            onChangeText={setExpenseRemarks}
            placeholder="Required because actual expense is higher"
            multiline
          />
        ) : (
          <Field
            label="Expense Remarks"
            value={expenseRemarks}
            onChangeText={setExpenseRemarks}
            placeholder="Optional remarks"
            multiline
          />
        )}

        {canSubmitActualExpenses ? <PrimaryButton label="Submit Expenses" onPress={submitExpenses} color="#0891B2" /> : null}
      </View>
    );
  };

  const renderFinalReportTab = () => {
    const canSubmitReport = isActionAllowed(['SUBMIT_REPORT', 'SUBMIT_FINAL_REPORT'], status === MEETING_STATUSES.EXPENSE_SUBMITTED);

    if (!isWorkflowTabAvailable('finalReport')) {
      return (
        <View style={styles.section}>
          <View style={styles.lockedPanel}>
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.lockedTitle}>Final Report Locked</Text>
            <Text style={styles.lockedText}>Final report unlocks after expenses are submitted.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Final Meeting Report</Text>
        <View style={styles.executionStatsRow}>
          <View style={styles.executionStatCard}>
            <Text style={styles.executionStatValue}>{meeting?.actualAttendeeCount || attendedCount}</Text>
            <Text style={styles.executionStatLabel}>Attendees</Text>
          </View>
          <View style={styles.executionStatCard}>
            <Text style={styles.executionStatValue}>{giftLines.length}</Text>
            <Text style={styles.executionStatLabel}>Gifts</Text>
          </View>
          <View style={styles.executionStatCard}>
            <Text style={styles.executionStatValue}>Rs. {expenseTotal}</Text>
            <Text style={styles.executionStatLabel}>Expense</Text>
          </View>
        </View>

        <View style={styles.detailGroupCard}>
          <Text style={styles.groupCardTitle}>Report Details</Text>
          <Field label="Meeting Summary" value={reportDraft.meetingSummary} onChangeText={(value) => updateReportDraft('meetingSummary', value)} placeholder="What happened in the meeting?" multiline editable={canSubmitReport} />
          <Field label="Key Discussion Points" value={reportDraft.keyDiscussionPoints} onChangeText={(value) => updateReportDraft('keyDiscussionPoints', value)} placeholder="Pricing, availability, objections, etc." multiline editable={canSubmitReport} />
          <Field label="Leads Generated" value={reportDraft.leadsGenerated} onChangeText={(value) => updateReportDraft('leadsGenerated', value)} placeholder="Number or details" editable={canSubmitReport} />
          <Field label="Interested Customers / Contractors" value={reportDraft.interestedCustomers} onChangeText={(value) => updateReportDraft('interestedCustomers', value)} placeholder="Names or notes" multiline editable={canSubmitReport} />
          <Field label="Competitor Information" value={reportDraft.competitorInformation} onChangeText={(value) => updateReportDraft('competitorInformation', value)} placeholder="Optional competitor notes" multiline editable={canSubmitReport} />
          <Field label="Final Remarks" value={reportDraft.finalRemarks} onChangeText={(value) => updateReportDraft('finalRemarks', value)} placeholder="Final remarks" multiline editable={canSubmitReport} />
        </View>

        {canSubmitReport ? <PrimaryButton label="Submit Final Report" onPress={submitFinalReport} color="#4F46E5" /> : null}

        {status === MEETING_STATUSES.REPORT_SUBMITTED || status === MEETING_STATUSES.CLOSED ? (
          <View style={styles.detailGroupCard}>
            <Text style={styles.groupCardTitle}>Final Status</Text>
            <InfoRow label="Report" value={status === MEETING_STATUSES.CLOSED ? 'Closed' : 'Submitted for review'} icon="shield-checkmark-outline" />
            <Text style={styles.emptyText}>Admin approval, closure, and report export are handled outside this field-officer mobile flow.</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === 'request') return renderRequestTab();
    if (activeTab === 'attendees') return renderAttendeesTab();
    if (activeTab === 'execution') return renderExecutionTab();
    if (activeTab === 'gifts') return renderGiftsTab();
    if (activeTab === 'expenses') return renderExpensesTab();
    return renderFinalReportTab();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.centerText}>Loading meeting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !meeting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meeting</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.centerText}>{error}</Text>
          <PrimaryButton label="Retry" onPress={fetchMeeting} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{request.meetingType || 'Meeting'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchMeeting}>
          <Ionicons name="refresh-outline" size={22} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isAvailable = isWorkflowTabAvailable(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
                !isAvailable && styles.tabButtonLocked,
              ]}
              onPress={() => {
                if (!isAvailable) {
                  Alert.alert('Locked', `${tab.label} is not available for the current meeting status.`);
                  return;
                }
                setActiveTab(tab.key);
              }}
            >
              <Ionicons
                name={isAvailable ? tab.icon : 'lock-closed-outline'}
                size={16}
                color={isActive ? '#4F46E5' : '#64748B'}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive, !isAvailable && styles.tabTextLocked]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {renderActiveTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  statusBadge: {
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 64,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButton: {
    minWidth: 98,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  tabButtonLocked: {
    opacity: 0.58,
  },
  tabText: {
    marginLeft: 6,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  tabTextActive: {
    color: '#4F46E5',
  },
  tabTextLocked: {
    color: '#94A3B8',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  field: {
    marginBottom: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
  },
  textArea: {
    minHeight: 86,
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
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  chipDisabled: {
    opacity: 0.75,
  },
  chipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#4F46E5',
  },
  selectField: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
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
  requestSummary: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#312E81',
    padding: 14,
    marginBottom: 12,
  },
  requestSummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginRight: 12,
  },
  requestSummaryText: {
    flex: 1,
  },
  requestSummaryLabel: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  requestSummaryValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
    lineHeight: 22,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginRight: 10,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14.5,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 20,
  },
  detailGroupCard: {
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
  groupCardTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#4F46E5',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupCardTitleInline: {
    flex: 1,
    marginBottom: 0,
    paddingRight: 8,
  },
  cardTitleRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  helperText: {
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: -3,
  },
  giftHelperText: {
    color: '#64748B',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  smallPillButton: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  smallPillButtonText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '900',
  },
  lockedPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 34,
    paddingHorizontal: 16,
  },
  lockedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockedTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  lockedText: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  executionHero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#312E81',
    padding: 14,
    marginBottom: 14,
  },
  executionHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  executionHeroText: {
    flex: 1,
    paddingRight: 8,
  },
  executionHeroEyebrow: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  executionHeroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  executionHeroSubtitle: {
    color: '#E0E7FF',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
  },
  executionStateBadge: {
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  executionStateBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  readyPanel: {
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 16,
    marginTop: 2,
  },
  readyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  readyTitle: {
    color: '#312E81',
    fontSize: 16,
    fontWeight: '900',
  },
  readyText: {
    color: '#475569',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  executionStatsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  executionStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  executionStatValue: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
  },
  executionStatLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  executionSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  executionCountText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  executionAttendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 11,
    marginBottom: 9,
    backgroundColor: '#FFFFFF',
  },
  executionAttendeeCardActive: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  sourcePillWalkIn: {
    backgroundColor: '#ECFDF5',
  },
  sourcePillText: {
    color: '#4F46E5',
    fontSize: 10.5,
    fontWeight: '900',
  },
  sourcePillTextWalkIn: {
    color: '#047857',
  },
  attendanceToggle: {
    minWidth: 58,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  attendanceToggleActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  attendanceToggleText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '900',
    marginTop: 1,
  },
  attendanceToggleTextActive: {
    color: '#15803D',
  },
  addWalkInButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addWalkInText: {
    marginLeft: 8,
    color: '#2563EB',
    fontWeight: '900',
  },
  executionCompletePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  executionCompleteText: {
    flex: 1,
    marginLeft: 10,
  },
  executionCompleteTitle: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '900',
  },
  executionCompleteSubtitle: {
    color: '#065F46',
    marginTop: 2,
    lineHeight: 18,
  },
  recipientCard: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  recipientCardActive: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  recipientInfo: {
    flex: 1,
    paddingRight: 8,
  },
  recipientName: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '900',
  },
  recipientMeta: {
    color: '#64748B',
    fontSize: 12.5,
    marginTop: 3,
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 11,
    marginBottom: 9,
    backgroundColor: '#F8FAFC',
  },
  summaryLineIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  summaryLineText: {
    flex: 1,
    paddingRight: 8,
  },
  summaryLineTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  summaryLineMeta: {
    color: '#64748B',
    fontSize: 12.5,
    marginTop: 3,
  },
  savedStatePanel: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedStateText: {
    flex: 1,
    color: '#047857',
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 17,
    marginLeft: 8,
  },
  overBudgetText: {
    color: '#DC2626',
  },
  listCard: {
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
  listCardText: {
    flex: 1,
    justifyContent: 'center',
  },
  listCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
    marginRight: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryPillText: {
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
  listCardMeta: {
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
  primaryButton: {
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14.5,
  },
  cancelPanel: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelTitle: {
    color: '#991B1B',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  cancelOutlineButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
  },
  cancelOutlineText: {
    marginLeft: 7,
    color: '#DC2626',
    fontWeight: '800',
  },
  cancelTextButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelTextButtonText: {
    color: '#475569',
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14.5,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    marginTop: 10,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MeetingDetail;
