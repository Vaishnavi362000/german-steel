import axios from 'axios';
import { format, isToday, isYesterday } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const VisitsTimeline = ({ navigation, route, authToken, storeId }) => {
  const customerId = storeId || route?.params?.customerId;
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (customerId) {
      fetchVisits();
    }
  }, [customerId]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      
      // Calculate current month date range
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().split('T')[0]; // e.g., "2025-10-01"
      const endOfMonth = today.toISOString().split('T')[0]; // e.g., "2025-10-08" (today)
      
      console.log('Fetching visits for store:', customerId, 'from', startOfMonth, 'to', endOfMonth);
      
      const response = await axios.get(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/visit/getByDateRangeAndStore?id=${customerId}&start=${startOfMonth}&end=${endOfMonth}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            // Bypass ngrok browser warning page
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      
      // Check if response data is valid array
      const visitsData = Array.isArray(response.data) ? response.data : [];
      
      // Sort by visit date, newest first
      const sortedVisits = visitsData.sort((a, b) => {
        const dateA = new Date(a.visitDate || a.visit_date);
        const dateB = new Date(b.visitDate || b.visit_date);
        return dateB - dateA;
      });
      
      console.log(`Loaded ${sortedVisits.length} visits for this month`);
      setVisits(sortedVisits);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.timeline}>
        {visits.length === 0 ? (
          <Text style={styles.emptyText}>No visits this month</Text>
        ) : (
          visits.map((visit, index) => (
            <TouchableOpacity 
              key={visit.id || visit.visitId || index} 
              style={styles.timelineItem}
              onPress={() => {
                if (!navigation) {
                  return;
                }
                const targetVisitId = visit?.id ?? visit?.visitId;
                if (!targetVisitId) {
                  console.warn('⚠️ [VISITS TIMELINE] Unable to open visit without id:', visit);
                  return;
                }
                navigation.navigate('VisitScreen', { visitId: targetVisitId, authToken });
              }}
            >
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.visitDate}>
                  {formatDate(visit.visitDate || visit.visit_date || new Date())}
                </Text>
                <Text style={styles.visitPurpose}>{visit.purpose || 'No purpose specified'}</Text>
                {visit.checkoutDate && (
                  <Text style={styles.visitStatus}>✓ Completed</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeline: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  visitPurpose: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  visitStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#9CA3AF',
  },
});

export default VisitsTimeline;

