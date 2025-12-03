import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const UserProfile = ({ authToken, onLogout }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const response = await axios.get(`https://api.gajkesaristeels.in/employee/getById?id=${employeeId}`, {
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
      await axios.post('https://api.gajkesaristeels.in/user/logout', null, {
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

  const FeatureCard = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.cardContent}>
        <Ionicons name={icon} size={32} color="#FFFFFF" style={styles.cardIcon} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={[styles.cardShape, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
    </TouchableOpacity>
  );
  return (
    <View style={styles.container}>
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v2.5</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <LinearGradient colors={['#6C63FF', '#5A51E5']} style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userData ? `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}` : ''}
            </Text>
          </LinearGradient>
          <View style={styles.userInfoContainer}>
            <Text style={styles.username}>{userData ? `${userData.firstName} ${userData.lastName}` : ''}</Text>
            <Text style={styles.userRole}>{userData ? userData.departmentName : ''}</Text>
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
            <FeatureCard title="Expense" icon="wallet-outline" color="#FF6B6B" onPress={() => navigation.navigate('ExpenseScreen')} />
            <FeatureCard title="Attendance" icon="calendar-outline" color="#4ECDC4" onPress={() => navigation.navigate('AttendanceScreen')} />
            <FeatureCard title="Requirements" icon="list-outline" color="#45B7D1" onPress={() => navigation.navigate('RequirementsScreen', { authToken })} />
            <FeatureCard title="Complaints" icon="warning-outline" color="#FFA07A" onPress={() => navigation.navigate('ComplaintsScreen', { authToken })} />
            <FeatureCard title="Pricing" icon="pricetag-outline" color="#98D8C8" onPress={() => navigation.navigate('PricingScreen', { authToken })} />
            <FeatureCard title="Home Location" icon="location-outline" color="#C1E189" onPress={() => navigation.navigate('HomeLocationScreen', { authToken })} />
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
  versionContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#6C63FF',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfoContainer: {
    marginLeft: 20,
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userRole: {
    fontSize: 16,
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
    width: (width - 60) / 2,
    height: 140,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cardIcon: {
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardShape: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default UserProfile;