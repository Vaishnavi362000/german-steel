import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import axios from 'axios';
import moment from 'moment';
import { useNavigation, useRoute } from '@react-navigation/native';

const VISITS_PER_PAGE = 2;

export default function VisitsTimeline({ storeId, authToken, navigation, currentVisitId }) {
  const [visits, setVisits] = useState([]);
  const [displayedVisits, setDisplayedVisits] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchVisits();
  }, [storeId]);

  useEffect(() => {
    const startIndex = (page - 1) * VISITS_PER_PAGE;
    const endIndex = startIndex + VISITS_PER_PAGE;
    const visitsToDisplay = visits.slice(startIndex, endIndex);
    setDisplayedVisits((prevVisits) => [...prevVisits, ...visitsToDisplay]);
    setHasMore(endIndex < visits.length);
  }, [visits, page]);

  const fetchVisits = async () => {
    try {
      const response = await axios.get(
        `https://api.gajkesaristeels.in/visit/getByStore?id=${storeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const allVisits = response.data;
      const filteredVisits = allVisits.filter((visit) => visit.id !== currentVisitId);
      const sortedVisits = filteredVisits.sort(
        (a, b) => new Date(b.visit_date) - new Date(a.visit_date)
      );
      setVisits(sortedVisits);
    } catch (error) {
      console.error('Error fetching visits:', error);
    }
  };

  const handleLoadMore = () => {
    if (hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  };



  const getVisitStatus = (visit) => {
    let visitStatus = 'Assigned';
    if (visit.checkinLatitude && visit.checkinLongitude && visit.checkinDate && visit.checkinTime) {
      visitStatus = 'Ongoing';
    }
    if (visit.checkoutLatitude && visit.checkoutLongitude && visit.checkoutDate && visit.checkoutTime) {
      visitStatus = 'Completed';
    }
    return visitStatus;
  };


  const renderVisitItem = ({ item: visit, index }) => (
    <TouchableOpacity
      style={styles.timelineItem}
      onPress={() => {
        navigation.navigate('VisitScreen', { visitId: visit.id, authToken });
      }}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {visit.employeeName
            .split(' ')
            .map((name) => name[0])
            .join('')}
        </Text>
      </View>
      {index !== displayedVisits.length - 1 && <View style={styles.timelineLine} />}
      <View style={styles.timelineContent}>
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineDate}>
          {moment(visit.visit_date).format('DD MMM YYYY')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('VisitScreen', { visitId: visit.id, authToken })}>
          <Text style={styles.visitId}>Visit ID: {visit.id}</Text>
        </TouchableOpacity>
      </View>
        <Text style={styles.timelineTitle}>{visit.purpose}</Text>
        <Text style={styles.timelineDescription}>{visit.outcome}</Text>
        <View style={styles.intentStatusContainer}>
          {/* <View style={[styles.intentContainer, { backgroundColor: getIntentColor(visit.intent) }]}>
            <Text style={styles.intentText}>Intent: {visit.intent}</Text>
          </View> */}
          <View style={[styles.statusContainer, { backgroundColor: getStatusColor(getVisitStatus(visit)) }]}>
            <Text style={styles.statusText}>{getVisitStatus(visit)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      
      <FlatList
        data={displayedVisits}
        renderItem={renderVisitItem}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
              <Text style={styles.loadMoreButtonText}>Load More</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}


const getIntentColor = (intent) => {
  // Define your color mapping based on the intent level
  // Example:
  if (intent >= 8) {
    return '#4CAF50'; // Green for high intent
  } else if (intent >= 5) {
    return '#FFC107'; // Yellow for medium intent
  } else {
    return '#F44336'; // Red for low intent
  }
};

const getStatusColor = (status) => {
  // Define your color mapping based on the visit status
  // Example:
  if (status === 'Completed') {
    return '#4CAF50'; // Green for completed
  } else if (status === 'Ongoing') {
    return '#FFC107'; // Yellow for ongoing
  } else {
    return '#2196F3'; // Blue for assigned
  }
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelinePoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
    marginRight: 8,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    bottom: -16,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  timelineContent: {
    flex: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  visitId: {
    fontSize: 14,
    color: '#4F46E5',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  loadMoreButton: {
    alignItems: 'center',
    marginVertical: 16,
  },
  loadMoreButtonText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  intentStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  intentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  intentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});