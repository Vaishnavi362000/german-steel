import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import moment from 'moment';
import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import BottomSheetn from './BottomSheetn';

const { width } = Dimensions.get('window');

const ComplaintsScreen = ({ route }) => {
  const { authToken, showSuccessMessage, successMessage } = route.params;
  const [complaints, setComplaints] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MMMM'));
  const [selectedYear, setSelectedYear] = useState(moment().format('YYYY'));
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  const navigation = useNavigation();

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return 'today';
    } else if (isYesterday(date)) {
      return 'yesterday';
    } else {
      // Format as "8 Nov '25"
      return format(date, "d MMM ''yy");
    }
  };

  const fetchComplaints = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const startDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').startOf('month').format('YYYY-MM-DD');
      const endDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').endOf('month').format('YYYY-MM-DD');

      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByAssignedToAndDate?id=${employeeId}&start=${startDate}&end=${endDate}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });

      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [COMPLAINTS] Server returned HTML instead of JSON');
        setComplaints([]);
        return;
      }

      const complaintsData = Array.isArray(response.data) ? response.data : [];
      const filteredComplaints = complaintsData.filter(task => task && task.taskType === 'complaint');
      const sortedComplaints = filteredComplaints.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Group complaints by date
      const groupedComplaints = {};
      sortedComplaints.forEach(complaint => {
        const dateKey = formatDate(complaint.updatedAt);
        if (!groupedComplaints[dateKey]) {
          groupedComplaints[dateKey] = [];
        }
        groupedComplaints[dateKey].push(complaint);
      });

      setComplaints(groupedComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchComplaints();
      if (showSuccessMessage) {
        navigation.setParams({ showSuccessMessage: false, successMessage: '' });
      }
    }, [selectedMonth, selectedYear, showSuccessMessage])
  );

  const handleAddComplaint = () => {
    navigation.navigate('AddComplaintScreen', { authToken });
  };

  const renderComplaint = (complaint) => (
    <TouchableOpacity
      key={complaint.id}
      style={styles.complaintCard}
      onPress={() => {
        if (complaint.attachmentResponse && complaint.attachmentResponse.length > 0) {
          // Handle image preview here
          Alert.alert('Image Preview', 'Image preview functionality to be implemented');
        }
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.storeName}>{complaint.storeName}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{complaint.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.taskType}>{complaint.taskType}</Text>
      <Text style={styles.complaintTitle}>{complaint.taskTitle}</Text>
      {complaint.taskDesciption && (
        <Text style={styles.complaintDescription} numberOfLines={2}>
          {complaint.taskDesciption}
        </Text>
      )}
      {complaint.attachmentResponse && complaint.attachmentResponse.length > 0 && (
        <View style={styles.imageIndicator}>
          <Ionicons name="image-outline" size={20} color="#6C63FF" />
          <Text style={styles.imageIndicatorText}>Image attached</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Complaints</Text>
        </View>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsMonthPickerVisible(true)}
          >
            <Text style={styles.filterButtonText}>{selectedMonth.substring(0, 3)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsYearPickerVisible(true)}
          >
            <Text style={styles.filterButtonText}>{selectedYear}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddComplaint}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Complaint</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer}>
        {Object.entries(complaints).map(([dateKey, dateComplaints]) => (
          <View key={dateKey} style={styles.dateSection}>
            <Text style={styles.dateText}>{dateKey}</Text>
            {dateComplaints.map((complaint) => renderComplaint(complaint))}
          </View>
        ))}
      </ScrollView>

      <BottomSheetn
        isVisible={isMonthPickerVisible}
        onClose={() => setIsMonthPickerVisible(false)}
        data={moment.months()}
        onSelect={(month) => {
          setSelectedMonth(month);
          setIsMonthPickerVisible(false);
        }}
        title="Select Month"
      />
      <BottomSheetn
        isVisible={isYearPickerVisible}
        onClose={() => setIsYearPickerVisible(false)}
        data={['2023', '2024', '2025']}
        onSelect={(year) => {
          setSelectedYear(year);
          setIsYearPickerVisible(false);
        }}
        title="Select Year"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  dateSection: {
    padding: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  complaintCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskType: {
    color: '#666',
    marginBottom: 4,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  complaintDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  dueDate: {
    color: '#666',
    fontSize: 12,
  },
  imageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  imageIndicatorText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6C63FF',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default ComplaintsScreen;