import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
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

const getDateRange = () => {
  const today = moment();
  const start = today.clone().subtract(180, 'days').format('YYYY-MM-DD');
  const end = today.clone().add(180, 'days').format('YYYY-MM-DD');
  return { start, end };
};

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
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const { start, end } = getDateRange();
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
  }, [authToken]);

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
            request.purpose,
            meeting.creatorName,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        })
      : meetings;

    return visible
      .filter((meeting) => getMeetingGroup(meeting) === activeFilter)
      .sort((a, b) => {
        const aDate = `${getRequest(a).meetingDate || ''} ${getRequest(a).meetingTime || ''}`;
        const bDate = `${getRequest(b).meetingDate || ''} ${getRequest(b).meetingTime || ''}`;
        return activeFilter === 'completed' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
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
    const attendeeCount = request.expectedAttendeeCount
      || (Array.isArray(item.expectedAttendees) ? item.expectedAttendees.length : item.expectedAttendees)
      || 0;
    const statusColors = getSoftStatusColor(status);

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
              {request.meetingDate || 'Date pending'} {request.meetingTime ? `at ${request.meetingTime}` : ''}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" style={styles.detailIcon} />
            <Text style={styles.detailText} numberOfLines={1}>
              {[request.city, request.state].filter(Boolean).join(', ') || request.location || 'Location pending'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.footerPill, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people-outline" size={13} color="#4F46E5" />
            <Text style={[styles.footerPillText, { color: '#4F46E5' }]}>{attendeeCount} expected</Text>
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
        <View>
          <Text style={styles.headerTitle}>Meetings</Text>
          <Text style={styles.headerSubtitle}>Create requests and finish meeting actions</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('NewMeeting', { authToken })}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
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
          placeholder="Search by city, reference, purpose"
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
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
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
});

export default MeetingsList;
