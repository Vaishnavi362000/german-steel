import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
          <Text style={styles.cardTitle}>Visits Today</Text>
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
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    width: '30%',
    height: 120,
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  shape: {
 
  },
  shapeTotal: {
  },
  shapeToday: {
  },
  shapeWeek: {
  },
};

export default Metrics;