import { API_BASE_URL } from './config/api';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';

const Notifications1 = ({ route }) => {
  const navigation = useNavigation();
  const { authToken } = route.params;
  const [notifications, setNotifications] = useState([]);
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const today = moment();
      const startDate = today.clone().subtract(2, 'days').format('YYYY-MM-DD');
      const endDate = today.clone().add(1, 'days').format('YYYY-MM-DD');

      const response = await axios.get(
        `${API_BASE_URL}/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${startDate}&end=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const assignedVisits = response.data.filter(visit => visit.isSelfGenerated === false);
      setNotifications(assignedVisits);

      // Fetch birthdays in the same date range
      const birthdayResponse = await axios.get(
        `${API_BASE_URL}/store/getByDobDateRange?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log('Birthday Notifications Response (Notifications1):', JSON.stringify(birthdayResponse.data, null, 2));

      if (Array.isArray(birthdayResponse.data)) {
        setBirthdays(birthdayResponse.data);
      } else {
        setBirthdays([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const groupByDate = (visits) => {
    return visits.reduce((acc, visit) => {
      const date = visit.visit_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(visit);
      return acc;
    }, {});
  };

  const groupedNotifications = groupByDate(notifications);

  const getVisitStatus = (visit) => {
    if (visit.checkoutLatitude && visit.checkoutLongitude && visit.checkoutDate && visit.checkoutTime) {
      return 'Completed';
    } else if (visit.checkinLatitude && visit.checkinLongitude && visit.checkinDate && visit.checkinTime) {
      return 'Ongoing';
    } else {
      return 'Assigned';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed':
        return '#10B981';
      case 'Ongoing':
        return '#3B82F6';
      case 'Assigned':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const handleNotificationPress = (visit) => {
    navigation.navigate('VisitScreen', { visitId: visit.id, authToken });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <ScrollView style={styles.scrollView}>
        {birthdays.length > 0 && (
          <View style={styles.dateSection}>
            <Text style={styles.dateText}>Birthdays</Text>
            {birthdays.map((store, index) => (
              <TouchableOpacity
                key={index}
                style={styles.notificationCard}
                onPress={() => {
                  console.log('Birthday notification tapped:', JSON.stringify(store, null, 2));
                  navigation.navigate('Customer', {
                    screen: 'CustomerDetails',
                    params: { customerId: store.storeId || store.id, authToken },
                  });
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="gift-outline" size={24} color="#FFF" />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.storeName}>{store.storeName || 'Unknown Store'}</Text>
                    <View style={[styles.tagContainer, { backgroundColor: '#EC4899' }]}>
                      <Text style={styles.tagText}>Birthday</Text>
                    </View>
                  </View>
                  <Text style={styles.visitPurpose}>
                    {`${store.clientFirstName || ''} ${store.clientLastName || ''}`.trim() || 'Customer birthday'}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {store.dob ? moment(store.dob).format('DD MMM') : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {Object.keys(groupedNotifications).map(date => (
          <View key={date} style={styles.dateSection}>
            <Text style={styles.dateText}>{moment(date).format('MMMM D, YYYY')}</Text>
            {groupedNotifications[date].map((visit, index) => {
              const status = getVisitStatus(visit);
              return (
                <TouchableOpacity 
                  key={index} 
                  style={styles.notificationCard}
                  onPress={() => handleNotificationPress(visit)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: getStatusColor(status) }]}>
                    <Ionicons name="calendar-outline" size={24} color="#FFF" />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.storeName}>{visit.storeName}</Text>
                      <View style={[styles.tagContainer, { backgroundColor: getStatusColor(status) }]}>
                        <Text style={styles.tagText}>{status}</Text>
                      </View>
                    </View>
                    <Text style={styles.visitPurpose}>{visit.purpose || 'No purpose specified'}</Text>
                    <Text style={styles.notificationTime}>
                      {visit.scheduledStartTime ? moment(visit.scheduledStartTime, 'HH:mm:ss').format('h:mm A') : 'No time specified'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  dateSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  tagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  visitPurpose: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Notifications1;