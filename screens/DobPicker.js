import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DobPicker = ({ isVisible, onClose, onSelect, maxDate = new Date() }) => {
  const currentYear = maxDate.getFullYear();
  const minYear = currentYear - 100; // Allow up to 100 years back
  
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [step, setStep] = useState('year'); // 'year', 'month', 'day'

  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i);
  const months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days = selectedYear && selectedMonth !== null
    ? Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1)
    : [];

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setStep('month');
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setStep('day');
  };

  const handleDaySelect = (day) => {
    setSelectedDay(day);
    const date = new Date(selectedYear, selectedMonth, day);
    onSelect(date);
    handleClose();
  };

  const handleClose = () => {
    setStep('year');
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    onClose();
  };

  const handleBack = () => {
    if (step === 'month') {
      setStep('year');
      setSelectedYear(null);
    } else if (step === 'day') {
      setStep('month');
      setSelectedMonth(null);
    }
  };

  const getTitle = () => {
    if (step === 'year') return 'Select Year';
    if (step === 'month') return `Select Month (${selectedYear})`;
    if (step === 'day') return `Select Day (${months[selectedMonth].label} ${selectedYear})`;
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            {step !== 'year' && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#007bff" />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {step === 'year' && (
              <View style={styles.gridContainer}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={styles.yearItem}
                    onPress={() => handleYearSelect(year)}
                  >
                    <Text style={styles.yearText}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 'month' && (
              <View style={styles.listContainer}>
                {months.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={styles.monthItem}
                    onPress={() => handleMonthSelect(month.value)}
                  >
                    <Text style={styles.monthText}>{month.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 'day' && (
              <View style={styles.gridContainer}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={styles.dayItem}
                    onPress={() => handleDaySelect(day)}
                  >
                    <Text style={styles.dayText}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
    width: 32,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listContainer: {
    gap: 8,
  },
  yearItem: {
    width: '23%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  yearText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  monthItem: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  monthText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    textAlign: 'center',
  },
  dayItem: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
});

export default DobPicker;

