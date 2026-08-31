import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import moment from 'moment';
import { fetchStoreVisitsPage } from './utils/optimizedVisitApi';

const VISITS_PER_PAGE = 10;

export default function VisitsTimeline({ storeId, authToken, navigation, currentVisitId, embedded = false }) {
  const [visits, setVisits] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadVisits = useCallback(async (pageToLoad = 0, append = false) => {
    if (!storeId || !authToken) return;

    append ? setIsLoadingMore(true) : setIsLoading(true);
    try {
      const result = await fetchStoreVisitsPage({
        storeId,
        page: pageToLoad,
        size: VISITS_PER_PAGE,
        sort: 'visitDate,desc',
        authToken,
      });
      const visitPage = result.page || {};
      const receivedVisits = Array.isArray(visitPage.content) ? visitPage.content : [];
      const filteredVisits = receivedVisits.filter((visit) => visit?.id !== currentVisitId);

      setVisits((previousVisits) => {
        const nextVisits = append ? [...previousVisits, ...filteredVisits] : filteredVisits;
        return nextVisits.filter((visit, index, all) => (
          all.findIndex((candidate) => candidate?.id === visit?.id) === index
        ));
      });
      setPage(pageToLoad);

      const lastPage = typeof visitPage.last === 'boolean'
        ? visitPage.last
        : pageToLoad >= Math.max(Number(visitPage.totalPages || 1) - 1, 0);
      setHasMore(!lastPage);
    } catch (error) {
      console.error('Error fetching store visit history:', error);
      if (!append) setVisits([]);
      setHasMore(false);
    } finally {
      append ? setIsLoadingMore(false) : setIsLoading(false);
    }
  }, [authToken, currentVisitId, storeId]);

  useEffect(() => {
    loadVisits(0, false);
  }, [loadVisits]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) loadVisits(page + 1, true);
  };

  const getVisitStatus = (visit) => {
    if (visit.checkoutLatitude && visit.checkoutLongitude && visit.checkoutDate && visit.checkoutTime) return 'Completed';
    if (visit.checkinLatitude && visit.checkinLongitude && visit.checkinDate && visit.checkinTime) return 'Ongoing';
    return 'Assigned';
  };

  const getVisitKey = (visit, index) => String(visit?.id || `visit-${index}`);

  const renderVisitItem = ({ item: visit, index }) => {
    const initials = String(visit?.employeeName || 'Employee')
      .split(' ')
      .filter(Boolean)
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity
        style={styles.timelineItem}
        onPress={() => navigation.navigate('VisitScreen', { visitId: visit.id, authToken })}
      >
        <View style={styles.avatarContainer}><Text style={styles.avatarText}>{initials}</Text></View>
        {index !== visits.length - 1 && <View style={styles.timelineLine} />}
        <View style={styles.timelineContent}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineDate}>{moment(visit.visit_date).format('DD MMM YYYY')}</Text>
            <Text style={styles.visitId}>Visit ID: {visit.id}</Text>
          </View>
          <Text style={styles.timelineTitle}>{visit.purpose || 'Visit'}</Text>
          {!!visit.outcome && <Text style={styles.timelineDescription}>{visit.outcome}</Text>}
          <View style={[styles.statusContainer, { backgroundColor: getStatusColor(getVisitStatus(visit)) }]}>
            <Text style={styles.statusText}>{getVisitStatus(visit)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const loadMoreControl = hasMore ? (
    <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore} disabled={isLoadingMore}>
      {isLoadingMore
        ? <ActivityIndicator size="small" color="#4F46E5" />
        : <Text style={styles.loadMoreButtonText}>Load More</Text>}
    </TouchableOpacity>
  ) : null;

  if (isLoading) {
    return <View style={styles.loadingState}><ActivityIndicator size="small" color="#4F46E5" /></View>;
  }

  if (embedded) {
    return (
      <View style={styles.embeddedContainer}>
        {visits.map((visit, index) => renderVisitItem({ item: visit, index }))}
        {!visits.length && <Text style={styles.emptyText}>No visits yet.</Text>}
        {loadMoreControl}
      </View>
    );
  }

  return (
    <FlatList
      data={visits}
      renderItem={renderVisitItem}
      keyExtractor={getVisitKey}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.emptyText}>No visits yet.</Text>}
      ListFooterComponent={loadMoreControl}
    />
  );
}

const getStatusColor = (status) => {
  if (status === 'Completed') return '#4CAF50';
  if (status === 'Ongoing') return '#FFC107';
  return '#2196F3';
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FFFFFF' },
  embeddedContainer: { flex: 0, padding: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  timelineLine: { position: 'absolute', left: 15, top: 32, bottom: -16, width: 2, backgroundColor: '#E5E7EB' },
  timelineContent: { flex: 1 },
  avatarContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timelineDate: { fontSize: 14, color: '#6B7280' },
  visitId: { fontSize: 14, color: '#4F46E5' },
  timelineTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  timelineDescription: { fontSize: 14, color: '#4B5563' },
  loadMoreButton: { alignItems: 'center', marginVertical: 16, minHeight: 28, justifyContent: 'center' },
  loadMoreButtonText: { fontSize: 16, color: '#4F46E5', fontWeight: '700' },
  statusContainer: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  loadingState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#6B7280', textAlign: 'center', paddingVertical: 24 },
});
