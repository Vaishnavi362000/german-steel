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

      const response = await axios.get(`https://api.gajkesaristeels.in/task/getByAssignedToAndDate?id=${employeeId}&start=${startDate}&end=${endDate}`, {
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

  const renderRequirement = (requirement) => (
    <TouchableOpacity
      key={requirement.id}
      style={styles.requirementCard}
      onPress={() => {
        navigation.navigate('RequirementDetailsScreen', { requirement });
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.storeName}>{requirement.storeName}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{requirement.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.taskType}>{requirement.taskType}</Text>
      <Text style={styles.requirementText}>{requirement.taskTitle}</Text>
      {(requirement.taskDesciption || requirement.taskDesciption) && (
        <Text style={styles.descriptionText}>{requirement.taskDesciption || requirement.taskDesciption}</Text>
      )}
      <Text style={styles.dueDate}>Due: {moment(requirement.dueDate).format('M/D/YYYY')}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  requirementCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
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
  requirementText: {
    fontSize: 14,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  dueDate: {
    color: '#666',
    fontSize: 12,
  },
});

export default RequirementsScreen;