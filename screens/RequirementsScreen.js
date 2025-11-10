import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import moment from 'moment';
import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
    Alert, Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import BottomSheetn from './BottomSheetn';

const { width } = Dimensions.get('window');

const RequirementsScreen = ({ route }) => {
  const { authToken, showSuccessMessage, successMessage } = route.params;
  const [requirements, setRequirements] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MMMM'));
  const [selectedYear, setSelectedYear] = useState(moment().format('YYYY'));
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  const navigation = useNavigation();
  const today = new Date();
  const isCurrentSelection = selectedMonth === today.toLocaleString('default', { month: 'long' }) && selectedYear === String(today.getFullYear());

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

  const fetchRequirements = async () => {
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const startDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').startOf('month').format('YYYY-MM-DD');
      const endDate = moment(`${selectedYear}-${selectedMonth}`, 'YYYY-MMMM').endOf('month').format('YYYY-MM-DD');

      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/task/getByAssignedToAndDate?id=${employeeId}&start=${startDate}&end=${endDate}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log('🔵 [REQUIREMENTS] Fetching requirements for date range:', startDate, 'to', endDate);

      const filteredRequirements = response.data
        .filter(task => task.taskType === 'requirement')
        .sort((a, b) => moment(b.updatedAt).valueOf() - moment(a.updatedAt).valueOf());

      // Group requirements by date
      const groupedRequirements = {};
      filteredRequirements.forEach(requirement => {
        const dateKey = formatDate(requirement.updatedAt);
        if (!groupedRequirements[dateKey]) {
          groupedRequirements[dateKey] = [];
        }
        groupedRequirements[dateKey].push(requirement);
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
      <Text style={styles.requirementTitle}>{requirement.taskTitle}</Text>
      {requirement.taskDesciption && (
        <Text style={styles.requirementDescription} numberOfLines={2}>
          {requirement.taskDesciption}
        </Text>
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

      <ScrollView style={styles.scrollContainer}>
        {Object.keys(requirements).length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 24 }}>
            No requirements available for this period.
          </Text>
        ) : (
          Object.entries(requirements).map(([dateKey, dateRequirements]) => (
            <View key={dateKey} style={styles.dateSection}>
              <Text style={styles.dateText}>{dateKey}</Text>
              {dateRequirements.map((requirement) => renderRequirement(requirement))}
            </View>
          ))
        )}
      </ScrollView>

      {(() => {
        if (!isCurrentSelection) {
          return (
            null
          );
        }
        return (
          <TouchableOpacity style={styles.addButton} onPress={handleAddRequirement}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add Requirement</Text>
          </TouchableOpacity>
        );
      })()}

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
  requirementCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
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
  requirementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  requirementDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  dueDate: {
    color: '#666',
    fontSize: 12,
  },
});

export default RequirementsScreen;