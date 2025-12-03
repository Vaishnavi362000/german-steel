import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, add, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380; // Galaxy Fold and similar
const isMediumScreen = width >= 380 && width < 480; // Regular phones
const isLargeScreen = width >= 480; // Larger phones/tablets

// Calculate sizes based on screen width
const getFontSize = () => {
  if (isSmallScreen) return {
    dayName: 9,
    dateText: 9,
    monthLabel: 14,
    navigationArrow: 16
  };
  if (isMediumScreen) return {
    dayName: 10.8,
    dateText: 10.8,
    monthLabel: 16,
    navigationArrow: 20
  };
  return {
    dayName: 12.6,
    dateText: 12.6,
    monthLabel: 18,
    navigationArrow: 24
  };
};

const fontSizes = getFontSize();

const DatePicker = ({ isVisible, onClose, onSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const startDay = startOfWeek(startOfMonth(currentMonth));
  const endDay = endOfWeek(endOfMonth(currentMonth));
  const days = eachDayOfInterval({ start: startDay, end: endDay });

  const onDayPress = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight for accurate comparison
  
    if (day >= today) {
      setSelectedDate(day);
      onSelect(day);
      onClose();
    }
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
        <View style={[styles.modalView, isSmallScreen && styles.modalViewSmall]}>
          <View style={styles.navigationContainer}>
            <TouchableOpacity onPress={() => handleMonthChange('prev')}>
              <Text style={[styles.navigationArrow, isSmallScreen && styles.navigationArrowSmall]}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[styles.monthLabel, isSmallScreen && styles.monthLabelSmall]}>
              {format(currentMonth, isSmallScreen ? 'MMM yyyy' : 'MMMM yyyy')}
            </Text>
            <TouchableOpacity onPress={() => handleMonthChange('next')}>
              <Text style={[styles.navigationArrow, isSmallScreen && styles.navigationArrowSmall]}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dayNamesContainer}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayName) => (
              <Text key={dayName} style={[styles.dayName, isSmallScreen && styles.dayNameSmall]}>{dayName}</Text>
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
                  day < new Date() && styles.disabledDate,
                ]}
                onPress={() => day >= new Date() && onDayPress(day)}
                disabled={day < new Date()}
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
    margin: isSmallScreen ? 10 : 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: isSmallScreen ? 15 : (isMediumScreen ? 25 : 35),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: isSmallScreen ? '95%' : '90%',
  },
  modalViewSmall: {
    padding: 15, // Reduced padding for small screens
    margin: 10,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isSmallScreen ? 5 : 10,
    width: '100%',
    paddingHorizontal: isSmallScreen ? 5 : 10,
  },
  navigationArrow: {
    fontSize: fontSizes.navigationArrow,
    color: '#007bff',
    paddingHorizontal: isSmallScreen ? 5 : 10,
  },
  navigationArrowSmall: {
    fontSize: 20,
    paddingHorizontal: 5,
  },
  monthLabel: {
    fontSize: fontSizes.monthLabel,
    fontWeight: 'bold',
  },
  monthLabelSmall: {
    fontSize: 16,
  },
  dayNamesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: isSmallScreen ? 4.5 : 9,
    paddingHorizontal: isSmallScreen ? 1.8 : 4.5,
  },
  dayName: {
    width: width / (isSmallScreen ? 8 : 9),
    textAlign: 'center',
    fontSize: fontSizes.dayName,
  },
  dayNameSmall: {
    fontSize: 12,
    width: width / 10, // Even smaller width for small screens
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: isSmallScreen ? 1.8 : 4.5,
  },
  dateItem: {
    width: width / (isSmallScreen ? 8 : 9),
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: isSmallScreen ? 0.45 : 0.9,
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
    fontSize: fontSizes.dateText,
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
  disabledDate: {
    opacity: 0.5,
  },
});

export default DatePicker;