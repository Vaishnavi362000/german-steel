import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CustomDatePicker = ({ selectedDate, onDateChange }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [nextWeek, setNextWeek] = useState(new Date());
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (direction !== 0) {
      Animated.timing(animatedValue, {
        toValue: direction,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentWeek(nextWeek);
        animatedValue.setValue(0);
        setDirection(0);
      });
    }
  }, [nextWeek, direction]);

  const renderDaysInWeek = (week) => {
    const startDate = startOfWeek(week, { weekStartsOn: 1 });
    const endDate = endOfWeek(week, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: startDate, end: endDate });

    return daysInWeek.map((day, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayButton,
          isSameDay(day, selectedDate) && styles.selectedDayButton,
        ]}
        onPress={() => onDateChange(day)}
      >
        <Text style={[styles.dayNameText, isSameDay(day, selectedDate) && styles.selectedDayText]}>
          {format(day, 'EEE')}
        </Text>
        <Text style={[styles.dayText, isSameDay(day, selectedDate) && styles.selectedDayText]}>
          {format(day, 'd')}
        </Text>
      </TouchableOpacity>
    ));
  };

  const goToPreviousWeek = () => {
    setNextWeek(new Date(currentWeek.setDate(currentWeek.getDate() - 7)));
    setDirection(1);
  };

  const goToNextWeek = () => {
    setNextWeek(new Date(currentWeek.setDate(currentWeek.getDate() + 7)));
    setDirection(-1);
  };

  const translateX = animatedValue.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-width, 0, width],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.arrowButton} onPress={goToPreviousWeek}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{format(currentWeek, 'MMMM yyyy')}</Text>
        <TouchableOpacity style={styles.arrowButton} onPress={goToNextWeek}>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.daysWrapper}>
        <Animated.View
          style={[
            styles.daysContainer,
            { transform: [{ translateX }] },
          ]}
        >
          <View style={styles.weekContainer}>{renderDaysInWeek(currentWeek)}</View>
          <View style={styles.weekContainer}>{renderDaysInWeek(nextWeek)}</View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  arrowButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysWrapper: {
    overflow: 'hidden',
    width: width - 40, // Adjust for padding
  },
  daysContainer: {
    flexDirection: 'row',
    width: (width - 40) * 2, // Adjust for padding
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width - 40, // Adjust for padding
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 60,
    borderRadius: 10,
  },
  selectedDayButton: {
    backgroundColor: '#FFFFFF',
  },
  dayNameText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  dayText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#4F46E5',
  },
});

export default CustomDatePicker;
