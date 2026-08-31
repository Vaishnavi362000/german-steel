import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Dimensions, Alert
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BottomSheetn from './BottomSheetn';

const { width } = Dimensions.get('window');

const ComplaintsScreen = ({ route }) => {
  const { authToken, showSuccessMessage, successMessage } = route.params;
  const [complaints, setComplaints] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MMMM'));
  const [selectedYear, setSelectedYear] = useState(moment().format('YYYY'));
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  const navigation = useNavigation();

  const fetchComplaints = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const startDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').startOf('month').format('YYYY-MM-DD');
      const endDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').endOf('month').format('YYYY-MM-DD');

      const response = await axios.get(`${API_BASE_URL}/task/getByAssignedToAndDate?id=${employeeId}&start=${startDate}&end=${endDate}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const filteredComplaints = response.data.filter(task => task.taskType === 'complaint');
      const sortedComplaints = filteredComplaints.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setComplaints(sortedComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      Alert.alert('Error', 'Failed to fetch complaints. Please try again.');
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

  const renderComplaint = (complaint) => {
    const attachmentCount = Array.isArray(complaint.attachmentResponse)
      ? complaint.attachmentResponse.length
      : 0;
    const description = complaint.taskDescription || complaint.taskDesciption;

    return (
      <TouchableOpacity
        key={complaint.id}
        style={styles.complaintCard}
        onPress={() => navigation.navigate('TaskDetails', { task: complaint, authToken })}
        activeOpacity={0.86}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <View style={styles.cardIcon}>
              <Ionicons name="warning-outline" size={22} color="#6C63FF" />
            </View>
            <Text style={styles.storeName} numberOfLines={1}>{complaint.storeName || 'Customer / Store'}</Text>
          </View>
          {!!complaint.status && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText} numberOfLines={1}>{String(complaint.status).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBodyRow}>
          <View style={styles.cardMainColumn}>
            <Text style={styles.taskType}>COMPLAINT</Text>
            <Text style={styles.complaintTitle} numberOfLines={1}>{complaint.taskTitle || 'Untitled'}</Text>
            {!!description && <Text style={styles.complaintDescription} numberOfLines={2}>{description}</Text>}
            <View style={styles.dashedDivider} />
            <Text style={styles.fieldLabel}>CUSTOMER / STORE</Text>
            <Text style={styles.customerName} numberOfLines={1}>{complaint.storeName || 'N/A'}</Text>
          </View>

          <View style={[styles.cardSideColumn, attachmentCount === 0 && styles.cardSideColumnEmpty]}>
            {attachmentCount > 0 && (
              <View style={styles.imageCountBadge}>
                <Ionicons name="image-outline" size={17} color="#6C63FF" />
                <Text style={styles.imageCountText} numberOfLines={1}>{attachmentCount} images</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6C63FF" />
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
        {complaints.map((complaint) => (
          <View key={complaint.id} style={styles.dateSection}>
            <Text style={styles.dateText}>{moment(complaint.updatedAt).format('MMMM D, YYYY')}</Text>
            {renderComplaint(complaint)}
          </View>
        ))}
        {complaints.length === 0 && (
          <Text style={styles.emptyListText}>No complaints available for this period.</Text>
        )}
      </ScrollView>

      <BottomSheetn
        isVisible={isMonthPickerVisible}
        onClose={() => setIsMonthPickerVisible(false)}
        data={moment.months()}
        selectedValue={selectedMonth}
        onSelect={(month) => {
          setSelectedMonth(month);
          setIsMonthPickerVisible(false);
        }}
        title="Select Month"
      />
      <BottomSheetn
        isVisible={isYearPickerVisible}
        onClose={() => setIsYearPickerVisible(false)}
        data={['2023', '2024', '2025', '2026']}
        selectedValue={selectedYear}
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
  },
  complaintText: {
    fontSize: 14,
    marginBottom: 8,
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
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardMainColumn: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  cardSideColumn: {
    width: 104,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardSideColumnEmpty: {
    justifyContent: 'center',
  },
  complaintTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  complaintDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  dashedDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    marginVertical: 12,
  },
  fieldLabel: {
    color: '#666',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  customerName: {
    color: '#1F2937',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  imageCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 9,
    maxWidth: 96,
  },
  imageCountText: {
    color: '#6C63FF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    marginLeft: 5,
    flexShrink: 1,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    marginRight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginLeft: 6,
  },
  filterButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#374151',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  dateSection: {
    padding: 16,
  },
  dateText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    marginLeft: 8,
  },
  complaintCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  storeName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 112,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  taskType: {
    color: '#666',
    marginBottom: 6,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ComplaintsScreen;
