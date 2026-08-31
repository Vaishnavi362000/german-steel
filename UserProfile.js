import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const UserProfile = ({ authToken, onLogout }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const response = await axios.get(`${API_BASE_URL}/employee/getById?id=${employeeId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setUserData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authToken]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/user/logout`, null, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('employeeId');
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const FeatureCard = ({ title, icon, accentColor, iconBackground, cardBackground, onPress }) => (
    <TouchableOpacity
      style={[styles.card, { width: (width - 48) / 2, backgroundColor: cardBackground }]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View style={[styles.cardAccentBand, { backgroundColor: iconBackground }]} />
      <View style={[styles.cardIconBox, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={26} color={accentColor} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      <View style={styles.cardChevron}>
        <Ionicons name="chevron-forward" size={16} color={accentColor} />
      </View>
    </TouchableOpacity>
  );

  const assignedCityValues = Array.isArray(userData?.assignedCity)
    ? userData.assignedCity
    : Array.isArray(userData?.assignedCities)
      ? userData.assignedCities
      : [userData?.assignedCity ?? userData?.assignedCities ?? userData?.city];
  const assignedCities = Array.from(
    new Set(assignedCityValues.map((city) => String(city || '').trim()).filter(Boolean))
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <LinearGradient colors={['#6C63FF', '#5A51E5']} style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userData ? `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}` : ''}
            </Text>
          </LinearGradient>
          <View style={styles.userInfoContainer}>
            <Text style={styles.username}>{userData ? `${userData.firstName} ${userData.lastName}` : ''}</Text>
            <Text style={styles.userRole}>{userData ? userData.departmentName : ''}</Text>
            {assignedCities.length > 0 && (
              <View style={styles.assignedCityRow}>
                <Ionicons name="location-outline" size={13} color="#5A51E5" />
                <Text style={styles.assignedCityText}>{assignedCities.join(', ')}</Text>
              </View>
            )}
            <Text style={styles.versionText}>German Steel • v1.0</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#6C63FF" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
          </View>
        ) : (
          <View style={styles.cardGrid}>
            <FeatureCard title="Expense" icon="wallet-outline" accentColor="#EC407A" iconBackground="#FCE7F3" cardBackground="#FFFBFD" onPress={() => navigation.navigate('ExpenseScreen')} />
            <FeatureCard title="Attendance" icon="calendar-outline" accentColor="#14B8A6" iconBackground="#CCFBF1" cardBackground="#FAFFFE" onPress={() => navigation.navigate('AttendanceScreen')} />
            {/*<FeatureCard title="Meetings" icon="people-circle-outline" accentColor="#7C3AED" iconBackground="#EDE9FE" cardBackground="#FEFCFF" onPress={() => navigation.navigate('MeetingsList', { authToken })} />*/}
            <FeatureCard title="Requirements" icon="list-outline" accentColor="#2563EB" iconBackground="#DBEAFE" cardBackground="#FBFDFF" onPress={() => navigation.navigate('RequirementsScreen', { authToken })} />
            <FeatureCard title="Complaints" icon="warning-outline" accentColor="#F97316" iconBackground="#FFEDD5" cardBackground="#FFFCF8" onPress={() => navigation.navigate('ComplaintsScreen', { authToken })} />
            <FeatureCard title="Pricing" icon="pricetag-outline" accentColor="#10B981" iconBackground="#D1FAE5" cardBackground="#FAFFFD" onPress={() => navigation.navigate('PricingScreen', { authToken })} />
            <FeatureCard title="Home Location" icon="location-outline" accentColor="#6C63FF" iconBackground="#EDE9FE" cardBackground="#FEFCFF" onPress={() => navigation.navigate('HomeLocationScreen', { authToken })} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  versionText: {
    color: '#7C8494',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  assignedCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  assignedCityText: {
    color: '#5A51E5',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 108,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfoContainer: {
    marginLeft: 14,
    flex: 1,
  },
  username: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    height: 116,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EEF0F4',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },
  cardAccentBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#202938',
    paddingRight: 18,
  },
  cardChevron: {
    position: 'absolute',
    right: 12,
    bottom: 14,
  },
});

export default UserProfile;
