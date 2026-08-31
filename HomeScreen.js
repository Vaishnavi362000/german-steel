import { API_BASE_URL } from './config/api';
import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from 'react-native-modal';
import { getPendingCustomers } from './utils/offlineStorage';
import { fetchMobileHomeSummary, shouldUseLegacyHomeFallback } from './utils/optimizedVisitApi';
import { fetchMyMonthlySalesTargetSummary } from './utils/salesTargetApi';
import LocationService from './LocationService';

import RecentVisits from './components/RecentVisits';
import { Greeting } from './components/HomeComponents';
import CreateCustomerComponent from './CreateCustomerComponent';
import { ConnectivityStatusIcons } from './components/ConnectivityStatus';
import PendingCustomers from './components/PendingCustomers';

const HomeScreen = ({ authToken }) => {
  const navigation = useNavigation();
  const [visitsData, setVisitsData] = useState([]);
  const [homeMetrics, setHomeMetrics] = useState(null);
  const [employeeFirstName, setEmployeeFirstName] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [unreadTasks, setUnreadTasks] = useState(0);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [travelMode, setTravelMode] = useState(null);
  const [isTravelModeModalVisible, setIsTravelModeModalVisible] = useState(false);
  const [dailyPricingCount, setDailyPricingCount] = useState(0);
  const [dailyPricingMessage, setDailyPricingMessage] = useState('');
  const [isPendingModalVisible, setIsPendingModalVisible] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [monthlyTargetSummary, setMonthlyTargetSummary] = useState(null);
  const [isTargetModalVisible, setIsTargetModalVisible] = useState(false);

  const updateLocation = useCallback(async () => {
    try {
      const currentLocation = await LocationService.updateCurrentLocation();
      if (currentLocation) {
        setLocation(currentLocation);
      }
    } catch (error) {
      console.warn('Live location refresh skipped:', error?.message || error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      updateLocation();
      refreshHomeData();
      checkPendingRequests();
      return () => { };
    }, [updateLocation])
  );

  useEffect(() => {
    fetchEmployeeData();
    generateGreeting();
    checkTravelModeQuestion();
    checkPendingRequests();
  }, []);

  const checkTravelModeQuestion = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      console.log('Checking for employee ID:', employeeId); // Debug log

      const response = await axios.get(
        `${API_BASE_URL}/attendance-log/getByDate?date=${today}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const attendanceRows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.content)
          ? response.data.content
          : [];

      if (attendanceRows.length > 0) {
        const normalizedEmployeeId = String(employeeId ?? '');
        const currentEmployeeData = attendanceRows.find((employee) => {
          const rowEmployeeId = employee?.employeeId
            ?? employee?.employee?.employeeId
            ?? employee?.employee?.id
            ?? employee?.id;
          return String(rowEmployeeId ?? '') === normalizedEmployeeId;
        });

        if (currentEmployeeData) {
          console.log('Employee data found:', currentEmployeeData); // Debug log

          // Check if isDefault is strictly false (boolean)
          if (currentEmployeeData.isDefault === false) {
            console.log('Case 2: isDefault is false, user has set preference');
            setIsTravelModeModalVisible(false);
            if (currentEmployeeData.vehicleType) {
              setTravelMode(currentEmployeeData.vehicleType);
            }
          } else {
            console.log('Case 1 or 3: Showing modal for user selection');
            setIsTravelModeModalVisible(true);
          }
        } else {
          console.warn('No attendance record found for the current employee; showing travel mode prompt.');
          setIsTravelModeModalVisible(true);
        }
      } else {
        console.error('Unexpected response format, showing modal');
        setIsTravelModeModalVisible(true);
      }
    } catch (error) {
      const status = error.response?.status;
      console.error('Error checking travel mode:', {
        status,
        data: error.response?.data,
        message: error.message,
      });

      // A role that cannot access this optional endpoint should not be
      // trapped in a repeated travel-mode prompt.
      if (status === 403) {
        setIsTravelModeModalVisible(false);
        return;
      }

      setIsTravelModeModalVisible(true);
    }
  }, [authToken]);

  const handleTravelModeSelection = async (mode) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.put(
        `${API_BASE_URL}/attendance-log/editVehicle?id=${employeeId}&date=${today}&vehicleType=${mode}&isDefault=false`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.status >= 200 && response.status < 300) {
        setTravelMode(mode);
        setIsTravelModeModalVisible(false);
      } else {
        throw new Error('Unexpected response when updating vehicle type');
      }
    } catch (error) {
      const status = error.response?.status;
      console.error('Error updating travel mode:', {
        status,
        data: error.response?.data,
        message: error.message,
      });

      if (status === 403) {
        setIsTravelModeModalVisible(false);
        Alert.alert(
          'Travel mode unavailable',
          'Your account is not permitted to save travel mode on this server yet. You can continue using the app.'
        );
        return;
      }

      Alert.alert('Error', 'Failed to update travel mode. Please try again.');
    }
  };

  const fetchVisitsData = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      const startDateFormatted = startDate.toISOString().split('T')[0];
      const endDateFormatted = today.toISOString().split('T')[0];

      const response = await axios.get(`${API_BASE_URL}/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${startDateFormatted}&end=${endDateFormatted}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const sortedVisits = response.data.sort((a, b) => {
        if (a.updatedAt !== b.updatedAt) {
          return b.updatedAt.localeCompare(a.updatedAt);
        } else {
          return b.updatedTime.localeCompare(a.updatedTime);
        }
      });

      const completedVisits = sortedVisits.filter((visit) => {
        return visit.checkoutLatitude && visit.checkoutLongitude && visit.checkoutDate && visit.checkoutTime;
      });

      setVisitsData(completedVisits);
    } catch (error) {
      console.error('Error fetching visits data:', error);
    }
  };

  const fetchOptimizedHomeSummary = async () => {
    const employeeId = await AsyncStorage.getItem('employeeId');
    if (!employeeId) throw new Error('Employee ID not found');

    const summary = await fetchMobileHomeSummary({ employeeId, authToken });
    const dailyPricingCount = Number(summary?.dailyPricingCount || 0);
    const completedVisits = Number(summary?.completedVisits ?? summary?.totalVisits ?? 0);

    setHomeMetrics({
      totalVisits: Number(summary?.totalVisits || 0),
      totalVisitsToday: Number(summary?.totalVisitsToday || 0),
      totalVisitsThisWeek: Number(summary?.totalVisitsThisWeek || 0),
      completedVisits,
    });
    setVisitsData(Array.isArray(summary?.recentCompletedVisits) ? summary.recentCompletedVisits : []);
    setDailyPricingCount(dailyPricingCount);
    setDailyPricingMessage(
      summary?.dailyPricingMessage
      || (dailyPricingCount < 5
        ? `Add ${5 - dailyPricingCount} more daily pricing entries`
        : 'Great job! You have added 5 or more daily pricing entries'),
    );

    await fetchNotifications(Number(summary?.unreadVisitTasks || 0));
  };

  const fetchMonthlyTarget = async () => {
    try {
      setMonthlyTargetSummary(await fetchMyMonthlySalesTargetSummary({ authToken }));
    } catch (error) {
      // Target assignment can be deployed after the app. Do not block Home if it is not available yet.
      console.log('Monthly target summary unavailable:', error?.message || error);
      setMonthlyTargetSummary(null);
    }
  };

  const refreshHomeData = async () => {
    fetchMonthlyTarget();
    try {
      await fetchOptimizedHomeSummary();
    } catch (error) {
      if (!shouldUseLegacyHomeFallback(error)) {
        console.error('Error fetching optimized mobile home summary:', error);
        return;
      }

      // The temporary Gajkesari backend can keep serving the existing calls
      // until the German Steel optimized endpoint is deployed there.
      setHomeMetrics(null);
      await Promise.all([
        fetchVisitsData(),
        fetchNotifications(),
        fetchDailyPricingCount(),
      ]);
    }
  };

  const fetchEmployeeData = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');

      const response = await axios.get(`${API_BASE_URL}/employee/getById?id=${employeeId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      setEmployeeFirstName(response.data.firstName);
      generateGreeting(response.data.firstName);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const fetchNotifications = async (unreadVisitTasksFromSummary) => {
    try {
      const today = moment();
      let unreadVisitTasks = unreadVisitTasksFromSummary;

      if (unreadVisitTasks === undefined) {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const startDate = today.clone().subtract(2, 'days').format('YYYY-MM-DD');
        const endDate = today.clone().add(1, 'days').format('YYYY-MM-DD');
        const response = await axios.get(
          `${API_BASE_URL}/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${startDate}&end=${endDate}`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );

        const assignedVisits = response.data.filter(visit => visit.isSelfGenerated === false);
        unreadVisitTasks = assignedVisits.filter(visit =>
          !visit.checkoutLatitude && !visit.checkoutLongitude && !visit.checkoutDate && !visit.checkoutTime,
        ).length;
      }

      // Birthday notifications for today
      const birthdayStart = today.clone().format('YYYY-MM-DD');
      const birthdayEnd = birthdayStart;

      const birthdayResponse = await axios.get(
        `${API_BASE_URL}/store/getByDobDateRange?startDate=${birthdayStart}&endDate=${birthdayEnd}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log('Birthday Notifications Response (HomeScreen):', JSON.stringify(birthdayResponse.data, null, 2));

      const birthdayCount = Array.isArray(birthdayResponse.data) ? birthdayResponse.data.length : 0;

      // Total notifications include visit tasks + birthdays
      setUnreadTasks(unreadVisitTasks + birthdayCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchDailyPricingCount = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const today = new Date().toISOString().split('T')[0];

      const response = await axios.get(
        `${API_BASE_URL}/brand/getByDateRangeForEmployee?start=${today}&end=${today}&id=${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const count = Array.isArray(response.data) ? response.data.length : 0;
      setDailyPricingCount(count);

      if (count < 5) {
        setDailyPricingMessage(`Add ${5 - count} more daily pricing entries`);
      } else {
        setDailyPricingMessage('Great job! You have added 5 or more daily pricing entries');
      }
    } catch (error) {
      console.error('Error fetching daily pricing count:', error);
    }
  };

  const generateGreeting = (firstName) => {
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = '';
    let emoji = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good Morning';
      emoji = '🌅';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good Afternoon';
      emoji = '☀️';
    } else {
      timeGreeting = 'Good Evening';
      emoji = '🌙';
    }

    const greetings = [
      { greeting: 'Namaskar', emoji: '🙏' },
      { greeting: 'Hello', emoji: '🕌' },
      { greeting: 'Vanakkam', emoji: '🙏' },
      { greeting: 'Namaste', emoji: '🙏' },
      { greeting: 'Hey', emoji: '🙏' },
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    const selectedGreeting = Math.random() < 0.5 ? timeGreeting : randomGreeting.greeting;
    const selectedEmoji = Math.random() < 0.5 ? emoji : randomGreeting.emoji;

    setGreetingMessage(`${selectedGreeting}, ${firstName}! ${selectedEmoji}`);
  };

  const calculateMetrics = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    const currentWeekStartFormatted = currentWeekStart.toISOString().split('T')[0];

    if (homeMetrics) return homeMetrics;

    const totalVisits = Array.isArray(visitsData) ? visitsData.length : 0;
    const totalVisitsToday = Array.isArray(visitsData) ? visitsData.filter((visit) => visit.visit_date === today).length : 0;
    const totalVisitsThisWeek = Array.isArray(visitsData) ? visitsData.filter((visit) => visit.visit_date >= currentWeekStartFormatted).length : 0;

    return {
      totalVisits,
      totalVisitsToday,
      totalVisitsThisWeek,
      completedVisits: totalVisits,
    };
  };

  const { totalVisits, totalVisitsToday, totalVisitsThisWeek, completedVisits } = calculateMetrics();

  const openCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(true);
  };

  const closeCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(false);
  };

  const handleCustomerCreated = () => {
    refreshHomeData();
    checkPendingRequests();
  };

  const MetricCard = ({ title, value, icon }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricIconContainer}>
        <Ionicons name={icon} size={24} color="#4F46E5" />
      </View>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
    </View>
  );

  const DailyPricingIndicator = () => {
    const isComplete = dailyPricingCount >= 5;

    return (
      <View style={[
        styles.dailyPricingIndicator,
        !isComplete && styles.dailyPricingIndicatorIncomplete
      ]}>
        <View style={styles.dailyPricingContent}>
          <Ionicons
            name={isComplete ? "checkmark-circle-outline" : "alert-circle-outline"}
            size={24}
            color={isComplete ? "#4F46E5" : "#EF4444"}
          />
          <Text style={[
            styles.dailyPricingMessage,
            !isComplete && styles.dailyPricingMessageIncomplete
          ]}>
            {dailyPricingMessage}
          </Text>
        </View>
        {!isComplete && (
          <TouchableOpacity
            style={styles.addPricingButton}
            onPress={() => navigation.navigate('PricingScreen', { authToken })}
          >
            <Text style={styles.addPricingButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const TravelModeModal = () => (
    <Modal
      isVisible={isTravelModeModalVisible}
      backdropOpacity={0.5}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      style={styles.modal}
    >
      <View style={styles.blurView}>
        <Text style={styles.modalTitle}>Select Travel Mode</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleTravelModeSelection('2_WHEELER')}
          >
            <Ionicons name="bicycle" size={24} color="#4F46E5" />
            <Text style={styles.modeButtonText}>2 Wheeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleTravelModeSelection('4_WHEELER')}
          >
            <Ionicons name="car" size={24} color="#4F46E5" />
            <Text style={styles.modeButtonText}>4 Wheeler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const checkPendingRequests = async () => {
    const pendingCustomers = await getPendingCustomers();
    setHasPendingRequests(pendingCustomers.length > 0);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Greeting
          firstName={employeeFirstName}
          message={greetingMessage}
          onProfilePress={() => navigation.navigate('UserProfile', { authToken })}
          onNotificationPress={() => navigation.navigate('Notifications1', { authToken })}
          connectivityComponent={<ConnectivityStatusIcons />}
          unreadTasks={unreadTasks}
        />

        <View style={styles.homeContent}>
          <DailyPricingIndicator />

          <TouchableOpacity
            style={styles.yesterdayButton}
            onPress={() => navigation.navigate('YesterdayStatsScreen', { authToken })}
          >
            <Ionicons name="stats-chart-outline" size={20} color="#4F46E5" />
            <Text style={styles.yesterdayButtonText}>Yesterday</Text>
          </TouchableOpacity>

          <View style={styles.metricsContainer}>
            <View style={styles.metricsRow}>
              <MetricCard title="Total Visits" value={totalVisits} icon="bar-chart-outline" />
              <MetricCard title="Today's Visits" value={totalVisitsToday} icon="today-outline" />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard title="This Week" value={totalVisitsThisWeek} icon="calendar-outline" />
              <MetricCard title="Completed" value={completedVisits} icon="checkmark-circle-outline" />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setIsTargetModalVisible(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View this month's sales target"
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1', '#818CF8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.monthlyTargetCard}
            >
              <View style={styles.monthlyTargetIcon}>
                <Ionicons name="speedometer-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.monthlyTargetCopy}>
                <Text style={styles.monthlyTargetTitle}>{moment().format('MMMM')} target</Text>
                <Text style={styles.monthlyTargetCaption}>
                  {monthlyTargetSummary?.targetTons > 0 ? 'Tap to view progress in tons' : 'No monthly target assigned'}
                </Text>
              </View>
              <View style={styles.monthlyTargetValueContainer}>
                <Text style={styles.monthlyTargetValue}>
                  {monthlyTargetSummary?.targetTons > 0 ? `${monthlyTargetSummary.targetTons} T` : '—'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={styles.monthlyTargetArrow} />
            </LinearGradient>
          </TouchableOpacity>

          <RecentVisits
            visits={visitsData}
            onVisitPress={(visitId) => navigation.navigate('VisitScreen', { visitId, authToken })}
          />

          <TouchableOpacity
            style={styles.addButton}
            onPress={openCreateCustomerModal}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {hasPendingRequests && (
            <TouchableOpacity
              style={styles.pendingButton}
              onPress={() => setIsPendingModalVisible(true)}
            >
              <Ionicons name="time-outline" size={24} color="#4F46E5" />
              <Text style={styles.pendingButtonText}>View Pending Requests</Text>
            </TouchableOpacity>
          )}

          {location && (
            <Text style={styles.locationInfo}>
              Location updated
            </Text>
          )}
        </View>

        <Modal
          isVisible={isPendingModalVisible}
          onBackdropPress={() => setIsPendingModalVisible(false)}
          style={styles.modal}
          backdropOpacity={0.5}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pending Requests</Text>
              <TouchableOpacity
                onPress={() => setIsPendingModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.pendingRequestsContainer}>
              <PendingCustomers
                authToken={authToken}
                onCustomerCreated={() => {
                  refreshHomeData();
                  checkPendingRequests();
                  if (!hasPendingRequests) {
                    setIsPendingModalVisible(false);
                  }
                }}
              />
            </View>
          </View>
        </Modal>

      <CreateCustomerComponent
          isVisible={isCreateCustomerModalOpen}
          onClose={closeCreateCustomerModal}
          authToken={authToken}
          onCustomerCreated={handleCustomerCreated}
          navigation={navigation}
      />
      <Modal
        isVisible={isTargetModalVisible}
        onBackdropPress={() => setIsTargetModalVisible(false)}
        onBackButtonPress={() => setIsTargetModalVisible(false)}
        style={styles.targetModal}
      >
        <View style={styles.targetModalCard}>
          <View style={styles.targetModalHeader}>
            <View>
              <Text style={styles.targetModalTitle}>{moment().format('MMMM YYYY')} target</Text>
              <Text style={styles.targetModalSubtitle}>Sales progress for this month</Text>
            </View>
            <TouchableOpacity onPress={() => setIsTargetModalVisible(false)} style={styles.targetModalClose}>
              <Ionicons name="close" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>
          <View style={styles.targetMetricsRow}>
            <View style={styles.targetMetric}>
              <Text style={styles.targetMetricLabel}>Target by month</Text>
              <Text style={styles.targetMetricValue}>{monthlyTargetSummary?.targetTons || 0} T</Text>
            </View>
            <View style={styles.targetMetricDivider} />
            <View style={styles.targetMetric}>
              <Text style={styles.targetMetricLabel}>Target achieved</Text>
              <Text style={styles.targetMetricValue}>{monthlyTargetSummary?.achievedTons || 0} T</Text>
            </View>
          </View>
          <Text style={styles.targetProgressText}>{(Number(monthlyTargetSummary?.achievementPercent) || 0).toFixed(2)}% achieved</Text>
        </View>
      </Modal>
      </ScrollView>
      <TravelModeModal />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 108,
  },
  homeContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricsContainer: {
    marginTop: 20,
  },
  monthlyTargetCard: {
    marginTop: 8,
    marginBottom: 8,
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  monthlyTargetIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 14,
  },
  monthlyTargetCopy: { flex: 1 },
  monthlyTargetTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  monthlyTargetCaption: { marginTop: 4, fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500' },
  monthlyTargetValueContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  monthlyTargetValue: { fontSize: 16, fontWeight: '800', color: '#4F46E5' },
  monthlyTargetArrow: {
    opacity: 0.9,
  },
  targetModal: { justifyContent: 'flex-end', margin: 0 },
  targetModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  targetModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetModalTitle: { fontSize: 19, fontWeight: '800', color: '#1F2937' },
  targetModalSubtitle: { marginTop: 3, fontSize: 13, color: '#7C8494' },
  targetModalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  targetMetricsRow: { flexDirection: 'row', marginTop: 22, padding: 16, borderRadius: 14, backgroundColor: '#F7F8FF', alignItems: 'center' },
  targetMetric: { flex: 1 },
  targetMetricLabel: { fontSize: 12, color: '#6B7280' },
  targetMetricValue: { marginTop: 5, fontSize: 22, fontWeight: '800', color: '#4F46E5' },
  targetMetricDivider: { width: 1, height: 42, marginHorizontal: 12, backgroundColor: '#DDE3FF' },
  targetProgressText: { marginTop: 14, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#059669' },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  metricIconContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  metricTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  dailyPricingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  dailyPricingIndicatorIncomplete: {
    backgroundColor: '#FEE2E2',
  },
  dailyPricingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyPricingMessage: {
    marginLeft: 12,
    fontSize: 14,
    color: '#4F46E5',
    flex: 1,
  },
  dailyPricingMessageIncomplete: {
    color: '#EF4444',
  },
  addPricingButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 16,
  },
  addPricingButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  recentVisits: {
    marginTop: 20,
  },
  locationInfo: {
    marginTop: 10,
    fontSize: 14,
    color: '#4B5563',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
    width: '100%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  pendingRequestsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  pendingButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  blurView: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: '48%',
  },
  modeButtonText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#1F2937',
  },
  headerContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  yesterdayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  yesterdayButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
});

export default HomeScreen;
