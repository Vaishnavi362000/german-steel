import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import api from '../services/api';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DashboardScreen = ({ authToken }) => {
  const navigation = useNavigation();
  const [viewLevel, setViewLevel] = useState('cities'); // 'cities', 'employees', 'visits'
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [cities, setCities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState(null);

  useEffect(() => {
    fetchCities();
  }, []);

  // Level 1: Fetch Cities
  const fetchCities = async () => {
    try {
      setIsLoading(true);
      setErrorStatus(null);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Auth token not found');
        setCities([]);
        setErrorStatus(401);
        return;
      }

      console.log('🔵 [DASHBOARD] Fetching cities...');

      const response = await api.get('/dashboard/cities');
      console.log('🔵 [DASHBOARD] Cities status:', response.status);

      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [DASHBOARD] Server returned HTML instead of JSON - possible auth/ngrok issue');
        setCities([]);
        return;
      }

      console.log('🔵 [DASHBOARD] Cities response:', response.data);
      setCities(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('❌ [DASHBOARD] Error fetching cities:', error);
      console.log('❌ [DASHBOARD] Error status:', error?.response?.status, 'data:', error?.response?.data);
      setErrorStatus(error?.response?.status ?? null);
      setCities([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Level 2: Fetch Employees by City
  const fetchEmployees = async (cityName) => {
    try {
      setIsLoading(true);
      setErrorStatus(null);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Auth token not found');
        setEmployees([]);
        setErrorStatus(401);
        return;
      }

      console.log('🔵 [DASHBOARD] Fetching employees for city:', cityName);

      const response = await api.get(`/dashboard/employees?city=${encodeURIComponent(cityName)}`);
      console.log('🔵 [DASHBOARD] Employees status:', response.status);

      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [DASHBOARD] Server returned HTML instead of JSON - possible auth/ngrok issue');
        setEmployees([]);
        return;
      }

      console.log('🔵 [DASHBOARD] Employees response:', response.data);
      setEmployees(Array.isArray(response.data) ? response.data : []);
      setSelectedCity(cityName);
      setViewLevel('employees');
    } catch (error) {
      console.error('❌ [DASHBOARD] Error fetching employees:', error);
      console.log('❌ [DASHBOARD] Error status:', error?.response?.status, 'data:', error?.response?.data);
      setErrorStatus(error?.response?.status ?? null);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Level 3: Fetch Visits by Employee
  const fetchVisits = async (employeeId, employeeName) => {
    try {
      setIsLoading(true);
      setErrorStatus(null);

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Auth token not found');
        setVisits([]);
        setErrorStatus(401);
        return;
      }

      console.log('🔵 [DASHBOARD] Fetching visits for employee:', employeeId);

      const response = await api.get(`/dashboard/visits?employeeId=${employeeId}`);
      console.log('🔵 [DASHBOARD] Visits status:', response.status);

      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [DASHBOARD] Server returned HTML instead of JSON - possible auth/ngrok issue');
        setVisits([]);
        return;
      }

      console.log('🔵 [DASHBOARD] Visits response:', response.data);
      setVisits(Array.isArray(response.data) ? response.data : []);
      setSelectedEmployee({ id: employeeId, name: employeeName });
      setViewLevel('visits');
    } catch (error) {
      console.error('❌ [DASHBOARD] Error fetching visits:', error);
      console.log('❌ [DASHBOARD] Error status:', error?.response?.status, 'data:', error?.response?.data);
      setErrorStatus(error?.response?.status ?? null);
      setVisits([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Back navigation
  const handleBack = () => {
    if (viewLevel === 'visits') {
      setViewLevel('employees');
      setSelectedEmployee(null);
    } else if (viewLevel === 'employees') {
      setViewLevel('cities');
      setSelectedCity(null);
    } else {
      navigation.goBack();
    }
  };

  // Render City Card
  const renderCityCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => fetchEmployees(item.cityName)}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="location" size={24} color="#4F46E5" />
        <Text style={styles.cardTitle}>{item.cityName}</Text>
      </View>
      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.completedVisitsThisMonth || 0}</Text>
          <Text style={styles.statLabel}>Completed Visits</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.employeeCount || 0}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  // Render Employee Card
  const renderEmployeeCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => fetchVisits(item.employeeId, item.employeeName)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.employeeAvatar}>
          <Text style={styles.employeeAvatarText}>
            {item.employeeName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'N/A'}
          </Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.employeeName}</Text>
          <Text style={styles.employeeRole}>{item.role}</Text>
        </View>
      </View>
      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.completedVisitCount || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalVisitCount || 0}</Text>
          <Text style={styles.statLabel}>Total Visits</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  // Render Visit Card
  const renderVisitCard = ({ item }) => {
    const getNormalizedStatus = (status) => {
      const upper = status?.toUpperCase();
      if (upper === 'DONE' || upper === 'COMPLETED') return 'COMPLETED';
      return upper || 'UNKNOWN';
    };

    const getStatusColor = (status) => {
      switch (getNormalizedStatus(status)) {
        case 'COMPLETED': return '#10B981';
        case 'IN_PROGRESS': return '#F59E0B';
        case 'SCHEDULED': return '#6B7280';
        default: return '#6B7280';
      }
    };

    const getRatingStars = (rating) => {
      if (!rating) return 'Not rated';
      return '⭐'.repeat(rating);
    };

    return (
      <View style={styles.visitCard}>
        <View style={styles.visitHeader}>
          <View>
            <Text style={styles.visitClientName}>{item.clientName}</Text>
            <Text style={styles.visitClientType}>{item.clientType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>
              {getNormalizedStatus(item.status) === 'COMPLETED' ? 'COMPLETED' : (item.status || 'N/A')}
            </Text>
          </View>
        </View>
        <View style={styles.visitDetails}>
          <View style={styles.visitDetailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.visitDetailText}>{item.visitDate}</Text>
          </View>
          <View style={styles.visitDetailRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.visitDetailText}>{item.storeCity}</Text>
          </View>
          {item.purpose && (
            <View style={styles.visitDetailRow}>
              <Ionicons name="flag-outline" size={16} color="#6B7280" />
              <Text style={styles.visitDetailText}>{item.purpose}</Text>
            </View>
          )}
          {item.rating && (
            <View style={styles.visitDetailRow}>
              <Ionicons name="star-outline" size={16} color="#6B7280" />
              <Text style={styles.visitDetailText}>{getRatingStars(item.rating)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getTitle = () => {
    if (viewLevel === 'cities') return 'Regional Dashboard';
    if (viewLevel === 'employees') return selectedCity;
    if (viewLevel === 'visits') return selectedEmployee?.name;
    return 'Dashboard';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {viewLevel !== 'cities' && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => {
          if (viewLevel === 'cities') fetchCities();
          else if (viewLevel === 'employees') fetchEmployees(selectedCity);
          else if (viewLevel === 'visits') fetchVisits(selectedEmployee.id, selectedEmployee.name);
        }}>
          <Ionicons name="refresh" size={24} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Breadcrumb */}
      {(viewLevel === 'employees' || viewLevel === 'visits') && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => {
            setViewLevel('cities');
            setSelectedCity(null);
            setSelectedEmployee(null);
          }}>
            <Text style={styles.breadcrumbText}>Cities</Text>
          </TouchableOpacity>
          {viewLevel === 'employees' && (
            <>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              <Text style={styles.breadcrumbTextActive}>{selectedCity}</Text>
            </>
          )}
          {viewLevel === 'visits' && (
            <>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              <TouchableOpacity onPress={() => {
                setViewLevel('employees');
                setSelectedEmployee(null);
              }}>
                <Text style={styles.breadcrumbText}>{selectedCity}</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              <Text style={styles.breadcrumbTextActive}>{selectedEmployee?.name}</Text>
            </>
          )}
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <>
          {viewLevel === 'cities' && (
            <FlatList
              data={cities}
              renderItem={renderCityCard}
              keyExtractor={(item, index) => item.cityName || `city-${index}`}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>{errorStatus === 403 ? "You're not authorized to view dashboard data" : 'No city data available'}</Text>
                </View>
              }
            />
          )}

          {viewLevel === 'employees' && (
            <FlatList
              data={employees}
              renderItem={renderEmployeeCard}
              keyExtractor={(item, index) => item.employeeId ? item.employeeId.toString() : `employee-${index}`}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>{errorStatus === 403 ? "You're not authorized to view employees for this city" : `No employees found in ${selectedCity}`}</Text>
                </View>
              }
            />
          )}

          {viewLevel === 'visits' && (
            <FlatList
              data={visits}
              renderItem={renderVisitCard}
              keyExtractor={(item, index) => item.visitId ? item.visitId.toString() : `visit-${index}`}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>{errorStatus === 403 ? "You're not authorized to view visits for this employee" : `No visits found for ${selectedEmployee?.name}`}</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  breadcrumbTextActive: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitClientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  visitClientType: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  visitDetails: {
    gap: 8,
  },
  visitDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitDetailText: {
    fontSize: 14,
    color: '#4B5563',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});

export default DashboardScreen;
