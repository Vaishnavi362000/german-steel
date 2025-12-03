import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, add, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

const HistoricalDatePicker = ({ isVisible, onClose, onSelect, initialDate }) => {
  const [currentMonth, setCurrentMonth] = useState(initialDate || new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate || null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const startDay = startOfWeek(startOfMonth(currentMonth));
  const endDay = endOfWeek(endOfMonth(currentMonth));
  const days = eachDayOfInterval({ start: startDay, end: endDay });

  const onDayPress = (day) => {
    setSelectedDate(day);
    onSelect(day);
    onClose();
  };

  const handleMonthChange = (direction) => {
    Animated.timing(animatedValue, {
      toValue: direction === 'next' ? 1 : -1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentMonth((prevMonth) => add(prevMonth, { months: direction === 'next' ? 1 : -1 }));
      animatedValue.setValue(0);
    });
  };

  const animatedStyle = {
    transform: [
      {
        translateX: animatedValue.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [300, 0, -300],
        }),
      },
    ],
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.navigationContainer}>
            <TouchableOpacity onPress={() => handleMonthChange('prev')}>
              <Text style={styles.navigationArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={() => handleMonthChange('next')}>
              <Text style={styles.navigationArrow}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dayNamesContainer}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayName) => (
              <Text key={dayName} style={styles.dayName}>{dayName}</Text>
            ))}
          </View>
          <Animated.View style={[styles.datesContainer, animatedStyle]}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  isSameDay(day, selectedDate) && styles.selectedDate,
                  isSameDay(day, new Date()) && styles.todayDate,
                ]}
                onPress={() => onDayPress(day)}
              >
                <Text style={[
                  styles.dateText,
                  format(day, 'MM') !== format(currentMonth, 'MM') && styles.anotherMonth,
                  isSameDay(day, selectedDate) && styles.selectedDateText,
                  isSameDay(day, new Date()) && styles.todayDateText,
                ]}>
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navigationArrow: {
    fontSize: 24,
    color: '#007bff',
    paddingHorizontal: 10,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayNamesContainer: {
    flexDirection: 'row',
    paddingBottom: 10,
  },
  dayName: {
    width: 28,
    textAlign: 'center',
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dateItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  selectedDate: {
    backgroundColor: '#007bff',
    borderRadius: 20,
  },
  selectedDateText: {
    color: 'white',
  },
  todayDate: {
    backgroundColor: 'lightgrey',
    borderRadius: 20,
  },
  todayDateText: {
    color: 'black',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 16,
  },
  anotherMonth: {
    color: 'grey',
  },
  closeButton: {
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#007bff',
  },
});

export default HistoricalDatePicker;