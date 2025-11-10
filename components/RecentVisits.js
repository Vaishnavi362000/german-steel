import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';

const RecentVisits = ({ visits, onVisitPress }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <View>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <Text style={styles.dropdownButtonText}>
          {isCollapsed ? 'Show Recent Visits' : 'Hide Recent Visits'}
        </Text>
        <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={20} color="#6B7280" />
      </TouchableOpacity>
      <Collapsible collapsed={isCollapsed}>
        <View style={styles.container}>
          <Text style={styles.title}>Recent Visits</Text>
          {visits.slice(0, 10).map((visit) => (
            <TouchableOpacity
              key={visit.id}
              style={styles.item}
              onPress={() => onVisitPress(visit)}
            >
              <Text style={styles.storeName}>{visit.storeName}</Text>
              <Text style={styles.date}>{visit.visit_date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Collapsible>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeName: {
    fontSize: 16,
    color: '#1F2937',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
});

export default RecentVisits;
