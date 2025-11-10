import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as Location from 'expo-location';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import { getPendingCustomers } from '../utils/offlineStorage';

import { ConnectivityStatusIcons } from '../components/ConnectivityStatus';
import { Greeting } from '../components/HomeComponents';
import PendingCustomers from '../components/PendingCustomers';
import RecentVisits from '../components/RecentVisits';
import CreateCustomerComponent from './CreateCustomerComponent';

const HomeScreen = ({ authToken }) => {
  const navigation = useNavigation();
  const [visitsData, setVisitsData] = useState([]);
  const [employeeFirstName, setEmployeeFirstName] = useState('');
  const [employeeRole, setEmployeeRole] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('Welcome!');
  const [unreadTasks, setUnreadTasks] = useState(0);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [dailyPricingCount, setDailyPricingCount] = useState(0);
  const [dailyPricingMessage, setDailyPricingMessage] = useState('');
  const [isPendingModalVisible, setIsPendingModalVisible] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  console.log('🟣 [INIT] Component initialized with authToken:', !!authToken);

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

      // Get fresh token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Auth token not found');
        return;
      }

      const response = await axios.put(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/updateLiveLocation?id=${employeeId}&latitude=${location.coords.latitude}&longitude=${location.coords.longitude}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Bypass ngrok browser warning page
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );

      console.log('🔵 [UPDATE LOCATION] Response:', response.data);
      
      if (response.data === 'Location Updated!') {
        console.log('✅ Location updated successfully on server');
      } else {
        console.log('⚠️ Unexpected response when updating location:', response.data);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      console.log('🟢 [FOCUS EFFECT 1] Running - updating location, fetching visits, notifications, pricing');
      updateLocation();
      fetchVisitsData();
      fetchNotifications();
      fetchDailyPricingCount();
      checkPendingRequests();
      return () => {};
    }, [updateLocation])
  );

  useEffect(() => {
    console.log('🟢 [USE EFFECT] Component mounted - fetching employee data');
    fetchEmployeeData();
    checkPendingRequests();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('🟢 [FOCUS EFFECT 2] Running - fetching visits, notifications, pending requests');
      fetchVisitsData();
      fetchNotifications();
      checkPendingRequests();
    }, [])
  );

  const fetchVisitsData = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      console.log('🔵 [FETCH VISITS] Employee ID from storage:', employeeId);
      
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      const startDateFormatted = startDate.toISOString().split('T')[0];
      const endDateFormatted = today.toISOString().split('T')[0];

      // Get fresh token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('❌ [FETCH VISITS] Auth token not found');
        return;
      }

      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${startDateFormatted}&end=${endDateFormatted}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Bypass ngrok browser warning page
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });

      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [FETCH VISITS] Server returned HTML instead of JSON - possible auth/ngrok issue');
        setVisitsData([]);
        return;
      }

      console.log('🔵 [FETCH VISITS] Response data:', response.data);
      console.log('🔵 [FETCH VISITS] Total visits:', response.data?.length);

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
      // Get employee ID from AsyncStorage (set during login)
      const employeeId = await AsyncStorage.getItem('employeeId');
      
      if (!employeeId) {
        console.error('❌ [FETCH EMPLOYEE] No employee ID found in AsyncStorage');
        return;
      }
      
      // Get fresh token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('❌ [FETCH EMPLOYEE] Auth token not found');
        return;
      }
      
      console.log('🔵 [FETCH EMPLOYEE] Calling /employee/get with ID:', employeeId);

      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/get?id=${employeeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Bypass ngrok browser warning page
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      
      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [FETCH EMPLOYEE] Server returned HTML instead of JSON - using cached data from login');
        
        // Use cached data from AsyncStorage (stored during login)
        const cachedFirstName = await AsyncStorage.getItem('employeeFirstName');
        const cachedRole = await AsyncStorage.getItem('employeeRole');
        
        if (cachedFirstName) {
          setEmployeeFirstName(cachedFirstName);
          generateGreeting(cachedFirstName);
          console.log('✅ [FETCH EMPLOYEE] Using cached firstName:', cachedFirstName);
        }
        
        if (cachedRole) {
          setEmployeeRole(cachedRole);
          console.log('✅ [FETCH EMPLOYEE] Using cached role:', cachedRole);
        }
        
        return;
      }
      
      console.log('🔵 [FETCH EMPLOYEE] Full Response:', response.data);
      console.log('🔵 [FETCH EMPLOYEE] First Name from response:', response.data.firstName);
      console.log('🔵 [FETCH EMPLOYEE] Role from response:', response.data.role);
      
      const firstName = response.data.firstName;
      const role = response.data.role;
      setEmployeeFirstName(firstName);
      setEmployeeRole(role);
      
      console.log('✅ [FETCH EMPLOYEE] First Name set in state:', firstName);
      console.log('✅ [FETCH EMPLOYEE] Role set in state:', role);
      
      generateGreeting(firstName);
    } catch (error) {
      console.error('❌ [FETCH EMPLOYEE] Error fetching employee data:', error);
      console.error('❌ [FETCH EMPLOYEE] Error response:', error.response?.data);
      
      // Use cached data as fallback on error
      const cachedFirstName = await AsyncStorage.getItem('employeeFirstName');
      const cachedRole = await AsyncStorage.getItem('employeeRole');
      
      if (cachedFirstName) {
        setEmployeeFirstName(cachedFirstName);
        generateGreeting(cachedFirstName);
        console.log('✅ [FETCH EMPLOYEE] Using cached firstName on error:', cachedFirstName);
      }
      
      if (cachedRole) {
        setEmployeeRole(cachedRole);
        console.log('✅ [FETCH EMPLOYEE] Using cached role on error:', cachedRole);
      }
    }
  };

  const fetchNotifications = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const today = moment();
      const startDate = today.clone().subtract(2, 'days').format('YYYY-MM-DD');
      const endDate = today.clone().add(1, 'days').format('YYYY-MM-DD');

      console.log('🔵 [FETCH NOTIFICATIONS] Date range:', { startDate, endDate });

      // Get fresh token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('❌ [FETCH NOTIFICATIONS] Auth token not found');
        return;
      }

      const response = await axios.get(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${startDate}&end=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Bypass ngrok browser warning page
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );

      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [FETCH NOTIFICATIONS] Server returned HTML instead of JSON - possible auth/ngrok issue');
        setUnreadTasks(0);
        return;
      }

      console.log('🔵 [FETCH NOTIFICATIONS] Response:', response.data?.length, 'visits');

      const assignedVisits = response.data.filter(visit => visit.isSelfGenerated === false);

      const unread = assignedVisits.filter(visit =>
        !visit.checkoutLatitude && !visit.checkoutLongitude && !visit.checkoutDate && !visit.checkoutTime
      ).length;

      console.log('🔵 [FETCH NOTIFICATIONS] Unread tasks:', unread);
      setUnreadTasks(unread);
    } catch (error) {
      console.error('❌ [FETCH NOTIFICATIONS] Error:', error);
    }
  };

  const fetchDailyPricingCount = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const today = new Date().toISOString().split('T')[0];

      console.log('🔵 [FETCH PRICING] Date:', today);

      // Get fresh token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('❌ [FETCH PRICING] Auth token not found');
        return;
      }

      const response = await axios.get(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/brand/getByDateRangeForEmployee?start=${today}&end=${today}&id=${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Bypass ngrok browser warning page
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );

      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [FETCH PRICING] Server returned HTML instead of JSON - possible auth/ngrok issue');
        setDailyPricingCount(0);
        console.log('🔵 [FETCH PRICING] Count: 0');
        return;
      }

      console.log('🔵 [FETCH PRICING] Response:', response.data);

      const count = Array.isArray(response.data) ? response.data.length : 0;
      setDailyPricingCount(count);

      console.log('🔵 [FETCH PRICING] Count:', count);

      if (count < 5) {
        role = await AsyncStorage.getItem('employeeRole');
        setDailyPricingMessage(`Add ${5 - count} more daily pricing entries`);
      } else {
        setDailyPricingMessage('Great job! You have added 5 or more daily pricing entries');
      }
    } catch (error) {
      console.error('❌ [FETCH PRICING] Error:', error);
    }
  };

  const generateGreeting = (firstName) => {
    console.log('🔵 [GENERATE GREETING] Input firstName:', firstName);
    console.log('🔵 [GENERATE GREETING] Type of firstName:', typeof firstName);
    
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
      { greeting: 'Namaste', emoji: '🙏' },
      { greeting: 'Hey', emoji: '🙏' },
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    const selectedGreeting = Math.random() < 0.5 ? timeGreeting : randomGreeting.greeting;
    const selectedEmoji = Math.random() < 0.5 ? emoji : randomGreeting.emoji;

    const finalGreeting = `${selectedGreeting}, ${firstName}! ${selectedEmoji}`;
    console.log('✅ [GENERATE GREETING] Final greeting message:', finalGreeting);
    
    setGreetingMessage(finalGreeting);
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

  const checkPendingRequests = async () => {
    const pendingCustomers = await getPendingCustomers();
    setHasPendingRequests(pendingCustomers.length > 0);
  };

  console.log('🔴 [RENDER] employeeFirstName state:', employeeFirstName);
  console.log('🔴 [RENDER] greetingMessage state:', greetingMessage);

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
        
        {/* Dashboard Button for Regional Manager and AVP */}
        {(employeeRole?.toLowerCase() === 'regional manager' ||
          employeeRole?.toUpperCase() === 'REGIONAL_MANAGER' ||
          employeeRole?.toLowerCase() === 'avp' ||
          employeeRole?.toUpperCase() === 'AVP' ||
          employeeRole?.toLowerCase().includes('regional')) && (
          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={() => navigation.navigate('DashboardScreen', { authToken })}
          >
            <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
            <Text style={styles.dashboardButtonText}>View Dashboard</Text>
          </TouchableOpacity>
        )}

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
          onVisitPress={(visit) => {
            const targetVisitId = visit?.id ?? visit?.visitId;
            if (!targetVisitId) {
              console.warn('⚠️ [HOME] Recent visit selection missing id:', visit);
              return;
            }
            navigation.navigate('VisitScreen', { visitId: targetVisitId, authToken });
          }}
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
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  headerContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default HomeScreen;
