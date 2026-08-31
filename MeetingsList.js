import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import moment from 'moment';
import {
  MEETING_STATUSES,
  getStatusColor,
  getStatusLabel,
  listMeetings,
} from './utils/meetingApi';

const filters = [
  { key: 'needsAction', label: 'Needs Action' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
];

const monthOptions = moment.months().map((label, index) => ({ label, value: index }));
const yearOptions = [2026, 2027, 2028, 2029, 2030];

const getMeetingId = (meeting) => meeting?.id || meeting?.meetingId;
const getRequest = (meeting) => meeting?.request || meeting || {};
const getStatus = (meeting) => meeting?.status || meeting?.meetingStatus || MEETING_STATUSES.DRAFT;

const getSoftStatusColor = (status) => {
  const norm = status ? String(status).trim().replace(/[\s-]+/g, '_').toUpperCase() : 'DRAFT';
  switch (norm) {
    case 'DRAFT':
      return { bg: '#F1F5F9', text: '#475569' };
    case 'PENDING_APPROVAL':
      return { bg: '#FFFBEB', text: '#D97706' };
    case 'APPROVED':
      return { bg: '#EFF6FF', text: '#1D4ED8' };
    case 'EXECUTED':
      return { bg: '#F5F3FF', text: '#6D28D9' };
    case 'EXPENSE_SUBMITTED':
      return { bg: '#ECFEFF', text: '#0E7490' };
    case 'REPORT_SUBMITTED':
      return { bg: '#EEF2FF', text: '#4338CA' };
    case 'CLOSED':
      return { bg: '#ECFDF5', text: '#047857' };
    case 'REJECTED':
    case 'CANCELLED':
      return { bg: '#FEF2F2', text: '#B91C1C' };
    case 'CORRECTION_REQUIRED':
      return { bg: '#FFF7ED', text: '#C2410C' };
    default:
      return { bg: '#F3F4F6', text: '#374151' };
  }
};

const getDateRange = (month, year) => {
  const selected = moment({ year, month, day: 1 });
  const start = selected.clone().startOf('month').format('YYYY-MM-DD');
  const end = selected.clone().endOf('month').format('YYYY-MM-DD');
  return { start, end };
};

const formatCardTime = (time) => {
  if (!time) return '';
  const parsed = moment(String(time), ['HH:mm:ss', 'HH:mm'], true);
  return parsed.isValid() ? parsed.format('hh:mm A') : String(time);
};

const getMeetingDateTimeValue = (meeting) => {
  const request = getRequest(meeting);
  const value = [request.meetingDate, request.meetingTime].filter(Boolean).join(' ').trim();
  const parsed = moment(value, [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    moment.ISO_8601,
  ], true);

  return parsed.isValid() ? parsed.valueOf() : null;
};

const isAttendeePresent = (attendee = {}) => Boolean(attendee.present || attendee.attended || attendee.actualAttendance);
const getAttendeeName = (attendee = {}) => attendee.name
  || attendee.attendeeName
  || attendee.customerName
  || attendee.contractorName
  || attendee.mobileNumber
  || attendee.mobile
  || '';

const getMeetingGroup = (meeting) => {
  const status = getStatus(meeting);
  const meetingDate = getRequest(meeting).meetingDate;
  const isTodayOrPast = meetingDate ? moment(meetingDate).isSameOrBefore(moment(), 'day') : true;

  if ([
    MEETING_STATUSES.REPORT_SUBMITTED,
    MEETING_STATUSES.CLOSED,
    MEETING_STATUSES.REJECTED,
    MEETING_STATUSES.CANCELLED,
  ].includes(status)) {
    return 'completed';
  }

  if ([
    MEETING_STATUSES.DRAFT,
    MEETING_STATUSES.CORRECTION_REQUIRED,
    MEETING_STATUSES.EXECUTED,
    MEETING_STATUSES.EXPENSE_SUBMITTED,
  ].includes(status)) {
    return 'needsAction';
  }

  if (status === MEETING_STATUSES.APPROVED) {
    return isTodayOrPast ? 'needsAction' : 'scheduled';
  }

  return 'scheduled';
};

const MeetingsList = ({ authToken }) => {
  const navigation = useNavigation();
  const [meetings, setMeetings] = useState([]);
  const [activeFilter, setActiveFilter] = useState('needsAction');
  const [selectedMonth, setSelectedMonth] = useState(moment().month());
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const { start, end } = getDateRange(selectedMonth, selectedYear);
      const data = await listMeetings({
        authToken,
        scope: 'mine',
        start,
        end,
      });
      setMeetings(data);
    } catch (fetchError) {
      console.error('Error fetching meetings:', fetchError.response?.data || fetchError.message);
      setMeetings([]);
      setError('Meeting data is unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, selectedMonth, selectedYear]);

  useFocusEffect(
    useCallback(() => {
      fetchMeetings();
    }, [fetchMeetings])
  );

  const summary = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return {
      today: meetings.filter((meeting) => getRequest(meeting).meetingDate === today).length,
      needsAction: meetings.filter((meeting) => getMeetingGroup(meeting) === 'needsAction').length,
      scheduled: meetings.filter((meeting) => getMeetingGroup(meeting) === 'scheduled').length,
      completed: meetings.filter((meeting) => getMeetingGroup(meeting) === 'completed').length,
    };
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const visible = query
      ? meetings.filter((meeting) => {
          const request = getRequest(meeting);
          return [
            request.meetingType,
            request.city,
            request.state,
            request.location,
            request.referenceName,
            meeting.creatorName,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        })
      : meetings;

    return visible
      .filter((meeting) => getMeetingGroup(meeting) === activeFilter)
      .sort((a, b) => {
        const aDateTime = getMeetingDateTimeValue(a);
        const bDateTime = getMeetingDateTimeValue(b);

        if (aDateTime === null) return bDateTime === null ? 0 : 1;
        if (bDateTime === null) return -1;

        const difference = aDateTime - bDateTime;
        return activeFilter === 'completed' ? -difference : difference;
      });
  }, [activeFilter, meetings, searchText]);

  const SummaryCard = ({ title, value, icon, color }) => (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
      <View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderMeetingCard = ({ item }) => {
    const request = getRequest(item);
    const status = getStatus(item);
    const meetingId = getMeetingId(item);
    const meetingGroup = getMeetingGroup(item);
    const attendeeCount = request.expectedAttendeeCount
      || (Array.isArray(item.expectedAttendees) ? item.expectedAttendees.length : item.expectedAttendees)
      || 0;
    const attendedCount = item.actualAttendeeCount
      || (Array.isArray(item.attendees) ? item.attendees.filter(isAttendeePresent).length : 0);
    const attendedNames = Array.isArray(item.attendees)
      ? item.attendees
        .filter(isAttendeePresent)
        .map(getAttendeeName)
        .filter(Boolean)
        .join(', ')
      : '';
    const statusColors = getSoftStatusColor(status);
    const timeLabel = formatCardTime(request.meetingTime);

    return (
      <TouchableOpacity
        style={[styles.meetingCard, { borderLeftColor: getStatusColor(status) }]}
        onPress={() => meetingId && navigation.navigate('MeetingDetail', { meetingId, authToken })}
        disabled={!meetingId}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.meetingTitle}>{request.meetingType || 'Meeting'} Meeting</Text>
            <Text style={styles.meetingSubTitle}>
              <Ionicons name="person-outline" size={12} color="#64748B" /> {request.referenceName || item.creatorName || 'No reference added'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>{item.statusLabel || item.stageLabel || getStatusLabel(status)}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" style={styles.detailIcon} />
            <Text style={styles.detailText} numberOfLines={1}>
              {request.meetingDate || 'Date pending'} {timeLabel ? `at ${timeLabel}` : ''}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" style={styles.detailIcon} />
            <Text style={styles.detailText} numberOfLines={1}>
              {[request.city, request.state].filter(Boolean).join(', ') || request.location || 'Location pending'}
            </Text>
          </View>
          {meetingGroup === 'completed' && attendedNames ? (
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#059669" style={styles.detailIcon} />
              <Text style={styles.detailText} numberOfLines={1}>{attendedNames}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.footerPill, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people-outline" size={13} color="#4F46E5" />
            <Text style={[styles.footerPillText, { color: '#4F46E5' }]}>
              {meetingGroup === 'completed' ? `${attendedCount} attended` : `${attendeeCount} expected`}
            </Text>
          </View>
          <View style={[styles.footerPill, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="wallet-outline" size={13} color="#059669" />
            <Text style={[styles.footerPillText, { color: '#059669' }]}>Rs. {request.expectedBudget || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={23} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meetings</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.monthFilterButton}
            onPress={() => {
              setOpenFilterDropdown(null);
              setIsFilterOpen(true);
            }}
          >
            <Ionicons name="filter-outline" size={16} color="#4F46E5" />
            <Text style={styles.monthFilterText}>{moment({ month: selectedMonth }).format('MMM')} {selectedYear}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.scopeTabs}>
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.scopeTab, isActive && styles.scopeTabActive]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[styles.scopeText, isActive && styles.scopeTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard title="Today" value={summary.today} icon="today-outline" color="#2563EB" />
        <SummaryCard title="Needs Action" value={summary.needsAction} icon="alert-circle-outline" color="#EA580C" />
        <SummaryCard title="Scheduled" value={summary.scheduled} icon="calendar-outline" color="#4F46E5" />
        <SummaryCard title="Completed" value={summary.completed} icon="checkmark-done-outline" color="#059669" />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by city or reference"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.centerText}>Loading meetings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMeetings}
          keyExtractor={(item, index) => String(getMeetingId(item) || index)}
          renderItem={renderMeetingCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No meetings found</Text>
              <Text style={styles.emptyText}>{error || `No ${filters.find((filter) => filter.key === activeFilter)?.label || 'matching'} meetings found. Create a new meeting request to start the workflow.`}</Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('NewMeeting', { authToken })}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={isFilterOpen} transparent animationType="fade" onRequestClose={() => setIsFilterOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsFilterOpen(false)}>
          <TouchableOpacity style={styles.filterSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter Month</Text>
              <TouchableOpacity style={styles.filterCloseButton} onPress={() => setIsFilterOpen(false)}>
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Month</Text>
              <TouchableOpacity
                style={[styles.filterDropdown, openFilterDropdown === 'month' && styles.filterDropdownActive]}
                onPress={() => setOpenFilterDropdown((current) => (current === 'month' ? null : 'month'))}
              >
                <Text style={styles.filterDropdownValue}>{monthOptions.find((month) => month.value === selectedMonth)?.label}</Text>
                <Ionicons name={openFilterDropdown === 'month' ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
              </TouchableOpacity>
              {openFilterDropdown === 'month' ? (
                <ScrollView style={styles.dropdownMenu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {monthOptions.map((month) => {
                    const isSelected = selectedMonth === month.value;
                    return (
                      <TouchableOpacity
                        key={month.value}
                        style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                        onPress={() => {
                          setSelectedMonth(month.value);
                          setOpenFilterDropdown(null);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>{month.label}</Text>
                        {isSelected ? <Ionicons name="checkmark-circle" size={18} color="#4F46E5" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Year</Text>
              <TouchableOpacity
                style={[styles.filterDropdown, openFilterDropdown === 'year' && styles.filterDropdownActive]}
                onPress={() => setOpenFilterDropdown((current) => (current === 'year' ? null : 'year'))}
              >
                <Text style={styles.filterDropdownValue}>{selectedYear}</Text>
                <Ionicons name={openFilterDropdown === 'year' ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
              </TouchableOpacity>
              {openFilterDropdown === 'year' ? (
                <ScrollView style={styles.dropdownMenu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {yearOptions.map((year) => {
                    const isSelected = selectedYear === year;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                        onPress={() => {
                          setSelectedYear(year);
                          setOpenFilterDropdown(null);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>{year}</Text>
                        {isSelected ? <Ionicons name="checkmark-circle" size={18} color="#4F46E5" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
            <TouchableOpacity style={styles.applyFilterButton} onPress={() => setIsFilterOpen(false)}>
              <Text style={styles.applyFilterText}>Apply Filter</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthFilterButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  monthFilterText: {
    marginHorizontal: 6,
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '900',
  },
  scopeTabs: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  scopeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  scopeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  scopeText: {
    color: '#475569',
    fontWeight: '700',
  },
  scopeTextActive: {
    color: '#4F46E5',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  summaryCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  summaryTitle: {
    fontSize: 12,
    color: '#64748B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  meetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  meetingSubTitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    color: '#475569',
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    marginTop: 4,
  },
  footerPillText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    marginTop: 10,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 24,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  filterSheetTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  filterCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  filterLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  filterField: {
    marginBottom: 10,
  },
  filterDropdown: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7DCEA',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterDropdownActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  filterDropdownValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  dropdownMenu: {
    maxHeight: 190,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  dropdownOptionText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },
  dropdownOptionTextActive: {
    color: '#4F46E5',
  },
  applyFilterButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyFilterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});

export default MeetingsList;
