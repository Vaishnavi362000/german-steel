import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Greeting = ({ firstName, message, onProfilePress, onNotificationPress, connectivityComponent }) => {
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '';

  return (
    <View style={styles.greetingContainer}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.rightSection}>
          <View style={styles.connectivityContainer}>
            {connectivityComponent}
          </View>
          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onProfilePress} style={styles.iconButton}>
              <Ionicons name="person-outline" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.greetingTextContainer}>
        <Text style={styles.greetingText}>{message}</Text>
      </View>
    </View>
  );
};

const Metrics = ({ totalVisits, totalVisitsToday, totalVisitsThisWeek }) => {
    return (
      <View style={styles.metricsContainer}>
        <View style={[styles.card, styles.totalVisits]}>
          <View style={styles.cardContent}>
            <Ionicons name="search-outline" size={24} color="#4F46E5" style={styles.icon} />
            <Text style={styles.cardTitle}>Total Visits</Text>
            <Text style={styles.cardValue}>{totalVisits}</Text>
          </View>
         </View>
        <View style={[styles.card, styles.visitsToday]}>
          <View style={styles.cardContent}>
            <Ionicons name="today-outline" size={24} color="#10B981" style={styles.icon} />
            <Text style={styles.cardTitle}> Today</Text>
            <Text style={styles.cardValue}>{totalVisitsToday}</Text>
          </View>
         </View>
        <View style={[styles.card, styles.visitsWeek]}>
          <View style={styles.cardContent}>
            <Ionicons name="calendar-outline" size={24} color="#F59E0B" style={styles.icon} />
            <Text style={styles.cardTitle}>This Week</Text>
            <Text style={styles.cardValue}>{totalVisitsThisWeek}</Text>
          </View>
         </View>
      </View>
    );
  };
  

const styles = {
  greetingContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  connectivityContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 15,
    padding: 5,
  },
  greetingTextContainer: {
    marginTop: 16,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    width: '30%',
    borderRadius: 15,
    padding: 15,
    alignItems: 'flex-start',
    overflow: 'hidden',
    position: 'relative',
  },
  cardContent: {
    zIndex: 1,
  },
  totalVisits: {
    backgroundColor: '#EEF2FF',
  },
  visitsToday: {
    backgroundColor: '#D1FAE5',
  },
  visitsWeek: {
    backgroundColor: '#FEF3C7',
  },
  icon: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  shape: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.2,
  },
  shapeTotal: {
    backgroundColor: '#4F46E5',
  },
  shapeToday: {
    backgroundColor: '#10B981',
  },
  shapeWeek: {
    backgroundColor: '#F59E0B',
  },
};

export { Greeting, Metrics };