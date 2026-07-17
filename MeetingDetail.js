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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  DEFAULT_MEETING_TYPES,
  MEETING_STATUSES,
  addWalkInAttendee as createWalkInAttendance,
  cancelMeeting,
  deleteMeetingExpense,
  deleteMeetingGift,
  deriveAttendeeCategoryOptions,
  editMeeting,
  finaliseMeetingAttendance,
  getAttendeeMaster,
  getDealerShops,
  getExpenseHeads,
  getGiftItems,
  getMeetingById,
  getMeetingTypes,
  getStatusColor,
  getStatusLabel,
  isTabUnlocked,
  markNoExpenses,
  markNoGifts,
  resubmitFinalReportCorrection,
  resubmitMeetingCorrection,
  saveMeetingGifts,
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

const initialPlannedExpense = {
  expenseHead: '',
  amount: '',
};

const initialPlannedGift = {
  giftItem: '',
  quantity: '1',
  estimatedAmount: '',
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

const formatDateForInput = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayString = () => formatDateForInput(new Date());

const emptyGiftDraft = {
  meetingAttendeeIds: [],
  giftItem: '',
  quantity: '1',
  remarks: '',
};

const emptyExpenseDraft = {
  expenseHead: '',
  amount: '',
  paidBy: 'COMPANY',
  companyAmount: '',
  dealerAmount: '',
  expenseDate: todayString(),
  remarks: '',
};

const emptyReportDraft = {
  meetingSummary: '',
  keyDiscussionPoints: '',
  leadsGenerated: '',
  leadCount: '',
  leadDetails: '',
  interestedCustomers: '',
  competitorInformation: '',
  actualBusinessOutcome: '',
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
const getGiftLineId = (gift = {}) => gift.giftId || gift.id || gift.meetingGiftId;
const getGiftLineAttendeeId = (gift = {}) => String(
  gift.meetingAttendeeId
  || gift.attendeeId
  || gift.meetingAttendee?.id
  || gift.attendee?.id
  || ''
);
const getExpenseLineId = (expense = {}) => expense.expenseId || expense.id || expense.meetingExpenseId;
const normalizeCompletionState = (value) => String(value || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
const getCorrectionTabFromStage = (value) => {
  const stage = normalizeCompletionState(value);
  if (stage.includes('FINAL') || stage.includes('REPORT')) return 'finalReport';
  if (stage.includes('EXPENSE')) return 'expenses';
  if (stage.includes('GIFT')) return 'gifts';
  if (stage.includes('EXECUTION') || stage.includes('ATTENDANCE')) return 'execution';
  if (stage.includes('ATTENDEE')) return 'attendees';
  return 'request';
};
const hasFinalReportData = (meeting = {}) => [
  meeting.meetingSummary,
  meeting.keyDiscussionPoints,
  meeting.leadsGenerated,
  meeting.leadCount,
  meeting.leadDetails,
  meeting.interestedCustomers,
  meeting.competitorInformation,
  meeting.actualBusinessOutcome,
  meeting.finalRemarks,
].some((value) => String(value || '').trim());
const getCorrectionTabForMeeting = (meeting = {}) => {
  const stageValue = meeting?.correctionStage || meeting?.correctionSection || meeting?.stageLabel;
  if (stageValue) return getCorrectionTabFromStage(stageValue);

  const returnValue = meeting?.returnStatus || meeting?.returnToStatus || meeting?.previousStatus || meeting?.fromStatus;
  if (normalizeCompletionState(returnValue).includes('REPORT_SUBMITTED')) return 'finalReport';

  return hasFinalReportData(meeting) ? 'finalReport' : 'request';
};
const getCorrectionSectionLabel = (tabKey) => ({
  request: 'Request',
  attendees: 'Expected Attendees',
  execution: 'Execution / Attendance',
  gifts: 'Gifts',
  expenses: 'Expenses',
  finalReport: 'Final Report',
}[tabKey] || 'Request');

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
        style={[styles.selectField, disabled && styles.inputDisabled]}
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
  const [plannedExpenses, setPlannedExpenses] = useState([]);
  const [plannedExpenseDraft, setPlannedExpenseDraft] = useState(initialPlannedExpense);
  const [plannedGifts, setPlannedGifts] = useState([]);
  const [plannedGiftDraft, setPlannedGiftDraft] = useState(initialPlannedGift);
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
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [isCancelPanelOpen, setIsCancelPanelOpen] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [attendeeMaster, setAttendeeMaster] = useState([]);
  const [attendeeCategoryOptions, setAttendeeCategoryOptions] = useState([]);
  const [meetingTypes, setMeetingTypes] = useState(DEFAULT_MEETING_TYPES);
  const [giftItems, setGiftItems] = useState([]);
  const [expenseHeads, setExpenseHeads] = useState([]);
  const [dealerShops, setDealerShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAttendeePickerOpen, setIsAttendeePickerOpen] = useState(false);
  const [isDealerPickerOpen, setIsDealerPickerOpen] = useState(false);
  const [isExpectedAttendeeFormOpen, setIsExpectedAttendeeFormOpen] = useState(false);
  const [isPlannedExpenseFormOpen, setIsPlannedExpenseFormOpen] = useState(false);
  const [isPlannedGiftFormOpen, setIsPlannedGiftFormOpen] = useState(false);
  const [isGiftIssueFormOpen, setIsGiftIssueFormOpen] = useState(false);
  const [isExpenseLineFormOpen, setIsExpenseLineFormOpen] = useState(false);
  const [isExecutionDetailsOpen, setIsExecutionDetailsOpen] = useState(false);
  const [isWalkInFormOpen, setIsWalkInFormOpen] = useState(false);
  const [isRequestDatePickerOpen, setIsRequestDatePickerOpen] = useState(false);
  const [isExecutionDatePickerOpen, setIsExecutionDatePickerOpen] = useState(false);
  const [isExpenseDatePickerOpen, setIsExpenseDatePickerOpen] = useState(false);
  const [isLoadingAttendeeMaster, setIsLoadingAttendeeMaster] = useState(false);
  const [isLoadingDealers, setIsLoadingDealers] = useState(false);
  const [hasLoadedAttendeeMaster, setHasLoadedAttendeeMaster] = useState(false);
  const [hasLoadedDealers, setHasLoadedDealers] = useState(false);
  const [error, setError] = useState('');

  const status = getStatus(meeting);
  const request = getRequest(meeting);
  const reportDraftStorageKey = meetingId ? `meeting-report-draft-${meetingId}` : '';
  const backendTabs = meeting?.tabs || {};
  const allowedActions = Array.isArray(meeting?.allowedActions) ? meeting.allowedActions : [];
  const hasAllowedActions = allowedActions.length > 0;
  const isCorrectionRequired = status === MEETING_STATUSES.CORRECTION_REQUIRED;
  const correctionReturnTab = isCorrectionRequired
    ? getCorrectionTabForMeeting(meeting)
    : '';
  const correctionSectionLabel = getCorrectionSectionLabel(correctionReturnTab);
  const isEditable = status === MEETING_STATUSES.DRAFT
    || (isCorrectionRequired && ['request', 'attendees'].includes(correctionReturnTab));
  const isActionAllowed = (actions, fallback = false) => {
    const actionList = Array.isArray(actions) ? actions : [actions];
    if (hasAllowedActions) {
      return actionList.some((action) => allowedActions.includes(action));
    }
    return fallback;
  };
  const isWorkflowTabAvailable = (tabKey) => {
    if (isCorrectionRequired) {
      return tabKey === correctionReturnTab;
    }
    if (Object.prototype.hasOwnProperty.call(backendTabs, tabKey)) {
      return Boolean(backendTabs[tabKey]);
    }
    return isTabUnlocked(tabKey, status);
  };
  const hasGiftCompletionFlag = ['giftsCompleted', 'giftCompleted', 'noGifts', 'giftCompletionState']
    .some((key) => meeting?.[key] !== undefined && meeting?.[key] !== null && meeting?.[key] !== '');
  const hasExpenseCompletionFlag = ['expensesCompleted', 'expenseCompleted', 'noExpenses', 'expenseCompletionState']
    .some((key) => meeting?.[key] !== undefined && meeting?.[key] !== null && meeting?.[key] !== '');
  const giftSectionComplete = Boolean(meeting?.giftsCompleted || meeting?.noGifts);
  const expenseSectionComplete = Boolean(meeting?.expensesCompleted || meeting?.noExpenses);
  const noGiftsSelected = Boolean(
    meeting?.noGifts
    || normalizeCompletionState(meeting?.giftCompletionState) === 'NO_GIFTS'
    || (hasGiftCompletionFlag && giftSectionComplete && giftLines.length === 0)
  );
  const noExpensesSelected = Boolean(
    meeting?.noExpenses
    || normalizeCompletionState(meeting?.expenseCompletionState) === 'NO_EXPENSES'
    || (hasExpenseCompletionFlag && expenseSectionComplete && expenseLines.length === 0)
  );
  const isAttendanceFinalized = Boolean(meeting?.attendanceFinalized || meeting?.attendanceFinalised);
  const isFinalReportCorrection = isCorrectionRequired && correctionReturnTab === 'finalReport';
  const isGiftsAvailable = () => isWorkflowTabAvailable('gifts') && isAttendanceFinalized;
  const isFinalReportAvailable = () => {
    if (!isWorkflowTabAvailable('finalReport')) return false;
    if (hasGiftCompletionFlag && !giftSectionComplete) return false;
    if (hasExpenseCompletionFlag && !expenseSectionComplete) return false;
    return true;
  };
  const isExecutionUnlocked = isWorkflowTabAvailable('execution');
  const canCancelMeeting = [
    MEETING_STATUSES.DRAFT,
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
      expectedTurnout: String(hydratedRequest.expectedTurnout || ''),
      companyContribution: String(hydratedRequest.companyContribution ?? ''),
      dealerContribution: String(hydratedRequest.dealerContribution ?? ''),
    });
    setPlannedExpenses((data?.plannedExpenses || []).map((item, index) => ({
      id: item.id || `planned-expense-${index}`,
      expenseHead: item.expenseHead || item.head || '',
      amount: item.amount || '',
    })));
    setPlannedGifts((data?.plannedGifts || []).map((item, index) => ({
      id: item.id || `planned-gift-${index}`,
      giftItem: item.giftItem || item.item || '',
      quantity: item.quantity || '1',
      estimatedAmount: item.estimatedAmount || item.amount || '',
    })));
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
      leadCount: String(data?.leadCount || data?.leadsGenerated || ''),
      leadDetails: data?.leadDetails || '',
      interestedCustomers: data?.interestedCustomers || '',
      competitorInformation: data?.competitorInformation || '',
      actualBusinessOutcome: data?.actualBusinessOutcome || '',
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
    if (isCorrectionRequired && correctionReturnTab && activeTab !== correctionReturnTab) {
      setActiveTab(correctionReturnTab);
    }
  }, [activeTab, correctionReturnTab, isCorrectionRequired]);

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

    const fetchConfig = async () => {
      const [heads, gifts] = await Promise.all([
        getExpenseHeads({ authToken }),
        getGiftItems({ authToken }),
      ]);
      if (!isMounted) return;
      setExpenseHeads(heads);
      setGiftItems(gifts);
    };

    fetchConfig();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  useEffect(() => {
    let isMounted = true;

    const loadLocalReportDraft = async () => {
      if (!reportDraftStorageKey || [MEETING_STATUSES.REPORT_SUBMITTED, MEETING_STATUSES.CLOSED].includes(status)) return;
      try {
        const storedDraft = await AsyncStorage.getItem(reportDraftStorageKey);
        if (!storedDraft || !isMounted) return;
        setReportDraft((prev) => ({ ...prev, ...JSON.parse(storedDraft) }));
      } catch (draftError) {
        console.warn('Unable to load local report draft:', draftError.message);
      }
    };

    loadLocalReportDraft();

    return () => {
      isMounted = false;
    };
  }, [meeting, reportDraftStorageKey, status]);

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
  const giftItemOptions = useMemo(
    () => mergeOptions(giftItems, giftLines.map((gift) => gift.giftItem)),
    [giftItems, giftLines]
  );
  const expenseHeadOptions = useMemo(
    () => mergeOptions(expenseHeads, expenseLines.map((expense) => expense.expenseHead)),
    [expenseHeads, expenseLines]
  );
  const giftTotalQuantity = useMemo(
    () => giftLines.reduce((sum, gift) => sum + Number(gift.quantity || 0), 0),
    [giftLines]
  );
  const expenseTotal = useMemo(
    () => expenseLines.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenseLines]
  );
  const plannedGiftLines = useMemo(() => (Array.isArray(meeting?.plannedGifts) ? meeting.plannedGifts : []), [meeting]);
  const plannedExpenseTotal = useMemo(
    () => plannedExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [plannedExpenses]
  );
  const plannedGiftTotal = useMemo(
    () => plannedGifts.reduce((sum, item) => sum + Number(item.estimatedAmount || 0), 0),
    [plannedGifts]
  );
  const requestCityOptions = getCityOptionsForState(requestDraft.state);
  const expectedBudget = Number(request.expectedBudget || 0);
  const expectedTurnoutValue = Number(request.expectedTurnout || request.expectedAttendeeCount || expectedAttendees.length || 0);
  const expensesExceedBudget = expenseTotal > expectedBudget;

  const updateRequest = (field, value) => {
    setRequestDraft((prev) => ({ ...prev, [field]: value }));
  };

  const selectRequestState = (value) => {
    const nextCityOptions = getCityOptionsForState(value);
    setRequestDraft((prev) => ({
      ...prev,
      state: value,
      city: nextCityOptions.includes(prev.city) ? prev.city : '',
    }));
  };

  const updatePlannedExpense = (field, value) => {
    setPlannedExpenseDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updatePlannedGift = (field, value) => {
    setPlannedGiftDraft((prev) => ({ ...prev, [field]: value }));
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
      ['expectedBusinessImpact', 'expected business impact'],
      ['expectedTurnout', 'expected turnout'],
      ['expectedBudget', 'expected budget'],
    ];

    const missingFields = requiredFields
      .filter(([field]) => !String(requestDraft[field] || '').trim())
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      Alert.alert('Missing details', `Please add ${missingFields.join(', ')}.`);
      return false;
    }

    const selectedTypeIsActive = meetingTypes.some(
      (type) => String(type).toLowerCase() === String(requestDraft.meetingType).toLowerCase()
    );
    if (!selectedTypeIsActive) {
      Alert.alert('Invalid meeting type', 'Please select an active meeting type from the list.');
      return false;
    }

    if (['dealer', 'counter'].some((type) => String(requestDraft.meetingType || '').toLowerCase().includes(type)) && !requestDraft.storeId) {
      Alert.alert('Dealer / shop required', 'Select a dealer/shop from the customer database for Dealer or Counter meetings.');
      return false;
    }

    const expectedTurnout = Number(requestDraft.expectedTurnout);
    if (Number.isNaN(expectedTurnout) || expectedTurnout <= 0) {
      Alert.alert('Invalid turnout', 'Expected turnout should be greater than zero.');
      return false;
    }

    if (expectedTurnout < expectedAttendees.length) {
      Alert.alert('Invalid turnout', 'Expected turnout cannot be lower than named attendees added.');
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

  const validatePlanForSubmit = () => {
    if (plannedExpenses.length === 0) {
      Alert.alert('Planned expenses required', 'Add at least one planned expense before submitting for approval.');
      return false;
    }

    if (plannedGifts.length === 0) {
      Alert.alert('Planned gifts required', 'Add at least one planned gift/material before submitting for approval.');
      return false;
    }

    const missingContributions = [
      ['companyContribution', 'company contribution'],
      ['dealerContribution', 'dealer contribution'],
    ]
      .filter(([field]) => !String(requestDraft[field] ?? '').trim())
      .map(([, label]) => label);

    if (missingContributions.length > 0) {
      Alert.alert('Contribution split required', `Please add ${missingContributions.join(' and ')}. Use 0 if not applicable.`);
      return false;
    }

    const draftExpectedBudget = Number(requestDraft.expectedBudget || 0);
    const companyContribution = Number(requestDraft.companyContribution || 0);
    const dealerContribution = Number(requestDraft.dealerContribution || 0);

    if ([companyContribution, dealerContribution].some((amount) => Number.isNaN(amount) || amount < 0)) {
      Alert.alert('Invalid contribution', 'Company and dealer contribution should be valid non-negative amounts.');
      return false;
    }

    const contributionTotal = companyContribution + dealerContribution;
    if (Math.abs(contributionTotal - draftExpectedBudget) > 0.009) {
      Alert.alert(
        'Budget mismatch',
        `Company + dealer contribution must equal expected budget. Expected Rs. ${draftExpectedBudget}, currently Rs. ${contributionTotal}.`
      );
      return false;
    }

    return true;
  };

  const saveMeeting = async (showSuccess = true) => {
    try {
      setIsSaving(true);
      await editMeeting({
        authToken,
        meetingId,
        payload: {
          request: {
            ...requestDraft,
            expectedTurnout: requestDraft.expectedTurnout,
            namedAttendeeCount: expectedAttendees.length,
          },
          expectedAttendees: expectedAttendees.map(({ id, ...attendee }) => attendee),
          plannedExpenses: plannedExpenses.map(({ id, ...item }) => item),
          plannedGifts: plannedGifts.map(({ id, ...item }) => item),
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
    if (isFinalReportCorrection) {
      setActiveTab('finalReport');
      Alert.alert('Final report correction', 'Update the Final Report tab and resubmit from there.');
      return;
    }

    if (!validateRequest()) return;
    if (!validatePlanForSubmit()) return;
    const saved = await saveMeeting(false);
    if (!saved) return;

    try {
      setIsSaving(true);
      let nextTab = 'request';
      if (status === MEETING_STATUSES.CORRECTION_REQUIRED) {
        nextTab = correctionReturnTab || 'request';
        await resubmitMeetingCorrection({ authToken, meetingId });
        Alert.alert('Submitted', 'Meeting correction resubmitted.');
      } else {
        await submitMeeting({ authToken, meetingId });
        Alert.alert('Submitted', 'Meeting request submitted for approval.');
      }
      await fetchMeeting();
      setActiveTab(nextTab);
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

  const copyToNewRequest = () => {
    navigation.navigate('NewMeeting', {
      authToken,
      initialRequest: {
        ...request,
        meetingDate: todayString(),
        meetingTime: '',
        remarks: '',
      },
      initialAttendees: expectedAttendees.map((attendee) => ({
        name: attendee.name,
        mobile: attendee.mobile,
        email: attendee.email,
        category: attendee.category,
        cityArea: attendee.cityArea,
        company: attendee.company,
        id: `copy-${attendee.mobile || attendee.name || Date.now()}`,
      })),
    });
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
        id: `planned-expense-${Date.now()}`,
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
        id: `planned-gift-${Date.now()}`,
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
    setIsExpectedAttendeeFormOpen(false);
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

  const fetchDealerShops = async (search = '') => {
    try {
      setIsLoadingDealers(true);
      const employeeId = await AsyncStorage.getItem('employeeId');
      const data = await getDealerShops({ authToken, employeeId, search });
      setDealerShops(data);
    } catch (dealerError) {
      console.warn('Unable to fetch dealer/shop list:', dealerError.message);
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
    setRequestDraft((prev) => ({
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
    setIsWalkInFormOpen(false);
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
          attendanceSource: 'FINAL_MANUAL',
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

      const savedWalkInPayload = [];
      for (const attendee of walkInAttendees) {
        if (String(attendee.id || '').startsWith('walk-in-')) {
          const savedWalkIn = await createWalkInAttendance({
            authToken,
            meetingId,
            attendee: {
              ...attendee,
              mobileNumber: attendee.mobile,
              attendanceSource: 'FORM',
              remarks: 'Walk-in attendee',
            },
          });
          const savedWalkInId = savedWalkIn.meetingAttendeeId || savedWalkIn.id;
          if (savedWalkInId) {
            savedWalkInPayload.push({
              id: savedWalkInId,
              present: true,
              attendanceSource: 'FINAL_MANUAL',
              remarks: 'Walk-in attendee',
            });
          }
        } else {
          const existingWalkInId = attendee.meetingAttendeeId || attendee.id;
          if (existingWalkInId) {
            savedWalkInPayload.push({
              id: existingWalkInId,
              present: true,
              attendanceSource: 'FINAL_MANUAL',
              remarks: attendee.remarks || 'Walk-in attendee',
            });
          }
        }
      }

      await finaliseMeetingAttendance({
        authToken,
        meetingId,
        payload: {
          actualMeetingDate: executionDraft.actualMeetingDate,
          actualMeetingTime: executionDraft.actualMeetingTime,
          actualLocation: executionDraft.actualLocation,
          executionRemarks: 'Meeting execution and attendance finalised from mobile',
          attendees: [...expectedAttendancePayload, ...savedWalkInPayload],
        },
      });

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
      giftLines.map((gift) => `${getGiftLineAttendeeId(gift)}|${String(gift.giftItem || '').trim().toLowerCase()}`)
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
    setIsGiftIssueFormOpen(false);
  };

  const removeGiftLine = async (index) => {
    const gift = giftLines[index];
    const giftId = getGiftLineId(gift);

    if (!giftId) {
      setGiftLines((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
      setHasGiftChanges(true);
      return;
    }

    try {
      setIsSaving(true);
      await deleteMeetingGift({ authToken, meetingId, giftId });
      await fetchMeeting();
    } catch (giftError) {
      console.error('Error deleting gift:', giftError.response?.data || giftError.message);
      Alert.alert('Error', 'Unable to delete this gift line.');
    } finally {
      setIsSaving(false);
    }
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
        gifts: giftLines.map((gift) => {
          const attendeeId = Number(getGiftLineAttendeeId(gift));
          const giftId = getGiftLineId(gift);
          return {
            ...(giftId ? { id: giftId, giftId } : {}),
            ...(Number.isFinite(attendeeId) && attendeeId > 0 ? { meetingAttendeeId: attendeeId } : {}),
            giftItem: gift.giftItem,
            quantity: Number(gift.quantity || 1),
            remarks: gift.remarks,
          };
        }),
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

  const submitNoGifts = async () => {
    try {
      setIsSaving(true);
      await markNoGifts({ authToken, meetingId, remarks: 'No gifts issued from mobile' });
      Alert.alert('Saved', 'Marked as no gifts issued.');
      await fetchMeeting();
      setHasGiftChanges(false);
      setIsGiftIssueFormOpen(false);
      setActiveTab('expenses');
    } catch (giftError) {
      console.error('Error marking no gifts:', giftError.response?.data || giftError.message);
      Alert.alert('Error', 'Unable to mark no gifts.');
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

    const paidBy = expenseDraft.paidBy || 'COMPANY';
    const companyAmount = paidBy === 'COMPANY'
      ? amount
      : paidBy === 'SHARED'
        ? Number(expenseDraft.companyAmount || 0)
        : 0;
    const dealerAmount = paidBy === 'DEALER'
      ? amount
      : paidBy === 'SHARED'
        ? Number(expenseDraft.dealerAmount || 0)
        : 0;

    if (paidBy === 'SHARED' && (companyAmount <= 0 || dealerAmount <= 0 || companyAmount + dealerAmount !== amount)) {
      Alert.alert('Invalid split', 'For shared expenses, company and dealer amounts must be greater than zero and equal the total amount.');
      return;
    }

    setExpenseLines((prev) => [
      ...prev,
      {
        expenseHead: expenseDraft.expenseHead,
        amount,
        paidBy,
        companyAmount,
        dealerAmount,
        expenseDate: expenseDraft.expenseDate || todayString(),
        remarks: expenseDraft.remarks,
      },
    ]);
    setExpenseDraft({
      ...emptyExpenseDraft,
      expenseDate: expenseDraft.expenseDate || todayString(),
    });
    setIsExpenseLineFormOpen(false);
  };

  const removeExpenseLine = async (index) => {
    const expense = expenseLines[index];
    const expenseId = getExpenseLineId(expense);

    if (!expenseId) {
      setExpenseLines((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    try {
      setIsSaving(true);
      await deleteMeetingExpense({ authToken, meetingId, expenseId });
      await fetchMeeting();
    } catch (expenseError) {
      console.error('Error deleting expense:', expenseError.response?.data || expenseError.message);
      Alert.alert('Error', 'Unable to delete this expense line.');
    } finally {
      setIsSaving(false);
    }
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
          expenseVarianceRemarks: expenseRemarks,
          expenses: expenseLines.map((expense) => ({
            ...(getExpenseLineId(expense) ? { id: getExpenseLineId(expense), expenseId: getExpenseLineId(expense) } : {}),
            expenseHead: expense.expenseHead,
            amount: Number(expense.amount || 0),
            paidBy: expense.paidBy || 'COMPANY',
            companyAmount: Number(expense.companyAmount || 0),
            dealerAmount: Number(expense.dealerAmount || 0),
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

  const submitNoExpenses = async () => {
    try {
      setIsSaving(true);
      await markNoExpenses({ authToken, meetingId, remarks: expenseRemarks || 'No expenses submitted from mobile' });
      Alert.alert('Submitted', 'Marked as no expenses.');
      await fetchMeeting();
      setIsExpenseLineFormOpen(false);
      setActiveTab('finalReport');
    } catch (expenseError) {
      console.error('Error marking no expenses:', expenseError.response?.data || expenseError.message);
      Alert.alert('Error', 'Unable to mark no expenses.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveReportDraft = async () => {
    if (!reportDraftStorageKey) return;

    try {
      await AsyncStorage.setItem(reportDraftStorageKey, JSON.stringify(reportDraft));
      Alert.alert('Draft saved', 'Report draft saved on this device.');
    } catch (draftError) {
      console.error('Error saving report draft:', draftError.message);
      Alert.alert('Error', 'Unable to save report draft.');
    }
  };

  const submitFinalReport = async () => {
    if (!reportDraft.meetingSummary.trim() || !reportDraft.actualBusinessOutcome.trim()) {
      Alert.alert('Report details required', 'Add meeting summary and actual business outcome before submitting.');
      return;
    }

    const reportPayload = {
      ...reportDraft,
      leadsGenerated: reportDraft.leadCount || reportDraft.leadsGenerated || '',
      leadCount: Number(reportDraft.leadCount || reportDraft.leadsGenerated || 0),
    };

    try {
      setIsSaving(true);
      if (isFinalReportCorrection) {
        await resubmitFinalReportCorrection({ authToken, meetingId, payload: reportPayload });
      } else {
        await submitMeetingReport({ authToken, meetingId, payload: reportPayload });
      }
      if (reportDraftStorageKey) {
        await AsyncStorage.removeItem(reportDraftStorageKey);
      }
      Alert.alert('Submitted', isFinalReportCorrection ? 'Final report correction resubmitted.' : 'Final meeting report submitted.');
      await fetchMeeting();
      setActiveTab('finalReport');
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
      {status === MEETING_STATUSES.CORRECTION_REQUIRED ? (
        <View style={styles.correctionPanel}>
          <View style={styles.correctionIcon}>
            <Ionicons name="construct-outline" size={20} color="#EA580C" />
          </View>
          <View style={styles.correctionTextWrap}>
            <Text style={styles.correctionTitle}>Correction Required{meeting?.correctionStage ? ` - ${meeting.correctionStage}` : ''}</Text>
            <Text style={styles.correctionText}>{meeting?.correctionRemarks || 'Please update the requested section and resubmit.'}</Text>
            <Text style={styles.correctionMeta}>Affected section: {correctionSectionLabel}</Text>
            {meeting?.correctionRequestedBy || meeting?.correctionRequestedAt ? (
              <Text style={styles.correctionMeta}>
                {[meeting.correctionRequestedBy, meeting.correctionRequestedAt].filter(Boolean).join(' - ')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      {status === MEETING_STATUSES.REJECTED ? (
        <View style={styles.negativePanel}>
          <View style={styles.correctionIcon}>
            <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
          </View>
          <View style={styles.correctionTextWrap}>
            <Text style={styles.negativeTitle}>Rejected</Text>
            <Text style={styles.correctionText}>{meeting?.rejectionReason || 'No rejection reason provided.'}</Text>
            {meeting?.rejectedBy || meeting?.rejectedAt ? (
              <Text style={styles.correctionMeta}>{[meeting.rejectedBy, meeting.rejectedAt].filter(Boolean).join(' - ')}</Text>
            ) : null}
            <TouchableOpacity style={styles.copyRequestButton} onPress={copyToNewRequest}>
              <Ionicons name="copy-outline" size={15} color="#FFFFFF" />
              <Text style={styles.copyRequestText}>Copy to New Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {isEditable ? (
        <>
          <SelectField
            label="Meeting Type"
            placeholder="Select meeting type"
            options={meetingTypes}
            value={requestDraft.meetingType}
            onSelect={(value) => updateRequest('meetingType', value)}
          />
          <View style={styles.twoColumn}>
            <View style={styles.halfField}>
              <View style={styles.field}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  style={styles.dateSelectField}
                  onPress={() => setIsRequestDatePickerOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.selectValue, !requestDraft.meetingDate && styles.selectPlaceholder]} numberOfLines={1}>
                    {requestDraft.meetingDate || 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.halfField}>
              <MeetingTimePicker label="Time" value={requestDraft.meetingTime} onChange={(value) => updateRequest('meetingTime', value)} />
            </View>
          </View>
          <View style={styles.twoColumn}>
            <View style={styles.halfField}>
              <SelectField
                label="State"
                placeholder="Select state"
                options={INDIAN_STATE_OPTIONS}
                value={requestDraft.state}
                onSelect={selectRequestState}
              />
            </View>
            <View style={styles.halfField}>
              <SelectField
                label="City"
                placeholder={requestDraft.state ? 'Select city' : 'Select state first'}
                options={requestCityOptions}
                value={requestDraft.city}
                onSelect={(value) => updateRequest('city', value)}
                disabled={!requestDraft.state}
              />
            </View>
          </View>
          <LocationField value={requestDraft.location} onChangeText={(value) => updateRequest('location', value)} onUseCurrentLocation={useCurrentLocation} isLocating={isLocating} />
          <View style={styles.field}>
            <Text style={styles.label}>Dealer / Shop</Text>
            <TouchableOpacity style={styles.dealerSelectButton} onPress={openDealerPicker}>
              <View style={styles.dealerSelectIcon}>
                <Ionicons name="storefront-outline" size={18} color="#4F46E5" />
              </View>
              <View style={styles.dealerSelectTextWrap}>
                <Text style={[styles.dealerSelectTitle, !requestDraft.storeName && styles.dealerSelectPlaceholder]} numberOfLines={1}>
                  {requestDraft.storeName || 'Select dealer / shop'}
                </Text>
                <Text style={styles.dealerSelectSubtitle}>Linked to customer database</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <Field label="Additional Customer Reference" value={requestDraft.referenceName} onChangeText={(value) => updateRequest('referenceName', value)} placeholder="Optional extra context" />
          <Field label="Purpose / Objective" value={requestDraft.purpose} onChangeText={(value) => updateRequest('purpose', value)} placeholder="Purpose" multiline />
          <Field label="Expected Business Impact" value={requestDraft.expectedBusinessImpact} onChangeText={(value) => updateRequest('expectedBusinessImpact', value)} placeholder="Expected business result" multiline />
          <Field label="Expected Turnout" value={requestDraft.expectedTurnout} onChangeText={(value) => updateRequest('expectedTurnout', value.replace(/\D/g, ''))} placeholder="Planned total attendees" keyboardType="numeric" />
          <Field label="Expected Budget" value={requestDraft.expectedBudget} onChangeText={(value) => updateRequest('expectedBudget', value)} placeholder="Amount" keyboardType="numeric" />
          <Field label="Gift / Material Notes" value={requestDraft.expectedMaterials} onChangeText={(value) => updateRequest('expectedMaterials', value)} placeholder="Optional notes, e.g. brochures or samples to carry" multiline />
          <View style={styles.planCard}>
            <View style={styles.planCardHeader}>
              <View>
                <Text style={styles.planCardTitle}>Budget Contribution</Text>
                <Text style={styles.planCardSubtitle}>Company + dealer must equal expected budget.</Text>
              </View>
              <Text style={styles.planBadge}>Rs. {Number(requestDraft.expectedBudget || 0)}</Text>
            </View>
            <View style={styles.twoColumn}>
              <View style={styles.halfField}>
                <Field
                  label="Company Contribution"
                  value={requestDraft.companyContribution}
                  onChangeText={(value) => updateRequest('companyContribution', value.replace(/[^\d.]/g, ''))}
                  placeholder="Company"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Field
                  label="Dealer Contribution"
                  value={requestDraft.dealerContribution}
                  onChangeText={(value) => updateRequest('dealerContribution', value.replace(/[^\d.]/g, ''))}
                  placeholder="Dealer"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Field
              label="Budget Remarks"
              value={requestDraft.budgetRemarks}
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
                  options={expenseHeadOptions}
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
                <Text style={styles.planCardSubtitle}>Enter item, quantity, and estimated amount.</Text>
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
                  options={giftItemOptions}
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
          <Field label="Remarks" value={requestDraft.remarks} onChangeText={(value) => updateRequest('remarks', value)} placeholder="Remarks" multiline />
          <PrimaryButton label="Save Draft Changes" onPress={saveMeeting} />
          <PrimaryButton
            label={status === MEETING_STATUSES.CORRECTION_REQUIRED ? 'Resubmit Correction' : 'Submit For Approval'}
            onPress={submitForApproval}
            color="#10B981"
          />
          <MeetingDealerShopPicker
            visible={isDealerPickerOpen}
            shops={dealerShops}
            isLoading={isLoadingDealers}
            selectedStoreId={requestDraft.storeId}
            onClose={() => setIsDealerPickerOpen(false)}
            onSearch={fetchDealerShops}
            onSelect={selectDealerShop}
            onAddNew={openCustomerCreation}
          />
          <DatePicker
            isVisible={isRequestDatePickerOpen}
            onClose={() => setIsRequestDatePickerOpen(false)}
            onSelect={(date) => updateRequest('meetingDate', formatDateForInput(date))}
          />
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
            <InfoRow label="Dealer / Shop" value={request.storeName || 'No dealer/shop linked'} icon="storefront-outline" />
            <InfoRow label="Reference Name" value={request.referenceName || 'No reference added'} icon="person-circle-outline" />
            <InfoRow label="Purpose / Objective" value={request.purpose || 'No purpose added'} icon="flag-outline" />
            <InfoRow label="Expected Business Impact" value={request.expectedBusinessImpact || 'No expected impact added'} icon="trending-up-outline" />
          </View>

          <View style={styles.detailGroupCard}>
            <Text style={styles.groupCardTitle}>Resources & Budget</Text>
            <InfoRow label="Expected Turnout" value={`${request.expectedTurnout || 0}`} icon="people-outline" />
            <InfoRow label="Named Attendees Added" value={`${expectedAttendees.length}`} icon="person-add-outline" />
            <InfoRow label="Expected Budget" value={`Rs. ${request.expectedBudget || 0}`} icon="wallet-outline" />
            <InfoRow label="Gift / Material Notes" value={request.expectedMaterials || 'No extra notes'} icon="document-text-outline" />
            <View style={styles.infoBlock}>
              <View style={styles.infoIcon}>
                <Ionicons name="gift-outline" size={16} color="#4F46E5" />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Planned Gifts / Materials</Text>
                {plannedGiftLines.length === 0 ? (
                  <Text style={styles.infoValue}>No planned gifts added</Text>
                ) : plannedGiftLines.map((gift, index) => (
                  <View key={`${gift.giftItem || gift.item || 'gift'}-${index}`} style={styles.summaryLine}>
                    <View style={styles.summaryLineIcon}>
                      <Ionicons name="gift-outline" size={16} color="#4F46E5" />
                    </View>
                    <View style={styles.summaryLineText}>
                      <Text style={styles.summaryLineTitle}>
                        {gift.giftItem || gift.item || 'Gift item'} x {gift.quantity || 0}
                      </Text>
                      <Text style={styles.summaryLineMeta}>Estimated Rs. {gift.estimatedAmount || gift.amount || 0}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
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
      <Text style={styles.sectionTitle}>Named Expected Attendees ({attendeeCount})</Text>
      <Text style={styles.helperText}>Expected turnout: {expectedTurnoutValue || 0}</Text>
      {isEditable && (
        <>
          <TouchableOpacity style={styles.existingButton} onPress={openAttendeePicker}>
            <Ionicons name="search-outline" size={18} color="#4F46E5" />
            <Text style={styles.existingButtonText}>Select Existing Attendee</Text>
          </TouchableOpacity>
          {isExpectedAttendeeFormOpen ? (
            <View style={styles.inlineFormCard}>
              <View style={styles.inlineFormHeader}>
                <Text style={styles.inlineFormTitle}>Add New Attendee</Text>
                <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsExpectedAttendeeFormOpen(false)}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
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
            </View>
          ) : (
            <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsExpectedAttendeeFormOpen(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
              <Text style={styles.addInlineButtonText}>Add New Attendee</Text>
            </TouchableOpacity>
          )}
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
    const canSubmitExecution = isActionAllowed(
      ['EXECUTE', 'MARK_ATTENDANCE'],
      status === MEETING_STATUSES.APPROVED || (isCorrectionRequired && correctionReturnTab === 'execution')
    );
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
              <PrimaryButton
                label="Start Execution"
                onPress={() => {
                  setIsExecutionStarted(true);
                  setIsExecutionDetailsOpen(true);
                }}
                color="#2563EB"
              />
            ) : null}
          </View>
        ) : (
          <>
            {isExecutionSubmitted ? (
              <View style={styles.detailGroupCard}>
                <Text style={styles.groupCardTitle}>Actual Meeting Details</Text>
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
              </View>
            ) : isExecutionDetailsOpen ? (
              <View style={styles.inlineFormCard}>
                <View style={styles.inlineFormHeader}>
                  <Text style={styles.inlineFormTitle}>Actual Meeting Details</Text>
                  <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsExecutionDetailsOpen(false)}>
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={styles.twoColumn}>
                  <View style={styles.halfField}>
                    <View style={styles.field}>
                      <Text style={styles.label}>Actual Date</Text>
                      <TouchableOpacity
                        style={styles.dateSelectField}
                        onPress={() => setIsExecutionDatePickerOpen(true)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.selectValue, !executionDraft.actualMeetingDate && styles.selectPlaceholder]} numberOfLines={1}>
                          {executionDraft.actualMeetingDate || 'Select date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
                      </TouchableOpacity>
                    </View>
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
              </View>
            ) : (
              <>
                <View style={styles.detailGroupCard}>
                  <Text style={styles.groupCardTitle}>Actual Meeting Details</Text>
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
                </View>
                <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsExecutionDetailsOpen(true)}>
                  <Ionicons name="create-outline" size={18} color="#4F46E5" />
                  <Text style={styles.addInlineButtonText}>Edit Actual Details</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.executionStatsRow}>
              <View style={styles.executionStatCard}>
                <Text style={styles.executionStatValue}>{expectedTurnoutValue || expectedAttendees.length}</Text>
                <Text style={styles.executionStatLabel}>Turnout</Text>
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
                <Text style={styles.groupCardTitle}>{isExecutionSubmitted ? 'Actual Attendance' : 'Mark Attendance'}</Text>
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
              isWalkInFormOpen ? (
                <View style={styles.inlineFormCard}>
                  <View style={styles.inlineFormHeader}>
                    <Text style={styles.inlineFormTitle}>Add Walk-in Attendee</Text>
                    <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsWalkInFormOpen(false)}>
                      <Ionicons name="close" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
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
              ) : (
                <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsWalkInFormOpen(true)}>
                  <Ionicons name="person-add-outline" size={18} color="#4F46E5" />
                  <Text style={styles.addInlineButtonText}>Add Walk-in Attendee</Text>
                </TouchableOpacity>
              )
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
            <DatePicker
              isVisible={isExecutionDatePickerOpen}
              onClose={() => setIsExecutionDatePickerOpen(false)}
              onSelect={(date) => updateExecution('actualMeetingDate', formatDateForInput(date))}
            />
          </>
        )}
      </View>
    );
  };

  const renderGiftsTab = () => {
    const noGiftsMarked = noGiftsSelected;
    const canSubmitGifts = isGiftsAvailable() && !noGiftsMarked && isActionAllowed(
      ['ISSUE_GIFTS', 'SAVE_GIFTS'],
      status === MEETING_STATUSES.EXECUTED || (isCorrectionRequired && correctionReturnTab === 'gifts')
    );
    const selectedRecipientIds = giftDraft.meetingAttendeeIds || [];
    const allPresentSelected = presentAttendees.length > 0 && selectedRecipientIds.length === presentAttendees.length;
    const canAddGiftIssue = canSubmitGifts;
    const hasSavedGiftLines = canSubmitGifts && giftLines.length > 0 && !hasGiftChanges;
    const canSubmitGiftChanges = canSubmitGifts && giftLines.length > 0 && hasGiftChanges;

    if (!isGiftsAvailable()) {
      return (
        <View style={styles.section}>
          <View style={styles.lockedPanel}>
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.lockedTitle}>Gifts Locked</Text>
            <Text style={styles.lockedText}>Gifts unlock only after the backend confirms attendance is finalised.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gift Issue</Text>
        {noGiftsMarked ? (
          <View style={styles.savedStatePanel}>
            <Ionicons name="ban-outline" size={18} color="#7C3AED" />
            <Text style={styles.savedStateText}>No gifts were distributed for this meeting.</Text>
          </View>
        ) : null}
        {presentAttendees.length === 0 && canAddGiftIssue ? (
          <View style={styles.detailGroupCard}>
            <Text style={styles.emptyText}>No actual attendees marked present yet.</Text>
          </View>
        ) : null}
        {presentAttendees.length > 0 && canAddGiftIssue && !noGiftsMarked ? (
          <>
            <View style={styles.detailGroupCard}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.groupCardTitle, styles.groupCardTitleInline]}>Eligible Attendees</Text>
                <TouchableOpacity style={styles.smallPillButton} onPress={toggleAllGiftRecipients}>
                  <Text style={styles.smallPillButtonText}>{allPresentSelected ? 'Clear' : 'Select All'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.giftHelperText}>Select one or more present attendees for this gift batch.</Text>
              {presentAttendees.map((attendee) => {
                const attendeeId = getGiftRecipientId(attendee);
                const isSelected = selectedRecipientIds.includes(attendeeId);
                return (
                  <TouchableOpacity
                    key={attendeeId}
                    style={[styles.recipientCard, isSelected && styles.recipientCardActive]}
                    onPress={() => toggleGiftRecipient(attendeeId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientName}>{attendee.name}</Text>
                      <Text style={styles.recipientMeta}>{attendee.mobile || 'Mobile not added'} - {attendee.category || 'Attendee'}</Text>
                    </View>
                    <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={isSelected ? '#16A34A' : '#94A3B8'} />
                  </TouchableOpacity>
                );
              })}
            </View>
            {isGiftIssueFormOpen ? (
              <View style={styles.inlineFormCard}>
                <View style={styles.inlineFormHeader}>
                  <Text style={styles.inlineFormTitle}>Gift Details</Text>
                  <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsGiftIssueFormOpen(false)}>
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.giftHelperText}>{selectedRecipientIds.length} attendee(s) selected for this gift issue.</Text>
                <SelectField
                  label="Gift / Item"
                  placeholder="Select gift item"
                  options={giftItemOptions}
                  value={giftDraft.giftItem}
                  onSelect={(value) => updateGiftDraft('giftItem', value)}
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
            ) : (
              <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsGiftIssueFormOpen(true)}>
                <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
                <Text style={styles.addInlineButtonText}>Add Gift Details</Text>
              </TouchableOpacity>
            )}
          </>
        ) : null}

        {canSubmitGifts && giftLines.length === 0 && !noGiftsMarked ? (
          <TouchableOpacity style={styles.noWorkButton} onPress={submitNoGifts} disabled={isSaving}>
            <Ionicons name="ban-outline" size={18} color="#7C3AED" />
            <Text style={styles.noWorkButtonText}>Mark No Gifts Issued</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.detailGroupCard}>
          <View style={styles.executionSectionHeader}>
            <Text style={styles.groupCardTitle}>Gift Summary</Text>
            <Text style={styles.executionCountText}>{giftLines.length} line(s), {giftTotalQuantity} qty</Text>
          </View>
          {giftLines.length === 0 && noGiftsMarked ? (
            <Text style={styles.emptyText}>No gifts were added because this meeting was marked as no gifts issued.</Text>
          ) : giftLines.length === 0 ? (
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
    const noExpensesMarked = noExpensesSelected;
    const canSubmitActualExpenses = !noExpensesMarked && isActionAllowed(
      ['SUBMIT_EXPENSES'],
      status === MEETING_STATUSES.EXECUTED || (isCorrectionRequired && correctionReturnTab === 'expenses')
    );

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
        {noExpensesMarked ? (
          <View style={styles.savedStatePanel}>
            <Ionicons name="ban-outline" size={18} color="#0891B2" />
            <Text style={styles.savedStateText}>No expenses were incurred for this meeting.</Text>
          </View>
        ) : null}
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
          isExpenseLineFormOpen ? (
          <View style={styles.inlineFormCard}>
            <View style={styles.inlineFormHeader}>
              <Text style={styles.inlineFormTitle}>Add Expense Line</Text>
              <TouchableOpacity style={styles.inlineCloseButton} onPress={() => setIsExpenseLineFormOpen(false)}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <SelectField
              label="Expense Head"
              placeholder="Select expense head"
              options={expenseHeadOptions}
              value={expenseDraft.expenseHead}
              onSelect={(value) => updateExpenseDraft('expenseHead', value)}
            />
            <Field
              label="Amount"
              value={expenseDraft.amount}
              onChangeText={(value) => updateExpenseDraft('amount', value.replace(/[^\d.]/g, ''))}
              placeholder="Amount"
              keyboardType="numeric"
            />
            <SelectField
              label="Paid By"
              placeholder="Select payer"
              options={['COMPANY', 'DEALER', 'SHARED']}
              value={expenseDraft.paidBy}
              onSelect={(value) => updateExpenseDraft('paidBy', value)}
            />
            {expenseDraft.paidBy === 'SHARED' ? (
              <View style={styles.twoColumn}>
                <View style={styles.halfField}>
                  <Field
                    label="Company Amount"
                    value={expenseDraft.companyAmount}
                    onChangeText={(value) => updateExpenseDraft('companyAmount', value.replace(/[^\d.]/g, ''))}
                    placeholder="Company"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfField}>
                  <Field
                    label="Dealer Amount"
                    value={expenseDraft.dealerAmount}
                    onChangeText={(value) => updateExpenseDraft('dealerAmount', value.replace(/[^\d.]/g, ''))}
                    placeholder="Dealer"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>Expense Date</Text>
              <TouchableOpacity
                style={styles.dateSelectField}
                onPress={() => setIsExpenseDatePickerOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.selectValue, !expenseDraft.expenseDate && styles.selectPlaceholder]} numberOfLines={1}>
                  {expenseDraft.expenseDate || 'Select date'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
              </TouchableOpacity>
            </View>
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
          ) : (
            <TouchableOpacity style={styles.addInlineButton} onPress={() => setIsExpenseLineFormOpen(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
              <Text style={styles.addInlineButtonText}>Add Expense Line</Text>
            </TouchableOpacity>
          )
        ) : null}

        <View style={styles.detailGroupCard}>
          <View style={styles.executionSectionHeader}>
            <Text style={styles.groupCardTitle}>Expense Summary</Text>
            <Text style={styles.executionCountText}>Rs. {expenseTotal}</Text>
          </View>
          {expenseLines.length === 0 && noExpensesMarked ? (
            <Text style={styles.emptyText}>No expense lines were added because this meeting was marked as no expenses.</Text>
          ) : expenseLines.length === 0 ? (
            <Text style={styles.emptyText}>No expenses added yet.</Text>
          ) : (
            expenseLines.map((expense, index) => (
              <View key={`${expense.expenseHead}-${index}`} style={styles.summaryLine}>
                <View style={styles.summaryLineIcon}>
                  <Ionicons name="receipt-outline" size={16} color="#0891B2" />
                </View>
                <View style={styles.summaryLineText}>
                  <Text style={styles.summaryLineTitle}>{expense.expenseHead} - Rs. {expense.amount}</Text>
                  <Text style={styles.summaryLineMeta}>
                    {expense.expenseDate || todayString()} - {expense.paidBy || 'COMPANY'}
                    {expense.paidBy === 'SHARED' ? ` (Company Rs. ${expense.companyAmount}, Dealer Rs. ${expense.dealerAmount})` : ''}
                    {expense.remarks ? ` - ${expense.remarks}` : ''}
                  </Text>
                </View>
                {canSubmitActualExpenses ? (
                  <TouchableOpacity onPress={() => removeExpenseLine(index)}>
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

        {canSubmitActualExpenses && expenseLines.length === 0 && !noExpensesMarked ? (
          <TouchableOpacity style={styles.noWorkButton} onPress={submitNoExpenses} disabled={isSaving}>
            <Ionicons name="ban-outline" size={18} color="#0891B2" />
            <Text style={styles.noWorkButtonText}>Mark No Expenses</Text>
          </TouchableOpacity>
        ) : null}
        {canSubmitActualExpenses && expenseLines.length > 0 ? <PrimaryButton label="Submit Expenses" onPress={submitExpenses} color="#0891B2" /> : null}
        <DatePicker
          isVisible={isExpenseDatePickerOpen}
          onClose={() => setIsExpenseDatePickerOpen(false)}
          onSelect={(date) => updateExpenseDraft('expenseDate', formatDateForInput(date))}
        />
      </View>
    );
  };

  const renderFinalReportTab = () => {
    const canSubmitReport = isFinalReportAvailable()
      && (
        isFinalReportCorrection
        || isActionAllowed(
          ['SUBMIT_REPORT', 'SUBMIT_FINAL_REPORT', 'RESUBMIT_CORRECTION', 'RESUBMIT_FINAL_REPORT'],
          status === MEETING_STATUSES.EXPENSE_SUBMITTED
        )
      );
    const giftSummaryText = meeting?.noGifts
      ? 'No gifts distributed'
      : giftLines.length > 0
        ? `${giftLines.length} line(s), ${giftTotalQuantity} total quantity`
        : 'No gift entries yet';
    const expenseSummaryText = meeting?.noExpenses
      ? 'No expenses incurred'
      : expenseLines.length > 0
        ? `Rs. ${expenseTotal} across ${expenseLines.length} line(s)`
        : 'No expense entries yet';
    const attendanceSummaryText = `${meeting?.actualAttendeeCount || attendedCount} present${walkInCount ? `, ${walkInCount} walk-in(s)` : ''}`;

    if (!isFinalReportAvailable()) {
      const pendingSections = [
        hasGiftCompletionFlag && !giftSectionComplete ? 'finalise gifts or mark no gifts' : '',
        hasExpenseCompletionFlag && !expenseSectionComplete ? 'finalise expenses or mark no expenses' : '',
      ].filter(Boolean);
      return (
        <View style={styles.section}>
          <View style={styles.lockedPanel}>
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.lockedTitle}>Final Report Locked</Text>
            <Text style={styles.lockedText}>
              {pendingSections.length > 0
                ? `Complete pending section(s): ${pendingSections.join(', ')}.`
                : 'Final report unlocks after gifts and expenses are completed.'}
            </Text>
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
          <Text style={styles.groupCardTitle}>Automatic Summary</Text>
          <InfoRow label="Attendance" value={attendanceSummaryText} icon="people-outline" />
          <InfoRow label="Gifts" value={giftSummaryText} icon="gift-outline" />
          <InfoRow label="Expenses" value={expenseSummaryText} icon="receipt-outline" />
        </View>

        <View style={styles.detailGroupCard}>
          <Text style={styles.groupCardTitle}>Report Details</Text>
          <Field label="Meeting Summary" value={reportDraft.meetingSummary} onChangeText={(value) => updateReportDraft('meetingSummary', value)} placeholder="What happened in the meeting?" multiline editable={canSubmitReport} />
          <Field label="Key Discussion Points" value={reportDraft.keyDiscussionPoints} onChangeText={(value) => updateReportDraft('keyDiscussionPoints', value)} placeholder="Pricing, availability, objections, etc." multiline editable={canSubmitReport} />
          <Field label="Competitor Information" value={reportDraft.competitorInformation} onChangeText={(value) => updateReportDraft('competitorInformation', value)} placeholder="Optional competitor notes" multiline editable={canSubmitReport} />
          <Field label="Actual Business Outcome" value={reportDraft.actualBusinessOutcome} onChangeText={(value) => updateReportDraft('actualBusinessOutcome', value)} placeholder="Actual result from this meeting" multiline editable={canSubmitReport} />
          <Field label="Final Remarks" value={reportDraft.finalRemarks} onChangeText={(value) => updateReportDraft('finalRemarks', value)} placeholder="Final remarks" multiline editable={canSubmitReport} />
        </View>

        <View style={styles.detailGroupCard}>
          <Text style={styles.groupCardTitle}>Leads</Text>
          <Field label="Lead Count" value={reportDraft.leadCount} onChangeText={(value) => updateReportDraft('leadCount', value.replace(/\D/g, ''))} placeholder="Number of leads" keyboardType="numeric" editable={canSubmitReport} />
          <Field label="Lead Details" value={reportDraft.leadDetails} onChangeText={(value) => updateReportDraft('leadDetails', value)} placeholder="Lead names, projects, quantities, or next steps" multiline editable={canSubmitReport} />
          <Field label="Interested Customers / Contractors" value={reportDraft.interestedCustomers} onChangeText={(value) => updateReportDraft('interestedCustomers', value)} placeholder="Names or notes" multiline editable={canSubmitReport} />
        </View>

        {canSubmitReport ? (
          <>
            <View style={styles.reportActionRow}>
              <TouchableOpacity style={styles.reportActionButton} onPress={saveReportDraft} disabled={isSaving}>
                <Ionicons name="save-outline" size={17} color="#4F46E5" />
                <Text style={styles.reportActionText}>Save Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportActionButton} onPress={() => setIsReportPreviewOpen((prev) => !prev)} disabled={isSaving}>
                <Ionicons name="eye-outline" size={17} color="#4F46E5" />
                <Text style={styles.reportActionText}>{isReportPreviewOpen ? 'Hide Preview' : 'Preview'}</Text>
              </TouchableOpacity>
            </View>

            {isReportPreviewOpen ? (
              <View style={styles.reportPreviewCard}>
                <Text style={styles.reportPreviewTitle}>Report Preview</Text>
                <Text style={styles.reportPreviewText}>Summary: {reportDraft.meetingSummary || 'Not added'}</Text>
                <Text style={styles.reportPreviewText}>Attendance: {attendanceSummaryText}</Text>
                <Text style={styles.reportPreviewText}>Gifts: {giftSummaryText}</Text>
                <Text style={styles.reportPreviewText}>Expenses: {expenseSummaryText}</Text>
                <Text style={styles.reportPreviewText}>Leads: {reportDraft.leadCount || 0} - {reportDraft.leadDetails || 'No lead details'}</Text>
                <Text style={styles.reportPreviewText}>Outcome: {reportDraft.actualBusinessOutcome || 'Not added'}</Text>
              </View>
            ) : null}

            <PrimaryButton label="Submit Final Report" onPress={submitFinalReport} color="#4F46E5" />
          </>
        ) : null}

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
            <Text style={styles.statusText}>{meeting?.statusLabel || getStatusLabel(status)}</Text>
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
          const isAvailable = tab.key === 'finalReport'
            ? isFinalReportAvailable()
            : tab.key === 'gifts'
              ? isGiftsAvailable()
              : isWorkflowTabAvailable(tab.key);
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
        {isCorrectionRequired && activeTab !== 'request' ? (
          <View style={styles.correctionPanel}>
            <View style={styles.correctionIcon}>
              <Ionicons name="construct-outline" size={20} color="#EA580C" />
            </View>
            <View style={styles.correctionTextWrap}>
              <Text style={styles.correctionTitle}>Correction Required{meeting?.correctionStage ? ` - ${meeting.correctionStage}` : ''}</Text>
              <Text style={styles.correctionText}>{meeting?.correctionRemarks || 'Please update the requested section and resubmit.'}</Text>
              <Text style={styles.correctionMeta}>Affected section: {correctionSectionLabel}</Text>
            </View>
          </View>
        ) : null}
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
  correctionPanel: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  negativePanel: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  correctionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  correctionTextWrap: {
    flex: 1,
  },
  correctionTitle: {
    color: '#EA580C',
    fontSize: 14.5,
    fontWeight: '900',
  },
  negativeTitle: {
    color: '#DC2626',
    fontSize: 14.5,
    fontWeight: '900',
  },
  correctionText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  correctionMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  copyRequestButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 17,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  copyRequestText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 6,
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
  secondaryButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 7,
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
  inlineDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
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
  dateSelectField: {
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
    borderColor: '#D1D5DB',
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
  dealerSelectButton: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
  },
  infoBlock: {
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
  noWorkButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  noWorkButtonText: {
    marginLeft: 8,
    color: '#334155',
    fontWeight: '900',
    fontSize: 13,
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
  reportActionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reportActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginHorizontal: 4,
  },
  reportActionText: {
    marginLeft: 7,
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '900',
  },
  reportPreviewCard: {
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 13,
    backgroundColor: '#EEF2FF',
    marginBottom: 12,
  },
  reportPreviewTitle: {
    color: '#312E81',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },
  reportPreviewText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
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
