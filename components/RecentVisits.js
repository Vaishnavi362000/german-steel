import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';

const getVisitName = (visit = {}) =>
  visit.storeName || visit.targetName || visit.customerName || visit.dealerName || 'Visit';

const getVisitType = (visit = {}) =>
  visit.clientType || visit.targetType || visit.visitType || visit.customerType || 'Visit';

const getExclusiveLabel = (visit = {}) => {
  if (visit.nonExclusive === true || visit.isNonExclusive === true) return 'Non Exclusive';
  if (visit.nonExclusive === false || visit.isNonExclusive === false) return 'Exclusive';

  const dealerSubType = String(visit.dealerSubType || '').trim().toUpperCase();
  if (dealerSubType === 'NON_EXCLUSIVE') return 'Non Exclusive';
  if (dealerSubType === 'EXCLUSIVE') return 'Exclusive';

  const dealerType = String(visit.dealerType || '').trim().toUpperCase();
  if (dealerType === 'NON_ICON') return 'Non Exclusive';

  const rawValue = [
    visit.exclusive,
    visit.isExclusive,
    visit.exclusivity,
    visit.exclusiveStatus,
    visit.isExclusiveCustomer,
    visit.isExclusiveDealer,
    visit.exclusiveDealer,
    visit.dealerExclusive,
    visit.exclusiveType,
    visit.exclusiveOrNonExclusive,
    visit.storeExclusivity,
  ].find((value) => value !== undefined && value !== null && String(value).trim() !== '');

  if (typeof rawValue === 'boolean') {
    return rawValue ? 'Exclusive' : 'Non Exclusive';
  }

  const normalized = String(rawValue || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('non')) return 'Non Exclusive';
  if (normalized.includes('exclusive')) return 'Exclusive';
  if (['true', 'yes', 'y'].includes(normalized)) return 'Exclusive';
  if (['false', 'no', 'n'].includes(normalized)) return 'Non Exclusive';
  return '';
};

const formatVisitDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

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
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="time-outline" size={20} color="#4F46E5" />
            </View>
            <Text style={styles.title}>Recent Visits</Text>
          </View>
          {visits.slice(0, 10).map((visit) => {
            const exclusiveLabel = getExclusiveLabel(visit);
            const visitDate = formatVisitDate(visit.visit_date || visit.visitDate || visit.checkoutDate);

            return (
              <TouchableOpacity
                key={visit.id}
                style={styles.item}
                onPress={() => onVisitPress(visit.id)}
                activeOpacity={0.82}
              >
                <View style={styles.itemIcon}>
                  <Ionicons name="storefront-outline" size={22} color="#4F46E5" />
                </View>
                <View style={styles.visitInfo}>
                  <Text style={styles.storeName} numberOfLines={1} ellipsizeMode="tail">
                    {getVisitName(visit)}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.typeBadge} numberOfLines={1} ellipsizeMode="tail">
                        {getVisitType(visit)}
                      </Text>
                      {!!exclusiveLabel && (
                        <Text
                          style={[
                            styles.exclusiveBadge,
                            exclusiveLabel === 'Non Exclusive' && styles.nonExclusiveBadge,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {exclusiveLabel}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.rightMeta}>
                  {!!visitDate && (
                    <View style={styles.dateWrap}>
                      <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                      <Text style={styles.date} numberOfLines={1} ellipsizeMode="tail">
                        {visitDate}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#4F46E5" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Collapsible>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    minHeight: 70,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  visitInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  storeName: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '700',
    marginBottom: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 88,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
    flexShrink: 1,
  },
  exclusiveBadge: {
    backgroundColor: '#E8F5EF',
    borderRadius: 6,
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 92,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 1,
  },
  nonExclusiveBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
    marginRight: 4,
  },
  date: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 3,
    flexShrink: 1,
  },
  rightMeta: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  chevronWrap: {
    width: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
