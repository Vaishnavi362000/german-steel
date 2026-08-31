import { API_BASE_URL } from './config/api';
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Dimensions
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BottomSheetn from './BottomSheetn';

const { width } = Dimensions.get('window');

const RequirementsScreen = ({ route }) => {
  const { authToken, showSuccessMessage, successMessage } = route.params;
  const [requirements, setRequirements] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MMMM'));
  const [selectedYear, setSelectedYear] = useState(moment().format('YYYY'));
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  const navigation = useNavigation();

  const fetchRequirements = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const startDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').startOf('month').format('YYYY-MM-DD');
      const endDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').endOf('month').format('YYYY-MM-DD');

      const response = await axios.get(`${API_BASE_URL}/task/getByAssignedToAndDate?id=${employeeId}&start=${startDate}&end=${endDate}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Log API response to debug description issue
      console.log('API Response:', JSON.stringify(response.data, null, 2));

      const filteredRequirements = response.data
        .filter(task => task.taskType === 'requirement')
        .sort((a, b) => moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf());
      
      // Group requirements by date
      const groupedByDate = filteredRequirements.reduce((acc, requirement) => {
        const dateKey = moment(requirement.updatedAt).format('YYYY-MM-DD');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(requirement);
        return acc;
      }, {});

      // Convert to array and sort dates (latest first)
      const sortedDates = Object.keys(groupedByDate).sort((a, b) => moment(b).valueOf() - moment(a).valueOf());
      
      // Flatten grouped requirements maintaining date grouping
      const groupedRequirements = sortedDates.flatMap(dateKey => {
        // Sort requirements within each date by time (latest first)
        const dateRequirements = groupedByDate[dateKey].sort((a, b) => 
          moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf()
        );
        return dateRequirements.map(req => ({ ...req, dateKey }));
      });

      setRequirements(groupedRequirements);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      Alert.alert('Error', 'Failed to fetch requirements. Please try again.');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchRequirements();
      if (showSuccessMessage) {
        navigation.setParams({ showSuccessMessage: false, successMessage: '' });
      }
    }, [selectedMonth, selectedYear, showSuccessMessage])
  );

  const handleAddRequirement = () => {
    const today = moment();
    const isCurrentMonth = selectedMonth === today.format('MMMM');
    const isCurrentYear = selectedYear === today.format('YYYY');

    // Requirements can only be added for the current date (today),
    // so we restrict adding when user is viewing any other month/year.
    if (!isCurrentMonth || !isCurrentYear) {
      Alert.alert(
        'Not allowed',
        'You can add requirements only for today. Please switch to the current month and year.'
      );
      return;
    }

    navigation.navigate('AddRequirementScreen', { authToken });
  };

  const renderRequirement = (requirement) => {
    const attachmentCount = Array.isArray(requirement.attachmentResponse)
      ? requirement.attachmentResponse.length
      : 0;
    const description = requirement.taskDescription || requirement.taskDesciption;

    return (
      <TouchableOpacity
        key={requirement.id}
        style={styles.requirementCard}
        onPress={() => navigation.navigate('TaskDetails', { task: requirement, authToken })}
        activeOpacity={0.86}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <View style={styles.cardIcon}>
              <Ionicons name="clipboard-outline" size={22} color="#6C63FF" />
            </View>
            <Text style={styles.storeName} numberOfLines={1}>
              {requirement.storeName || 'Customer / Store'}
            </Text>
          </View>
          {!!requirement.status && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText} numberOfLines={1}>
                {String(requirement.status).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardBodyRow}>
          <View style={styles.cardMainColumn}>
            <Text style={styles.taskType}>REQUIREMENT</Text>
            <Text style={styles.requirementTitle} numberOfLines={1}>
              {requirement.taskTitle || 'Untitled'}
            </Text>
            {!!description && (
              <Text style={styles.requirementDescription} numberOfLines={2}>{description}</Text>
            )}
            <View style={styles.dashedDivider} />
            <Text style={styles.fieldLabel}>CUSTOMER / STORE</Text>
            <Text style={styles.customerName} numberOfLines={1}>
              {requirement.storeName || 'N/A'}
            </Text>
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
          <Text style={styles.headerTitle}>Requirements</Text>
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

      <TouchableOpacity style={styles.addButton} onPress={handleAddRequirement}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Requirement</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer}>
        {(() => {
          let currentDateKey = null;
          return requirements.map((requirement) => {
            const showDateHeader = requirement.dateKey !== currentDateKey;
            if (showDateHeader) {
              currentDateKey = requirement.dateKey;
            }
            const dateMoment = moment(requirement.dateKey);
            const isToday = dateMoment.isSame(moment(), 'day');
            const dateText = isToday ? 'Today' : dateMoment.format('MMMM D, YYYY');
            
            return (
              <View key={requirement.id}>
                {showDateHeader && (
                  <View style={styles.dateSection}>
                    <Text style={styles.dateText}>{dateText}</Text>
                  </View>
                )}
                {renderRequirement(requirement)}
              </View>
            );
          });
        })()}
        {requirements.length === 0 && (
          <Text style={styles.emptyListText}>No requirements available for this period.</Text>
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
    lineHeight: 23,
    fontWeight: '700',
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
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
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
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
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
  requirementCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#fff',
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
  dueDate: {
    color: '#666',
    fontSize: 12,
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
  requirementTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  requirementDescription: {
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
});

export default RequirementsScreen;
