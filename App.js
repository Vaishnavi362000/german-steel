import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import axios from 'axios';
import * as Location from 'expo-location';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';

// Import your screens
import AddComplaintScreen from './screens/AddComplaintScreen';
import AddRequirementScreen from './screens/AddRequirementScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import CameraScreen from './screens/CameraScreen';
import ComplaintsScreen from './screens/ComplaintsScreen';
import CustomerDetails from './screens/CustomerDetails';
import CustomerListScreen from './screens/CustomerListScreen';
import CustomTabBar from './screens/CustomTabBar';
import DashboardScreen from './screens/DashboardScreen';
import ExpenseScreen from './screens/ExpenseScreen';
import HomeLocationScreen from './screens/HomeLocationScreen';
import HomeScreen from './screens/HomeScreen';
import LocationService from './screens/LocationService';
import LoginScreen from './screens/LoginScreen';
import Notifications1 from './screens/Notifications1';
import PricingScreen from './screens/PricingScreen';
import RequirementsScreen from './screens/RequirementsScreen';
import StoreSelectionScreen from './screens/StoreSelectionScreen';
import TaskDetailsScreen from './screens/TaskDetailsScreen';
import UpdateRequiredScreen from './screens/UpdateRequiredScreen';
import UserProfile from './screens/UserProfile';
import VisitScreen from './screens/VisitScreen';
import VisitsList from './screens/VisitsList';
import VisitsTimeline from './screens/VisitsTimeline';

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
      <HomeStack.Screen name="DashboardScreen">
        {(props) => <DashboardScreen {...props} authToken={authToken} />}
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
      // Only check for updates in production builds, not in Expo Go
      if (!__DEV__ && Updates.isEnabled) {
        try {
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
          console.error('Error fetching updates', e);
        }
      }
    }
    updateApp();
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // Use /employee/me endpoint to verify token and get current employee data
          const response = await axios.get(
            'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/me',
            {
              headers: {
                Authorization: `Bearer ${token}`,
                // Bypass ngrok browser warning page
                'ngrok-skip-browser-warning': 'true',
                'User-Agent': 'IconMobile',
              },
            }
          );

          if (response.status === 200 && response.data) {
            setAuthToken(token);
            // Store employee ID if not already stored
            if (response.data.employeeId) {
              await AsyncStorage.setItem('employeeId', String(response.data.employeeId));
            }
          } else {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('employeeId');
          }
        }
      } catch (e) {
        console.error('Failed to verify the token', e);
        // If token verification fails, clear stored credentials
        if (e.response && (e.response.status === 401 || e.response.status === 403 || e.response.status === 404)) {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('employeeId');
        }
      }
      setIsInitializing(false);
    };
    bootstrapAsync();
  }, []);

  const handleLoginSuccess = async (empId, token) => {
    setAuthToken(token);
    setEmployeeId(empId);

    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('employeeId', empId.toString());

    try {
      // Get initial location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        await LocationService.updateLocation(location);
      }
    } catch (error) {
      console.error('Error initializing location services:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('employeeId');
      await AsyncStorage.removeItem('employeeFirstName');
      await AsyncStorage.removeItem('employeeRole');
      setAuthToken(null);
      setEmployeeId(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      if (authToken) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          await LocationService.updateLocation(location);
        }
      }
    };

    initializeApp();
  }, [authToken]);

  if (isInitializing) {
    return null;
  }

  return (
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
  );
};

export default App;

