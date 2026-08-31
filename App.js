import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';

// Import your screens
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import CustomerListScreen from './CustomerListScreen';
import CustomerDetails from './CustomerDetails';
import VisitsList from './VisitsList';
import VisitScreen from './VisitScreen';
import VisitsTimeline from './VisitsTimeline';
import MeetingsList from './MeetingsList';
import MeetingDetail from './MeetingDetail';
import NewMeeting from './NewMeeting';
import UserProfile from './UserProfile';
import ExpenseScreen from './ExpenseScreen';
import AttendanceScreen from './AttendanceScreen';
import CameraScreen from './CameraScreen';
import CustomTabBar from './CustomTabBar';
import Notifications1 from './Notifications1';
import RequirementsScreen from './RequirementsScreen';
import ComplaintsScreen from './ComplaintsScreen';
import PricingScreen from './PricingScreen';
import TaskDetailsScreen from './TaskDetailsScreen';
import UpdateRequiredScreen from './UpdateRequiredScreen';
import HomeLocationScreen from './HomeLocationScreen';
import StoreSelectionScreen from './StoreSelectionScreen';
import AddComplaintScreen from './AddComplaintScreen';
import AddRequirementScreen from './AddRequirementScreen';
import YesterdayStatsScreen from './YesterdayStatsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const CustomerStack = createStackNavigator();
const VisitsStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const AuthStack = createStackNavigator();

function AuthStackScreen({ onLoginSuccess }) {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" options={{ headerShown: false }}>
        {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="UpdateRequired" component={UpdateRequiredScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStackScreen({ authToken, handleLogout }) {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeScreen">
        {(props) => <HomeScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="VisitScreen">
        {(props) => <VisitScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="UserProfile">
        {(props) => <UserProfile {...props} authToken={authToken} onLogout={handleLogout} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="ExpenseScreen" component={ExpenseScreen} />
      <HomeStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
      <HomeStack.Screen name="CustomerDetails">
        {(props) => <CustomerDetails {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="Notifications1">
        {(props) => <Notifications1 {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="RequirementsScreen">
        {(props) => <RequirementsScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="ComplaintsScreen">
        {(props) => <ComplaintsScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="PricingScreen">
        {(props) => <PricingScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="TaskDetails">
        {(props) => <TaskDetailsScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="HomeLocationScreen">
        {(props) => <HomeLocationScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="StoreSelectionScreen">
        {(props) => <StoreSelectionScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="AddComplaintScreen">
        {(props) => <AddComplaintScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="AddRequirementScreen">
        {(props) => <AddRequirementScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="YesterdayStatsScreen">
        {(props) => <YesterdayStatsScreen {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="MeetingsList">
        {(props) => <MeetingsList {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="NewMeeting">
        {(props) => <NewMeeting {...props} authToken={authToken} />}
      </HomeStack.Screen>
      <HomeStack.Screen name="MeetingDetail">
        {(props) => <MeetingDetail {...props} authToken={authToken} />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
}

function CustomerStackScreen({ authToken }) {
  return (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
      <CustomerStack.Screen name="CustomerListScreen">
        {(props) => <CustomerListScreen {...props} authToken={authToken} />}
      </CustomerStack.Screen>
      <CustomerStack.Screen name="CustomerDetails">
        {(props) => <CustomerDetails {...props} authToken={authToken} />}
      </CustomerStack.Screen>
      <CustomerStack.Screen name="VisitScreen">
        {(props) => <VisitScreen {...props} authToken={authToken} />}
      </CustomerStack.Screen>
      <CustomerStack.Screen name="VisitsTimeline">
        {(props) => <VisitsTimeline {...props} authToken={authToken} />}
      </CustomerStack.Screen>
    </CustomerStack.Navigator>
  );
}

function VisitsStackScreen({ authToken }) {
  return (
    <VisitsStack.Navigator screenOptions={{ headerShown: false }}>
      <VisitsStack.Screen name="VisitsList">
        {(props) => <VisitsList {...props} authToken={authToken} />}
      </VisitsStack.Screen>
      <VisitsStack.Screen name="VisitScreen">
        {(props) => <VisitScreen {...props} authToken={authToken} />}
      </VisitsStack.Screen>
      <VisitsStack.Screen name="VisitsTimeline">
        {(props) => <VisitsTimeline {...props} authToken={authToken} />}
      </VisitsStack.Screen>
      <VisitsStack.Screen name="Camera">
        {(props) => <CameraScreen {...props} authToken={authToken} />}
      </VisitsStack.Screen>
    </VisitsStack.Navigator>
  );
}

const App = () => {
  const [authToken, setAuthToken] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [employeeId, setEmployeeId] = useState(null);

  useEffect(() => {
    async function updateApp() {
      try {
        // Expo Go doesn't support expo-updates APIs like checkForUpdateAsync.
        // In real builds, this is enabled (if expo-updates is configured).
        if (__DEV__ || !Updates.isEnabled) return;

        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Update Available',
            'A new update is available. The app will reload to apply the update.',
            [{ text: 'OK', onPress: () => Updates.reloadAsync() }]
          );
        }
      } catch (e) {
        // Avoid noisy logs in Expo Go.
        const msg = e?.message || '';
        if (msg.includes('checkForUpdateAsync() is not supported in Expo Go')) return;
        console.error('Error fetching updates', e);
      }
    }
    updateApp();
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await axios.get(
            `${API_BASE_URL}/employee/getById?id=1`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.status === 200) {
            setAuthToken(token);
          } else {
            await AsyncStorage.removeItem('userToken');
          }
        }
      } catch (e) {
        console.error('Failed to verify the token', e);
      }
      setIsInitializing(false);
    };
    bootstrapAsync();
  }, []);

  const handleLoginSuccess = async (empId, token) => {
    setAuthToken(token);
    setEmployeeId(empId);

    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('employeeId', empId);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('employeeId');
      setAuthToken(null);
      setEmployeeId(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isInitializing) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <SafeAreaView style={styles.appShell} edges={['top']}>
        <NavigationContainer>
          {!authToken ? (
            <AuthStackScreen onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
              <Tab.Screen name="Home" options={{ headerShown: false, tabBarIconName: 'home-outline' }}>
                {() => <HomeStackScreen authToken={authToken} employeeId={employeeId} handleLogout={handleLogout} />}
              </Tab.Screen>
              <Tab.Screen name="Visits" options={{ headerShown: false, tabBarIconName: 'list-outline' }}>
                {() => <VisitsStackScreen authToken={authToken} employeeId={employeeId} />}
              </Tab.Screen>
              <Tab.Screen name="Customer" options={{ headerShown: false, tabBarIconName: 'people-outline' }}>
                {() => <CustomerStackScreen authToken={authToken} employeeId={employeeId} />}
              </Tab.Screen>
            </Tab.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default App;
