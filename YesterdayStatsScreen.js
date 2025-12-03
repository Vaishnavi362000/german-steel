import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const YesterdayStatsScreen = ({ route }) => {
  const { authToken } = route.params || {};
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [completedVisits, setCompletedVisits] = useState(0);
  const [assignedVisits, setAssignedVisits] = useState(0);
  const [distanceTravelled, setDistanceTravelled] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setApiError(false);
      const employeeId = await AsyncStorage.getItem('employeeId');
      const token = await AsyncStorage.getItem('userToken');

      // Decide which date to request:
      // - On normal days: yesterday
      // - On Mondays: last Saturday (2 days ago)
      const today = moment();
      const dayOfWeek = today.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const targetMoment =
        dayOfWeek === 1 ? today.clone().subtract(2, 'days') : today.clone().subtract(1, 'days');
      const targetDateStr = targetMoment.format('YYYY-MM-DD');

      const apiUrl = `http://ec2-3-88-111-83.compute-1.amazonaws.com:8081/employee/getYesterdayStats?date=${targetDateStr}&employeeId=${employeeId}`;

      console.log('=== YESTERDAY STATS API CALL ===');
      console.log('API URL:', apiUrl);
      console.log('Method: GET');
      console.log('Employee ID:', employeeId);
      console.log('Target Date Param:', targetDateStr);

      const response = await axios.get(apiUrl, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });

      console.log('=== API RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));

      const data = response.data || {};

      // Example response:
      // {
      //   "employeeId": 17,
      //   "completedVisitCount": 0,
      //   "visitAssignedCount": 0,
      //   "distanceTravelled": 0.0,
      //   "statsDate": "2025-11-30",
      //   "lastUpdated": "2025-12-01"
      // }

      setCompletedVisits(data.completedVisitCount ?? 0);
      setAssignedVisits(data.visitAssignedCount ?? 0);
      setDistanceTravelled(data.distanceTravelled ?? 0);
      // Prefer API date if present, fall back to the requested date
      setTargetDate(data.statsDate || targetDateStr);
      setLastUpdated(data.lastUpdated || '');

      setLoading(false);
    } catch (error) {
      console.error('=== ERROR FETCHING STATS ===');
      console.error('Error:', error);
      console.error('Error Response:', error.response?.data);
      console.error('Error Status:', error.response?.status);

      setApiError(true);
      setCompletedVisits(0);
      setAssignedVisits(0);
      setDistanceTravelled(0);
      setTargetDate('');
      setLastUpdated('');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = moment(dateString);
    const today = moment();
    const isMonday = today.day() === 1;
    const twoDaysAgo = today.clone().subtract(2, 'days');
    const oneDayAgo = today.clone().subtract(1, 'days');

    if (isMonday && date.isSame(twoDaysAgo, 'day')) {
      return `Last Saturday • ${date.format('MMM D, YYYY')}`;
    }
    if (date.isSame(oneDayAgo, 'day')) {
      return `Yesterday • ${date.format('MMM D, YYYY')}`;
    }
    return date.format('MMM D, YYYY');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yesterday</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.dateRow}>
            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={16} color="#4F46E5" />
              <Text style={styles.dateText}>
                {targetDate ? formatDate(targetDate) : 'No date available'}
              </Text>
            </View>
            {lastUpdated ? (
              <Text style={styles.updatedText}>
                Updated {moment(lastUpdated).format('MMM D')}
              </Text>
            ) : null}
          </View>

          {apiError ? (
            <View style={styles.errorCard}>
              <Ionicons name="warning-outline" size={28} color="#F97316" />
              <Text style={styles.errorTitle}>Stats not available</Text>
              <Text style={styles.errorText}>
                We couldn&apos;t load yesterday&apos;s summary. Please try again later.
              </Text>
            </View>
          ) : (
            <View style={styles.compactCard}>
              <View style={styles.metricItem}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#ECFDF3' }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                </View>
                <Text style={styles.metricValue}>{completedVisits}</Text>
                <Text style={styles.metricLabel}>Completed</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricItem}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="clipboard-outline" size={18} color="#4F46E5" />
                </View>
                <Text style={styles.metricValue}>{assignedVisits}</Text>
                <Text style={styles.metricLabel}>Assigned</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricItem}>
                <View style={[styles.metricIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="navigate" size={18} color="#2563EB" />
                </View>
                <Text style={styles.metricValue}>{distanceTravelled.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>Km</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  updatedText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  errorCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  errorTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  errorText: {
    marginTop: 4,
    fontSize: 13,
    color: '#B45309',
    textAlign: 'center',
  },
});

export default YesterdayStatsScreen;

