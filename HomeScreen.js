import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import * as Location from 'expo-location';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import { getPendingCustomers } from './utils/offlineStorage';

import RecentVisits from './components/RecentVisits';
import { Greeting } from './components/HomeComponents';
import CreateCustomerComponent from './CreateCustomerComponent';
import { ConnectivityStatusIcons } from './components/ConnectivityStatus';
import PendingCustomers from './components/PendingCustomers';

const HomeScreen = ({ authToken }) => {
  const navigation = useNavigation();
  const [visitsData, setVisitsData] = useState([]);
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

  const updateLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      const employeeId = await AsyncStorage.getItem('employeeId');
      if (!employeeId) {
        console.error('Employee ID not found');
        return;
      }

      const response = await axios.put(
        `https://api.gajkesaristeels.in/employee/updateLiveLocation?id=${employeeId}&latitude=${location.coords.latitude}&longitude=${location.coords.longitude}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data === 'Location Updated!') {
        console.log('Location updated successfully on server');
      } else {
        console.log('Unexpected response when updating location:', response.data);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      updateLocation();
      fetchVisitsData();
      fetchNotifications();
      fetchDailyPricingCount();
      checkPendingRequests();
      return () => {};
    }, [updateLocation])
  );

  useEffect(() => {
    fetchEmployeeData();
    generateGreeting();
    checkTravelModeQuestion();
    checkPendingRequests();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVisitsData();
      fetchNotifications();
      checkPendingRequests();
    }, [])
  );

  const checkTravelModeQuestion = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      console.log('Checking for employee ID:', employeeId); // Debug log

      const response = await axios.get(
        `https://api.gajkesaristeels.in/attendance-log/getByDate?date=${today}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        const currentEmployeeData = response.data.find(employee => employee.employeeId === parseInt(employeeId));

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
          console.error('Case 4: Current employee data not found, showing modal');
          setIsTravelModeModalVisible(true);
        }
      } else {
        console.error('Unexpected response format, showing modal');
        setIsTravelModeModalVisible(true);
      }
    } catch (error) {
      console.error('Error checking travel mode:', error);
      setIsTravelModeModalVisible(true);
    }
  }, [authToken]);

  const handleTravelModeSelection = async (mode) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.put(
        `https://api.gajkesaristeels.in/attendance-log/editVehicle?id=${employeeId}&date=${today}&vehicleType=${mode}&isDefault=false`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.data.includes('Vehicle type updated successfully')) {
        setTravelMode(mode);
        setIsTravelModeModalVisible(false);
      } else {
        throw new Error('Unexpected response when updating vehicle type');
      }
    } catch (error) {
      console.error('Error updating travel mode:', error);
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

      const response = await axios.get(`https://api.gajkesaristeels.in/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${startDateFormatted}&end=${endDateFormatted}`, {
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

  const fetchEmployeeData = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');

      const response = await axios.get(`https://api.gajkesaristeels.in/employee/getById?id=${employeeId}`, {
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

  const fetchNotifications = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const today = moment();
      const startDate = today.clone().subtract(2, 'days').format('YYYY-MM-DD');
      const endDate = today.clone().add(1, 'days').format('YYYY-MM-DD');

      // Visit notifications
      const response = await axios.get(
        `https://api.gajkesaristeels.in/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${startDate}&end=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const assignedVisits = response.data.filter(visit => visit.isSelfGenerated === false);

      const unreadVisitTasks = assignedVisits.filter(visit =>
        !visit.checkoutLatitude && !visit.checkoutLongitude && !visit.checkoutDate && !visit.checkoutTime
      ).length;

      // Birthday notifications for today
      const birthdayStart = today.clone().format('YYYY-MM-DD');
      const birthdayEnd = birthdayStart;

      const birthdayResponse = await axios.get(
        `https://api.gajkesaristeels.in/store/getByDobDateRange?startDate=${birthdayStart}&endDate=${birthdayEnd}`,
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
        `https://api.gajkesaristeels.in/brand/getByDateRangeForEmployee?start=${today}&end=${today}&id=${employeeId}`,
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

    const totalVisits = Array.isArray(visitsData) ? visitsData.length : 0;
    const totalVisitsToday = Array.isArray(visitsData) ? visitsData.filter((visit) => visit.visit_date === today).length : 0;
    const totalVisitsThisWeek = Array.isArray(visitsData) ? visitsData.filter((visit) => visit.visit_date >= currentWeekStartFormatted).length : 0;

    return {
      totalVisits,
      totalVisitsToday,
      totalVisitsThisWeek,
    };
  };

  const { totalVisits, totalVisitsToday, totalVisitsThisWeek } = calculateMetrics();

  const openCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(true);
  };

  const closeCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(false);
  };

  const handleCustomerCreated = () => {
    fetchVisitsData();
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
            <Ionicons name="bicycle" size={24} color="#6C63FF" />
            <Text style={styles.modeButtonText}>2 Wheeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleTravelModeSelection('4_WHEELER')}
          >
            <Ionicons name="car" size={24} color="#6C63FF" />
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
      <ScrollView style={styles.container}>
        <Greeting 
          firstName={employeeFirstName} 
          message={greetingMessage}
          onProfilePress={() => navigation.navigate('UserProfile', { authToken })}
          onNotificationPress={() => navigation.navigate('Notifications1', { authToken })}
          connectivityComponent={<ConnectivityStatusIcons />}
        />

        <DailyPricingIndicator />
        
        <TouchableOpacity
          style={styles.yesterdayButton}
          onPress={() => navigation.navigate('YesterdayStatsScreen', { authToken })}
        >
          <Ionicons name="stats-chart-outline" size={20} color="#6C63FF" />
          <Text style={styles.yesterdayButtonText}>Yesterday</Text>
        </TouchableOpacity>

        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <MetricCard title="Total Visits" value={totalVisits} icon="bar-chart-outline" />
            <MetricCard title="Today's Visits" value={totalVisitsToday} icon="today-outline" />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard title="This Week" value={totalVisitsThisWeek} icon="calendar-outline" />
            <MetricCard title="Completed" value={totalVisits} icon="checkmark-circle-outline" />
          </View>
        </View>

        <RecentVisits
          visits={visitsData}
          onVisitPress={(visitId) => navigation.navigate('VisitScreen', { visitId, authToken })}
          style={styles.recentVisits}
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
                  fetchVisitsData();
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
      </ScrollView>
      <TravelModeModal />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingTop: 40,
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
    marginHorizontal: 20,
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
