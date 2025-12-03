import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

const DateRangeSelector = ({ dateRange, onDateRangeChange }) => {
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  const handleDayPress = (day) => {
    if (!tempDateRange.start || (tempDateRange.start && tempDateRange.end)) {
      setTempDateRange({ start: day.dateString, end: null });
    } else {
      setTempDateRange({ ...tempDateRange, end: day.dateString });
    }
  };

  const applyDateRange = () => {
    onDateRangeChange(tempDateRange);
    setCalendarVisible(false);
  };

  const formatDateRange = () => {
    if (dateRange.start === dateRange.end) {
      return new Date(dateRange.start).toLocaleDateString();
    }
    return `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dateRangeButton}
        onPress={() => setCalendarVisible(true)}
      >
        <Ionicons name="calendar-outline" size={24} color="#6C63FF" />
        <Text style={styles.dateRangeText}>{formatDateRange()}</Text>
      </TouchableOpacity>

      <Modal
        visible={isCalendarVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={{
                [tempDateRange.start]: { startingDay: true, color: '#6C63FF' },
                [tempDateRange.end]: { endingDay: true, color: '#6C63FF' },
              }}
              markingType={'period'}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setCalendarVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.applyButton]}
                onPress={applyDateRange}
              >
                <Text style={styles.buttonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateRangeText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
  },
  applyButton: {
    backgroundColor: '#6C63FF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default DateRangeSelector;